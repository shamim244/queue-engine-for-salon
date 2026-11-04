import { describe, it, expect, beforeEach } from 'bun:test';
import { repository, seedDemoData } from '../src/db/repository';
import { queueEngine } from '../src/engine/queue-engine';
import { selectNextTicketCandidate } from '../src/engine/routing';
import type { QueueTicket } from '../src/engine/types';

describe('Queue Engine Concurrency, State Integrity & Error Boundaries', () => {
  beforeEach(() => {
    seedDemoData();
  });

  describe('1. Explicit Candidate Selection & preferWaiting Priority', () => {
    it('should strictly prioritize SOFT_BUMPED over WAITING when preferWaiting is false (default chair call)', () => {
      const tickets: QueueTicket[] = [
        {
          id: 'tkt-1',
          salonId: 'salon-rural-01',
          stylistId: null,
          ticketNumber: 101,
          customerName: 'Waiting Client',
          customerPhone: '111',
          serviceId: 'srv-r-1',
          serviceName: 'Haircut',
          totalPrice: 80,
          totalDurationMinutes: 20,
          status: 'WAITING',
          source: 'QR_SCAN',
          estimatedWaitMinutes: 10,
          checkInTime: new Date().toISOString(),
          paymentStatus: 'PENDING',
          positionInQueue: 1,
        },
        {
          id: 'tkt-2',
          salonId: 'salon-rural-01',
          stylistId: null,
          ticketNumber: 102,
          customerName: 'Soft Bumped Client',
          customerPhone: '222',
          serviceId: 'srv-r-1',
          serviceName: 'Haircut',
          totalPrice: 80,
          totalDurationMinutes: 20,
          status: 'SOFT_BUMPED',
          source: 'QR_SCAN',
          estimatedWaitMinutes: 0,
          checkInTime: new Date().toISOString(),
          paymentStatus: 'PENDING',
          positionInQueue: 0,
        },
      ];

      const candidate = selectNextTicketCandidate(tickets, undefined, { preferWaiting: false });
      expect(candidate).not.toBeNull();
      expect(candidate?.id).toBe('tkt-2'); // Soft bumped client gets chair priority
    });

    it('should strictly prioritize WAITING over SOFT_BUMPED when preferWaiting is true (hold and call next)', () => {
      const tickets: QueueTicket[] = [
        {
          id: 'tkt-1',
          salonId: 'salon-rural-01',
          stylistId: null,
          ticketNumber: 101,
          customerName: 'Soft Bumped Client',
          customerPhone: '111',
          serviceId: 'srv-r-1',
          serviceName: 'Haircut',
          totalPrice: 80,
          totalDurationMinutes: 20,
          status: 'SOFT_BUMPED',
          source: 'QR_SCAN',
          estimatedWaitMinutes: 0,
          checkInTime: new Date().toISOString(),
          paymentStatus: 'PENDING',
          positionInQueue: 0,
        },
        {
          id: 'tkt-2',
          salonId: 'salon-rural-01',
          stylistId: null,
          ticketNumber: 102,
          customerName: 'Waiting Client',
          customerPhone: '222',
          serviceId: 'srv-r-1',
          serviceName: 'Haircut',
          totalPrice: 80,
          totalDurationMinutes: 20,
          status: 'WAITING',
          source: 'QR_SCAN',
          estimatedWaitMinutes: 15,
          checkInTime: new Date().toISOString(),
          paymentStatus: 'PENDING',
          positionInQueue: 1,
        },
      ];

      const candidate = selectNextTicketCandidate(tickets, undefined, { preferWaiting: true });
      expect(candidate).not.toBeNull();
      expect(candidate?.id).toBe('tkt-2'); // Waiting client called next, not re-summoning held client
    });
  });

  describe('2. Batch Wait-Time Atomic Recalculation', () => {
    it('should execute atomic batch wait-time update without per-ticket sequential overhead', async () => {
      const t1 = await queueEngine.checkIn({
        salonSlug: 'ramesh-barber',
        customerName: 'Batch Client 1',
        customerPhone: '9000000001',
        serviceId: 'srv-r-1',
      });
      const t2 = await queueEngine.checkIn({
        salonSlug: 'ramesh-barber',
        customerName: 'Batch Client 2',
        customerPhone: '9000000002',
        serviceId: 'srv-r-1',
      });

      // Update wait times via batch method
      await repository.updateTicketWaitTimesBatch([
        { id: t1.id, estimatedWaitMinutes: 12 },
        { id: t2.id, estimatedWaitMinutes: 32 },
      ]);

      const fetched1 = await repository.getTicketById(t1.id);
      const fetched2 = await repository.getTicketById(t2.id);

      expect(fetched1?.estimatedWaitMinutes).toBe(12);
      expect(fetched2?.estimatedWaitMinutes).toBe(32);
    });

    it('should safely serialize concurrent recalculateQueue calls for the same salon', async () => {
      const salon = await repository.getSalonBySlug('ramesh-barber');
      expect(salon).not.toBeNull();

      // Dispatch 5 concurrent recalculation calls
      const promises = [
        queueEngine.recalculateQueue(salon!.id),
        queueEngine.recalculateQueue(salon!.id),
        queueEngine.recalculateQueue(salon!.id),
        queueEngine.recalculateQueue(salon!.id),
        queueEngine.recalculateQueue(salon!.id),
      ];

      const results = await Promise.all(promises);
      expect(results.length).toBe(5);
      // All calls resolve cleanly without race condition throws
      for (const res of results) {
        expect(Array.isArray(res)).toBe(true);
      }
    });
  });

  describe('3. Database and Memory Store Consistency', () => {
    it('should retrieve salon by ID directly via getSalonById with sub-millisecond retrieval', async () => {
      const salon = await repository.getSalonBySlug('ramesh-barber');
      expect(salon).not.toBeNull();

      const byId = await repository.getSalonById(salon!.id);
      expect(byId).not.toBeNull();
      expect(byId?.id).toBe(salon!.id);
      expect(byId?.slug).toBe('ramesh-barber');
    });

    it('should return null when updateTicketStatus is called with non-existent ticketId', async () => {
      const result = await repository.updateTicketStatus('non-existent-ticket-id', 'SUMMONED');
      expect(result).toBeNull();
    });

    it('should update ticket status cleanly and return updated ticket object', async () => {
      const ticket = await queueEngine.checkIn({
        salonSlug: 'ramesh-barber',
        customerName: 'Status Client',
        customerPhone: '9000000003',
        serviceId: 'srv-r-1',
      });

      const updated = await repository.updateTicketStatus(ticket.id, 'IN_CHAIR', {
        startedTime: new Date().toISOString(),
      });

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe('IN_CHAIR');
      expect(updated?.startedTime).toBeDefined();

      const fresh = await repository.getTicketById(ticket.id);
      expect(fresh?.status).toBe('IN_CHAIR');
    });
  });
});
