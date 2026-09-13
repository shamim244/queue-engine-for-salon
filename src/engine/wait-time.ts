import type { QueueTicket, Stylist } from './types';

export interface CalculatedWaitTime {
  estimatedMinutes: number;
  displayRange: string; // e.g. "15 - 22 mins"
  position: number;
}

export function calculateWaitTimes(
  tickets: QueueTicket[],
  stylists: Stylist[]
): Map<string, CalculatedWaitTime> {
  const result = new Map<string, CalculatedWaitTime>();
  
  // Only calculate for tickets that are not completed/cancelled
  const activeWaiting = tickets.filter((t) => t.status === 'WAITING' || t.status === 'SOFT_BUMPED');
  const inChairTickets = tickets.filter((t) => t.status === 'IN_CHAIR');

  // Total working capacity: count active stylists
  const activeStylistCount = Math.max(1, stylists.filter((s) => s.isActive).length);

  // 1. Calculate remaining time for anyone currently in chair
  let currentActiveChairRemainingMinutes = 0;
  for (const inChair of inChairTickets) {
    if (inChair.startedTime) {
      const elapsedMinutes = Math.max(
        0,
        Math.floor((Date.now() - new Date(inChair.startedTime).getTime()) / 60000)
      );
      const remaining = Math.max(5, inChair.totalDurationMinutes - elapsedMinutes);
      currentActiveChairRemainingMinutes += remaining;
    } else {
      currentActiveChairRemainingMinutes += inChair.totalDurationMinutes;
    }
  }

  // 2. Rolling backlog calculation
  let accumulatedMinutes = currentActiveChairRemainingMinutes / activeStylistCount;

  for (let i = 0; i < activeWaiting.length; i++) {
    const ticket = activeWaiting[i];
    const duration = ticket.totalDurationMinutes || 20;

    // Wait time is the accumulated minutes before this ticket is seated
    const wait = Math.round(accumulatedMinutes);
    const minWait = Math.max(5, Math.floor(wait * 0.85));
    const maxWait = Math.max(minWait + 5, Math.ceil(wait * 1.15));

    result.set(ticket.id, {
      estimatedMinutes: wait,
      displayRange: `${minWait} - ${maxWait} mins`,
      position: i + 1,
    });

    // Increment backlog for subsequent tickets
    accumulatedMinutes += duration / activeStylistCount;
  }

  return result;
}
