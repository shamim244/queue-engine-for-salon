import type { QueueTicket, Stylist, Appointment } from './types';

export interface CalculatedWaitTime {
  estimatedMinutes: number;
  displayRange: string; // e.g. "15 - 22 mins"
  position: number;
}

interface StylistTimeline {
  stylistId: string;
  nextFreeMinutes: number;
  appointmentBlocks: Array<{ start: number; end: number; id: string }>;
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

/**
 * High-precision discrete-event queue simulation for multi-stylist and solo salons.
 * Interleaves confirmed advance appointments onto stylist timelines dynamically.
 * Zero continuous server ticking loops (client-compute hardware offloading compliant).
 */
export function calculateWaitTimes(
  tickets: QueueTicket[],
  stylists: Stylist[],
  appointments?: Appointment[],
  currentTime?: Date
): Map<string, CalculatedWaitTime> {
  const result = new Map<string, CalculatedWaitTime>();
  const now = currentTime || new Date();

  // Local date string YYYY-MM-DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayDateStr = `${year}-${month}-${day}`;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Separate ticket groups
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

  // Set summoned tickets as ready / 0-1 min
  for (const summoned of summonedTickets) {
    result.set(summoned.id, {
      estimatedMinutes: 0,
      displayRange: '0 - 1 min (Ready)',
      position: 1,
    });
  }

  const activeStylists = (stylists || []).filter((s) => s.isActive);
  const chairPrepBuffer = 3;

  // 2. Build initial timelines for stylists
  const timelines = new Map<string, StylistTimeline>();

  if (activeStylists.length > 0) {
    for (const stylist of activeStylists) {
      const inChairTicket = inChairTickets.find((t) => t.stylistId === stylist.id);
      const inChairAppt = (appointments || []).find(
        (a) => a.stylistId === stylist.id && a.status === 'IN_CHAIR'
      );
      const summoned = summonedTickets.find((t) => t.stylistId === stylist.id);

      let nextFree = chairPrepBuffer;
      if (inChairTicket) {
        if (inChairTicket.startedTime) {
          const elapsedMinutes = Math.max(
            0,
            Math.floor((now.getTime() - new Date(inChairTicket.startedTime).getTime()) / 60000)
          );
          nextFree = Math.max(3, (inChairTicket.totalDurationMinutes || 20) - elapsedMinutes);
        } else {
          nextFree = inChairTicket.totalDurationMinutes || 20;
        }
      } else if (inChairAppt) {
        const chairTime = inChairAppt.updatedAt || inChairAppt.createdAt;
        const elapsedMinutes = chairTime
          ? Math.max(0, Math.floor((now.getTime() - new Date(chairTime).getTime()) / 60000))
          : 0;
        nextFree = Math.max(3, (inChairAppt.durationMinutes || 30) - elapsedMinutes);
      } else if (summoned) {
        nextFree = chairPrepBuffer + (summoned.totalDurationMinutes || 20);
      }

      timelines.set(stylist.id, {
        stylistId: stylist.id,
        nextFreeMinutes: nextFree,
        appointmentBlocks: [],
      });
    }
  } else {
    // Fallback virtual chair
    let virtualBusyRemaining = 0;
    for (const inChair of inChairTickets) {
      virtualBusyRemaining += (inChair.totalDurationMinutes || 20);
    }
    for (const summoned of summonedTickets) {
      virtualBusyRemaining += (summoned.totalDurationMinutes || 20);
    }

    timelines.set('default-virtual', {
      stylistId: 'default-virtual',
      nextFreeMinutes: Math.max(chairPrepBuffer, virtualBusyRemaining),
      appointmentBlocks: [],
    });
  }

  // Handle unlinked summoned tickets across stylists
  const unlinkedSummoned = summonedTickets.filter(
    (st) => !activeStylists.some((s) => s.id === st.stylistId)
  );
  for (const st of unlinkedSummoned) {
    let earliestTimeline: StylistTimeline | null = null;
    for (const tl of timelines.values()) {
      if (!earliestTimeline || tl.nextFreeMinutes < earliestTimeline.nextFreeMinutes) {
        earliestTimeline = tl;
      }
    }
    if (earliestTimeline) {
      earliestTimeline.nextFreeMinutes += (st.totalDurationMinutes || 20);
    }
  }

  // 3. Interleave confirmed appointments onto stylist timelines
  const validAppointments = (appointments || []).filter((appt) => {
    // Only today's active appointments
    if (appt.scheduledDate !== todayDateStr) return false;
    if (appt.status !== 'CONFIRMED' && appt.status !== 'CHECKED_IN') return false;

    const startTotal = parseTimeToMinutes(appt.slotStartTime);
    const endTotal = parseTimeToMinutes(appt.slotEndTime);

    // If slot has already ended in the past, ignore
    if (endTotal <= nowMinutes) return false;

    // 10-minute grace window enforcement:
    // If status is CONFIRMED (not checked-in) and more than 10 mins past slot start,
    // the grace window has expired -> ignore and do not block the timeline.
    if (appt.status === 'CONFIRMED' && nowMinutes > startTotal + 10) {
      return false;
    }

    return true;
  });

  // Assign appointments to stylist timelines
  for (const appt of validAppointments) {
    const startTotal = parseTimeToMinutes(appt.slotStartTime);
    const endTotal = parseTimeToMinutes(appt.slotEndTime);

    // Relative minutes from now
    const startFromNow = Math.max(0, startTotal - nowMinutes);
    const endFromNow = Math.max(startFromNow + 5, endTotal - nowMinutes);

    if (appt.stylistId && timelines.has(appt.stylistId)) {
      timelines.get(appt.stylistId)!.appointmentBlocks.push({
        id: appt.id,
        start: startFromNow,
        end: endFromNow,
      });
    } else {
      // Universal appointment: assign to the stylist with fewest blocks or earliest availability
      let bestTimeline: StylistTimeline | null = null;
      for (const tl of timelines.values()) {
        if (!bestTimeline || tl.appointmentBlocks.length < bestTimeline.appointmentBlocks.length) {
          bestTimeline = tl;
        }
      }
      if (bestTimeline) {
        bestTimeline.appointmentBlocks.push({
          id: appt.id,
          start: startFromNow,
          end: endFromNow,
        });
      }
    }
  }

  // Sort each stylist's appointment blocks chronologically
  for (const tl of timelines.values()) {
    tl.appointmentBlocks.sort((a, b) => a.start - b.start);
  }

  // Helper to schedule a walk-in duration onto a stylist timeline
  function findEarliestStartForWalkIn(
    timeline: StylistTimeline,
    duration: number
  ): number {
    let cursor = timeline.nextFreeMinutes;

    for (const block of timeline.appointmentBlocks) {
      // If cursor + duration fits before the appointment starts, we take this gap!
      if (cursor + duration <= block.start) {
        return cursor;
      }

      // If there is an overlap or cursor is already inside the block
      if (cursor < block.end) {
        cursor = Math.max(cursor, block.end);
      }
    }

    return cursor;
  }

  // 4. Simulate queue dispatch for waiting clients (FIFO)
  for (let i = 0; i < activeWaiting.length; i++) {
    const ticket = activeWaiting[i];
    const duration = ticket.totalDurationMinutes || 20;

    let selectedTimeline: StylistTimeline;
    let scheduledStartMinutes: number;

    if (ticket.stylistId && timelines.has(ticket.stylistId)) {
      // Preferred stylist
      selectedTimeline = timelines.get(ticket.stylistId)!;
      scheduledStartMinutes = findEarliestStartForWalkIn(selectedTimeline, duration);
    } else {
      // Universal Line: select the stylist that gives earliest start time
      let minStart = Infinity;
      let bestTl: StylistTimeline = Array.from(timelines.values())[0];

      for (const tl of timelines.values()) {
        const candidateStart = findEarliestStartForWalkIn(tl, duration);
        if (candidateStart < minStart) {
          minStart = candidateStart;
          bestTl = tl;
        }
      }

      selectedTimeline = bestTl;
      scheduledStartMinutes = minStart;
    }

    const wait = Math.max(3, Math.round(scheduledStartMinutes));
    const minWait = Math.max(3, Math.floor(wait * 0.85));
    const maxWait = Math.max(minWait + 3, Math.ceil(wait * 1.15));

    result.set(ticket.id, {
      estimatedMinutes: wait,
      displayRange: `${minWait} - ${maxWait} mins`,
      position: summonedTickets.length + i + 1,
    });

    // Advance this stylist's availability cursor past this walk-in ticket
    selectedTimeline.nextFreeMinutes = scheduledStartMinutes + duration;
  }

  return result;
}
