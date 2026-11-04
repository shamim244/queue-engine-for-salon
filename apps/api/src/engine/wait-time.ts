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
  const inChairTickets = tickets.filter((t) => t.status === 'IN_CHAIR' || t.status === 'IN_SERVICE');
  const summonedTickets = tickets.filter((t) => t.status === 'SUMMONED' || t.status === 'CALLED');
  const activeWaiting = tickets.filter((t) => t.status === 'WAITING' || t.status === 'SOFT_BUMPED');

  // Total working capacity: count active stylists
  const activeStylistCount = Math.max(1, stylists.filter((s) => s.isActive).length);

  // Set summoned tickets as ready / 0m
  for (const summoned of summonedTickets) {
    result.set(summoned.id, {
      estimatedMinutes: 0,
      displayRange: '0 - 1 min (Ready)',
      position: 1,
    });
  }

  // 1. Calculate remaining time for anyone currently in chair or summoned
  let currentActiveChairRemainingMinutes = 0;
  for (const inChair of inChairTickets) {
    if (inChair.startedTime) {
      const elapsedMinutes = Math.max(
        0,
        Math.floor((Date.now() - new Date(inChair.startedTime).getTime()) / 60000)
      );
      const remaining = Math.max(5, (inChair.totalDurationMinutes || 20) - elapsedMinutes);
      currentActiveChairRemainingMinutes += remaining;
    } else {
      currentActiveChairRemainingMinutes += (inChair.totalDurationMinutes || 20);
    }
  }

  for (const summoned of summonedTickets) {
    currentActiveChairRemainingMinutes += (summoned.totalDurationMinutes || 20);
  }

  // 2. Rolling backlog calculation
  const chairPrepBuffer = 3;
  let accumulatedMinutes = currentActiveChairRemainingMinutes > 0
    ? currentActiveChairRemainingMinutes / activeStylistCount
    : chairPrepBuffer;

  for (let i = 0; i < activeWaiting.length; i++) {
    const ticket = activeWaiting[i];
    const duration = ticket.totalDurationMinutes || 20;

    // Wait time is the accumulated minutes before this ticket is seated
    const wait = Math.max(3, Math.round(accumulatedMinutes));
    const minWait = Math.max(3, Math.floor(wait * 0.85));
    const maxWait = Math.max(minWait + 3, Math.ceil(wait * 1.15));

    result.set(ticket.id, {
      estimatedMinutes: wait,
      displayRange: `${minWait} - ${maxWait} mins`,
      position: summonedTickets.length + i + 1,
    });

    // Increment backlog for subsequent tickets
    accumulatedMinutes += duration / activeStylistCount;
  }

  return result;
}

