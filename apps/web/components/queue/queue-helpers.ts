import type { Stylist, Ticket } from "@/lib/api";

export interface StylistQueueMetric {
  waitingCount: number;
  isInChair: boolean;
  inChairCustomer?: string;
  estWaitMin: number;
  diffFromAuto: number;
  isFreeNow: boolean;
  dedicatedCount: number;
  universalShare: number;
}

export interface QueueLoadMetrics {
  activeChairs: number;
  freeChairs: number;
  totalWaiting: number;
  automated: {
    waitingCount: number;
    estWaitMin: number;
    freeChairs: number;
  };
  byStylist: Record<string, StylistQueueMetric>;
}

/**
 * Calculates real-time queue load distribution adhering to strict FIFO rules.
 * Prevents the "0 wait / 0 ahead" glitch where universal walk-ins ahead were ignored.
 */
export function calculateQueueLoadMetrics(
  stylists: Stylist[] = [],
  activeTickets: Ticket[] = []
): QueueLoadMetrics {
  const activeStylists = stylists.filter((s) => s.isActive !== false);
  const chairCount = Math.max(1, activeStylists.length);

  const inChairTickets = activeTickets.filter(
    (t) => t.status === "IN_CHAIR" || t.status === "IN_SERVICE"
  );
  const waitingTickets = activeTickets.filter(
    (t) => t.status === "WAITING" || t.status === "SUMMONED" || t.status === "CALLED" || t.status === "SOFT_BUMPED"
  );

  const totalWaitingCount = waitingTickets.length;
  const occupiedChairs = inChairTickets.length;
  const freeChairs = Math.max(0, chairCount - occupiedChairs);

  // Universal/pooled walk-in clients (who take whichever chair opens first)
  const universalWaiting = waitingTickets.filter((t) => !t.stylistId);

  // Automated / fastest-available line wait calculation
  const automatedEstWaitMin = freeChairs > 0 && totalWaitingCount === 0
    ? 0
    : Math.max(5, Math.ceil(((totalWaitingCount + 1) / chairCount) * 15));

  const byStylist: Record<string, StylistQueueMetric> = {};

  for (const st of activeStylists) {
    const stInChair = inChairTickets.find((t) => t.stylistId === st.id);
    const dedicatedWaiting = waitingTickets.filter((t) => t.stylistId === st.id);
    const dedicatedCount = dedicatedWaiting.length;
    const avgDuration = st.avgDurationMinutes || 20;

    // FIFO Rule: Earlier universal clients will also be routed to this chair!
    // Distribute universal line share across available chairs
    const universalShare = Math.ceil(universalWaiting.length / chairCount);
    const totalEffectiveAhead = dedicatedCount + universalShare;

    // Barber is ONLY free now if:
    // 1) Their chair is not occupied,
    // 2) No dedicated clients are waiting, AND
    // 3) No universal walk-ins are waiting in the lounge ahead of new arrivals!
    const isFreeNow = !stInChair && totalWaitingCount === 0;

    let estWait = 0;
    if (isFreeNow) {
      estWait = 0;
    } else {
      const inChairRemain = stInChair ? Math.max(5, Math.round(avgDuration * 0.5)) : 0;
      estWait = inChairRemain + (totalEffectiveAhead > 0 ? totalEffectiveAhead * avgDuration : (stInChair ? 0 : avgDuration));
      // Under strict FIFO, specific barber wait can never be less than fastest available
      estWait = Math.max(automatedEstWaitMin, estWait);
    }

    byStylist[st.id] = {
      waitingCount: totalEffectiveAhead,
      dedicatedCount,
      universalShare,
      isInChair: !!stInChair,
      inChairCustomer: stInChair ? stInChair.customerName : undefined,
      estWaitMin: estWait,
      diffFromAuto: estWait - automatedEstWaitMin,
      isFreeNow,
    };
  }

  return {
    activeChairs: chairCount,
    freeChairs,
    totalWaiting: totalWaitingCount,
    automated: {
      waitingCount: totalWaitingCount,
      estWaitMin: automatedEstWaitMin,
      freeChairs,
    },
    byStylist,
  };
}

/**
 * Accurately calculates how many clients are ahead of a ticket.
 * Correctly includes earlier universal walk-ins so specific barber selection doesn't falsely report "0 ahead".
 */
export function calculatePeopleAhead(
  myTicket: Ticket | null,
  waitingSequence: Ticket[] = []
): { peopleAhead: number; myBarberSpecificAhead: number } {
  if (!myTicket) return { peopleAhead: 0, myBarberSpecificAhead: 0 };

  const myCheckInMs = new Date(myTicket.checkInTime || myTicket.createdAt).getTime();

  // Total people in the entire shop who checked in before me
  const earlierInShop = waitingSequence.filter((t) => {
    if (t.id === myTicket.id) return false;
    const tMs = new Date(t.checkInTime || t.createdAt).getTime();
    return tMs < myCheckInMs;
  });
  const peopleAhead = earlierInShop.length;

  // People ahead who are eligible for my barber's chair (earlier same-barber + earlier universal)
  if (!myTicket.stylistId) {
    return { peopleAhead, myBarberSpecificAhead: peopleAhead };
  }

  const aheadForMyBarber = earlierInShop.filter(
    (t) => !t.stylistId || t.stylistId === myTicket.stylistId
  );

  return {
    peopleAhead,
    myBarberSpecificAhead: aheadForMyBarber.length,
  };
}

/**
 * Calculates arrival time window based on current local device clock.
 */
export function calculateArrivalWindow(
  currentTimeMs: number,
  estimatedWaitMin: number,
  myTicket: Ticket | null
) {
  if (!myTicket || estimatedWaitMin <= 0) {
    return {
      clockText: "Ready Now · Step In",
      exactTarget: "Now",
      tipText: "Please step directly up to your station chair.",
      isReady: true,
    };
  }

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minsStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${minsStr} ${ampm}`;
  };

  const targetDate = new Date(currentTimeMs + estimatedWaitMin * 60000);
  const windowStartDate = new Date(currentTimeMs + Math.max(0, estimatedWaitMin - 2) * 60000);
  const windowEndDate = new Date(currentTimeMs + (estimatedWaitMin + 3) * 60000);

  const clockText = `${formatTime(windowStartDate)} – ${formatTime(windowEndDate)}`;
  const exactTarget = formatTime(targetDate);

  let tipText = `Relax nearby! Plan to be back at salon by ${formatTime(new Date(currentTimeMs + Math.max(0, estimatedWaitMin - 3) * 60000))}.`;
  if (estimatedWaitMin <= 4) {
    tipText = "You are up next! Please remain seated in the waiting lounge.";
  }

  return {
    clockText,
    exactTarget,
    tipText,
    isReady: false,
  };
}
