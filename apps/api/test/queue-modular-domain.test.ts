import { describe, it, expect } from 'bun:test';
import { canTransitionTicket, validateTicketTransition } from '../src/engine/state-machine';
import { selectNextTicketCandidate } from '../src/engine/routing';
import type { QueueTicket } from '../src/engine/types';

describe('Modular Queue Domain State Machine & Routing', () => {
  describe('State Machine Transitions', () => {
    it('allows valid lifecycle transitions', () => {
      expect(canTransitionTicket('WAITING', 'SUMMONED')).toBe(true);
      expect(canTransitionTicket('SUMMONED', 'IN_CHAIR')).toBe(true);
      expect(canTransitionTicket('SUMMONED', 'SOFT_BUMPED')).toBe(true);
      expect(canTransitionTicket('SOFT_BUMPED', 'SUMMONED')).toBe(true);
      expect(canTransitionTicket('IN_CHAIR', 'COMPLETED')).toBe(true);
      expect(canTransitionTicket('WAITING', 'CANCELLED')).toBe(true);
      expect(canTransitionTicket('SUMMONED', 'CANCELLED')).toBe(true);
    });

    it('rejects invalid or backward lifecycle transitions', () => {
      expect(canTransitionTicket('COMPLETED', 'WAITING')).toBe(false);
      expect(canTransitionTicket('COMPLETED', 'IN_CHAIR')).toBe(false);
      expect(canTransitionTicket('CANCELLED', 'SUMMONED')).toBe(false);
      expect(canTransitionTicket('IN_CHAIR', 'WAITING')).toBe(false);
      expect(canTransitionTicket('IN_CHAIR', 'SUMMONED')).toBe(false);
    });

    it('validates transition on a ticket object and returns informative reasons', () => {
      const mockTicket: QueueTicket = {
        id: 'tkt-1',
        salonId: 's-1',
        stylistId: null,
        ticketNumber: 101,
        customerName: 'Test Customer',
        customerPhone: '9876543210',
        serviceId: 'srv-1',
        serviceName: 'Haircut',
        totalPrice: 150,
        totalDurationMinutes: 20,
        status: 'COMPLETED',
        source: 'QR_SCAN',
        estimatedWaitMinutes: 0,
        checkInTime: new Date().toISOString(),
        paymentStatus: 'CASH_PAID',
      };

      const validRes = validateTicketTransition({ ...mockTicket, status: 'WAITING' }, 'SUMMONED');
      expect(validRes.allowed).toBe(true);

      const invalidRes = validateTicketTransition(mockTicket, 'WAITING');
      expect(invalidRes.allowed).toBe(false);
      expect(invalidRes.reason).toContain('Cannot transition ticket from COMPLETED to WAITING');
    });
  });

  describe('Routing & Candidate Selection', () => {
    const makeTicket = (
      id: string,
      ticketNumber: number,
      status: QueueTicket['status'],
      stylistId: string | null = null
    ): QueueTicket => ({
      id,
      salonId: 's-1',
      stylistId,
      ticketNumber,
      customerName: `Customer ${ticketNumber}`,
      customerPhone: '9876543210',
      serviceId: 'srv-1',
      serviceName: 'Haircut',
      totalPrice: 150,
      totalDurationMinutes: 20,
      status,
      source: 'QR_SCAN',
      estimatedWaitMinutes: 0,
      checkInTime: new Date().toISOString(),
      paymentStatus: 'PENDING',
    });

    it('strictly preserves chronological FIFO order among eligible tickets for the calling stylist', () => {
      const tickets: QueueTicket[] = [
        makeTicket('tkt-univ-1', 101, 'WAITING', null), // Universal Fast line (arrived first)
        makeTicket('tkt-pref-1', 102, 'WAITING', 'stylist-leo'), // Prefers Leo (arrived second)
        makeTicket('tkt-pref-2', 103, 'WAITING', 'stylist-ramesh'), // Prefers Ramesh
      ];

      const candidate = selectNextTicketCandidate(tickets, 'stylist-leo');
      expect(candidate).not.toBeNull();
      // Ticket 101 arrived first and is eligible for Leo -> called first (no queue jumping)
      expect(candidate?.id).toBe('tkt-univ-1');
      expect(candidate?.ticketNumber).toBe(101);
    });

    it('calls preferred ticket first if preferred client arrived before universal clients', () => {
      const tickets: QueueTicket[] = [
        makeTicket('tkt-pref-1', 100, 'WAITING', 'stylist-leo'), // Prefers Leo (arrived first)
        makeTicket('tkt-univ-1', 101, 'WAITING', null), // Universal Fast line (arrived second)
      ];

      const candidate = selectNextTicketCandidate(tickets, 'stylist-leo');
      expect(candidate).not.toBeNull();
      expect(candidate?.id).toBe('tkt-pref-1');
      expect(candidate?.ticketNumber).toBe(100);
    });

    it('falls back to Universal Line tickets when calling stylist has no preferred clients', () => {
      const tickets: QueueTicket[] = [
        makeTicket('tkt-univ-1', 101, 'WAITING', null), // Universal Line
        makeTicket('tkt-pref-ramesh', 102, 'WAITING', 'stylist-ramesh'),
      ];

      // Stylist Leo calls next -> should pick Universal Line (ticket 101), not Ramesh's client
      const candidate = selectNextTicketCandidate(tickets, 'stylist-leo');
      expect(candidate).not.toBeNull();
      expect(candidate?.id).toBe('tkt-univ-1');
      expect(candidate?.ticketNumber).toBe(101);
    });

    it('honors preferWaiting option to prevent ping-pong loops on soft-bumped clients', () => {
      const tickets: QueueTicket[] = [
        makeTicket('tkt-held-1', 101, 'SOFT_BUMPED', null), // Held client
        makeTicket('tkt-wait-1', 102, 'WAITING', null), // Fresh waiting client
      ];

      // Default: held clients called first
      const defaultCandidate = selectNextTicketCandidate(tickets, undefined);
      expect(defaultCandidate?.id).toBe('tkt-held-1');

      // With preferWaiting: uncalled client prioritized
      const preferCandidate = selectNextTicketCandidate(tickets, undefined, { preferWaiting: true });
      expect(preferCandidate?.id).toBe('tkt-wait-1');
    });

    it('excludes specified ticketId when soft-bumping and calling next atomically', () => {
      const tickets: QueueTicket[] = [
        makeTicket('tkt-1', 101, 'SOFT_BUMPED', null),
        makeTicket('tkt-2', 102, 'WAITING', null),
      ];

      const candidate = selectNextTicketCandidate(tickets, undefined, { excludeTicketId: 'tkt-1' });
      expect(candidate?.id).toBe('tkt-2');
    });
  });
});
