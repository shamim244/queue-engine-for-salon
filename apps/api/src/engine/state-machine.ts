import type { Appointment, AppointmentStatus, QueueTicket, TicketStatus } from './types';

// Allowed ticket state transitions map
const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  WAITING: ['SUMMONED', 'SOFT_BUMPED', 'IN_CHAIR', 'PAUSED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  SUMMONED: ['IN_CHAIR', 'SOFT_BUMPED', 'WAITING', 'PAUSED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  SOFT_BUMPED: ['SUMMONED', 'IN_CHAIR', 'PAUSED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  PAUSED: ['WAITING', 'SUMMONED', 'CANCELLED'],
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

// Target Appointment State Machine (ADR 005 Section 5)
export const VALID_APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'],
  CHECKED_IN: ['IN_CHAIR', 'CANCELLED', 'NO_SHOW'],
  IN_CHAIR: ['COMPLETED'],
  RESCHEDULED: ['CONFIRMED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
  EXPIRED: [],
};

export function canTransitionAppointment(
  currentStatus: AppointmentStatus,
  targetStatus: AppointmentStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = VALID_APPOINTMENT_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(targetStatus) : false;
}

export function validateAppointmentTransition(
  appointment: Appointment,
  targetStatus: AppointmentStatus
): { allowed: boolean; reason?: string } {
  if (!canTransitionAppointment(appointment.status, targetStatus)) {
    return {
      allowed: false,
      reason: `Cannot transition appointment from ${appointment.status} to ${targetStatus}`,
    };
  }
  return { allowed: true };
}
