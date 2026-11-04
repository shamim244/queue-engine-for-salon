import type { QueueTicket } from './types';

export interface CandidateSelectionOptions {
  excludeTicketId?: string;
  preferWaiting?: boolean;
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

  // Explicit priority partitioning:
  // When preferWaiting is true (e.g. after soft-bumping a no-show), prioritize WAITING tickets first.
  // When preferWaiting is false (default chair call), prioritize SOFT_BUMPED (grace period clients) first.
  const pickFromPool = (pool: QueueTicket[]): QueueTicket | null => {
    if (pool.length === 0) return null;
    const waitingTickets = pool.filter((t) => t.status === 'WAITING');
    const softBumpedTickets = pool.filter((t) => t.status === 'SOFT_BUMPED');

    const orderedPool = preferWaiting
      ? [...waitingTickets, ...softBumpedTickets]
      : [...softBumpedTickets, ...waitingTickets];

    return orderedPool[0] || null;
  };

  // Case 1: Stylist-specific station call
  if (callingStylistId) {
    // 1A. Tickets explicitly selecting this stylist
    const preferredTickets = candidates.filter((t) => t.stylistId === callingStylistId);
    const chosenPref = pickFromPool(preferredTickets);
    if (chosenPref) return chosenPref;

    // 1B. Fallback to Universal Line (tickets with no preferred stylist)
    const universalTickets = candidates.filter((t) => !t.stylistId);
    const chosenUniversal = pickFromPool(universalTickets);
    if (chosenUniversal) return chosenUniversal;

    // Do not steal tickets that explicitly preferred another stylist
    return null;
  }

  // Case 2: General / Front desk call (all available candidates)
  return pickFromPool(candidates);
}
