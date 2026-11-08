import type { QueueTicket } from './types';

export interface CandidateSelectionOptions {
  excludeTicketId?: string;
  preferWaiting?: boolean;
  inactiveStylistIds?: string[];
}

/**
 * Pure function: Selects the next ticket candidate based on stylist preference,
 * Universal Fast Line routing, and soft-bump priority rules.
 */
export function selectNextTicketCandidate(
  tickets: QueueTicket[],
  callingStylistId?: string,
  options: CandidateSelectionOptions = {}
): QueueTicket | null {
  const candidates = tickets.filter(
    (t) =>
      (!options.excludeTicketId || t.id !== options.excludeTicketId) &&
      (t.status === 'WAITING' || t.status === 'SOFT_BUMPED')
  );

  if (candidates.length === 0) return null;

  const preferWaiting = !!options.preferWaiting;

  // Strict chronological arrival comparator (FIFO)
  const sortByArrival = (a: QueueTicket, b: QueueTicket) => {
    const timeA = new Date(a.checkInTime || (a as any).createdAt || 0).getTime();
    const timeB = new Date(b.checkInTime || (b as any).createdAt || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return (a.ticketNumber || 0) - (b.ticketNumber || 0);
  };

  // Explicit priority partitioning with chronological preservation:
  // When preferWaiting is true (e.g. after soft-bumping a no-show), prioritize WAITING tickets first.
  // When preferWaiting is false (default chair call), prioritize SOFT_BUMPED (grace period clients) first.
  const pickFromPool = (pool: QueueTicket[]): QueueTicket | null => {
    if (pool.length === 0) return null;
    const waitingTickets = pool.filter((t) => t.status === 'WAITING').sort(sortByArrival);
    const softBumpedTickets = pool.filter((t) => t.status === 'SOFT_BUMPED').sort(sortByArrival);

    const orderedPool = preferWaiting
      ? [...waitingTickets, ...softBumpedTickets]
      : [...softBumpedTickets, ...waitingTickets];

    return orderedPool[0] || null;
  };

  // Case 1: Stylist-specific station call
  if (callingStylistId) {
    // Fair Chronological Queue:
    // Pool all tickets eligible for this chair (tickets explicitly selecting this stylist + universal walk-ins + inactive/absent stylists).
    // Tickets explicitly requesting a DIFFERENT active stylist are strictly excluded.
    // Late arrivals requesting this stylist NEVER jump ahead of earlier universal walk-ins!
    const eligibleTickets = candidates.filter(
      (t) =>
        !t.stylistId ||
        t.stylistId === callingStylistId ||
        (options.inactiveStylistIds && t.stylistId && options.inactiveStylistIds.includes(t.stylistId))
    );

    return pickFromPool(eligibleTickets);
  }

  // Case 2: General / Front desk call (all available candidates)
  return pickFromPool(candidates);
}
