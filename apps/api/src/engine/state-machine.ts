import type { QueueTicket, TicketStatus } from './types';

// Allowed state transitions map
const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  WAITING: ['SUMMONED', 'SOFT_BUMPED', 'IN_CHAIR', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  SUMMONED: ['IN_CHAIR', 'SOFT_BUMPED', 'WAITING', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  SOFT_BUMPED: ['SUMMONED', 'IN_CHAIR', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  IN_CHAIR: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canTransitionTicket(currentStatus: TicketStatus, targetStatus: TicketStatus): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = VALID_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(targetStatus) : false;
}

export function validateTicketTransition(
  ticket: QueueTicket,
  targetStatus: TicketStatus
): { allowed: boolean; reason?: string } {
  if (!canTransitionTicket(ticket.status, targetStatus)) {
    return {
      allowed: false,
      reason: `Cannot transition ticket from ${ticket.status} to ${targetStatus}`,
    };
  }
  return { allowed: true };
}
