import type { QueueTicket, Stylist } from './types';

export interface CalculatedWaitTime {
  estimatedMinutes: number;
  displayRange: string; // e.g. "15 - 22 mins"
  position: number;
}

/**
 * High-precision discrete-event queue simulation for multi-stylist and solo salons.
 * Zero continuous server ticking loops (client-compute hardware offloading compliant).
 */
export function calculateWaitTimes(
  tickets: QueueTicket[],
  stylists: Stylist[]
): Map<string, CalculatedWaitTime> {
  const result = new Map<string, CalculatedWaitTime>();
  
  // Only calculate for tickets that are not completed/cancelled
  const inChairTickets = tickets.filter((t) => t.status === 'IN_CHAIR' || t.status === 'IN_SERVICE');
  const summonedTickets = tickets.filter((t) => t.status === 'SUMMONED' || t.status === 'CALLED');
  const activeWaiting = tickets.filter((t) => t.status === 'WAITING' || t.status === 'SOFT_BUMPED');
  const pausedTickets = tickets.filter((t) => t.status === 'PAUSED');

  // Set paused tickets as held
  for (const paused of pausedTickets) {
    result.set(paused.id, {
      estimatedMinutes: 0,
      displayRange: 'Paused',
      position: 0,
    });
  }

  const activeStylists = (stylists || []).filter((s) => s.isActive);

  // Set summoned tickets as ready / 0-1 min
  for (const summoned of summonedTickets) {
    result.set(summoned.id, {
      estimatedMinutes: 0,
      displayRange: '0 - 1 min (Ready)',
      position: 1,
    });
  }

  // Calculate each stylist's next available time (minutes from now)
  const chairPrepBuffer = 3;
  const stylistAvailableMinutes = new Map<string, number>();

  if (activeStylists.length > 0) {
    for (const stylist of activeStylists) {
      const inChair = inChairTickets.find((t) => t.stylistId === stylist.id);
      const summoned = summonedTickets.find((t) => t.stylistId === stylist.id);

      let nextFree = 0;
      if (inChair) {
        if (inChair.startedTime) {
          const elapsedMinutes = Math.max(
            0,
            Math.floor((Date.now() - new Date(inChair.startedTime).getTime()) / 60000)
          );
          nextFree = Math.max(3, (inChair.totalDurationMinutes || 20) - elapsedMinutes);
        } else {
          nextFree = inChair.totalDurationMinutes || 20;
        }
      } else if (summoned) {
        nextFree = chairPrepBuffer + (summoned.totalDurationMinutes || 20);
      } else {
        nextFree = chairPrepBuffer;
      }

      stylistAvailableMinutes.set(stylist.id, nextFree);
    }
  } else {
    // If salon has no registered active stylists, fallback to a virtual chair
    let virtualBusyRemaining = 0;
    for (const inChair of inChairTickets) {
      virtualBusyRemaining += (inChair.totalDurationMinutes || 20);
    }
    for (const summoned of summonedTickets) {
      virtualBusyRemaining += (summoned.totalDurationMinutes || 20);
    }
    stylistAvailableMinutes.set('default-virtual', Math.max(chairPrepBuffer, virtualBusyRemaining));
  }

  // If a ticket is summoned or in chair, but we had stylists that were marked idle without ticketId link:
  // ensure remaining chair time is reflected
  const unlinkedSummoned = summonedTickets.filter(
    (st) => !activeStylists.some((s) => s.id === st.stylistId)
  );
  for (const st of unlinkedSummoned) {
    // Distribute to the earliest stylist
    let minTime = Infinity;
    let minId = Array.from(stylistAvailableMinutes.keys())[0];
    for (const [id, time] of stylistAvailableMinutes.entries()) {
      if (time < minTime) {
        minTime = time;
        minId = id;
      }
    }
    stylistAvailableMinutes.set(minId, minTime + (st.totalDurationMinutes || 20));
  }

  // Simulate queue dispatch for waiting clients
  for (let i = 0; i < activeWaiting.length; i++) {
    const ticket = activeWaiting[i];
    const duration = ticket.totalDurationMinutes || 20;

    let targetStylistId: string;
    let waitMinutes: number;

    if (ticket.stylistId && stylistAvailableMinutes.has(ticket.stylistId)) {
      // Preferred stylist: must wait for this specific stylist
      targetStylistId = ticket.stylistId;
      waitMinutes = stylistAvailableMinutes.get(targetStylistId)!;
    } else {
      // Universal Line: whichever stylist becomes free earliest
      let minMinutes = Infinity;
      let minStylistId = Array.from(stylistAvailableMinutes.keys())[0];
      for (const [sId, avail] of stylistAvailableMinutes.entries()) {
        if (avail < minMinutes) {
          minMinutes = avail;
          minStylistId = sId;
        }
      }
      targetStylistId = minStylistId;
      waitMinutes = minMinutes;
    }

    const wait = Math.max(3, Math.round(waitMinutes));
    const minWait = Math.max(3, Math.floor(wait * 0.85));
    const maxWait = Math.max(minWait + 3, Math.ceil(wait * 1.15));

    result.set(ticket.id, {
      estimatedMinutes: wait,
      displayRange: `${minWait} - ${maxWait} mins`,
      position: summonedTickets.length + i + 1,
    });

    // Advance this stylist's availability
    stylistAvailableMinutes.set(targetStylistId, waitMinutes + duration);
  }

  return result;
}
