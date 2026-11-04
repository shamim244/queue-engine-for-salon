import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { queueRoutes } from '../src/routes/queue.routes';
import { queueEngine } from '../src/engine/queue-engine';
import { repository, seedDemoData } from '../src/db/repository';

describe('Staff Station Hold & Call Next Workflow Suite', () => {
  const app = new Elysia().use(queueRoutes);

  beforeEach(() => {
    seedDemoData();
  });

  it('should mark current ticket as SOFT_BUMPED and summon the next waiting client atomically', async () => {
    // Check-in Ticket 1
    const t1 = await queueEngine.checkIn({
      salonSlug: 'ramesh-barber',
      customerName: 'Client InQueue 1',
      customerPhone: '9876543211',
      serviceId: 'srv-r-1',
    });

    // Check-in Ticket 2
    const t2 = await queueEngine.checkIn({
      salonSlug: 'ramesh-barber',
      customerName: 'Client InQueue 2',
      customerPhone: '9876543212',
      serviceId: 'srv-r-1',
    });

    // Summon Ticket 1
    const summoned1 = await queueEngine.callNext(t1.salonId);
    expect(summoned1).not.toBeNull();
    expect(summoned1?.id).toBe(t1.id);

    // Call POST /api/queue/hold-and-call-next
    const res = await app.handle(
      new Request('http://localhost/api/queue/hold-and-call-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: t1.salonId,
          currentTicketId: t1.id,
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.bumpedTicket).toBeDefined();
    expect(body.bumpedTicket.status).toBe('SOFT_BUMPED');
    expect(body.bumpedTicket.id).toBe(t1.id);

    expect(body.nextTicket).toBeDefined();
    expect(body.nextTicket.status).toBe('SUMMONED');
    expect(body.nextTicket.id).toBe(t2.id);

    // Check repository state
    const t1Reloaded = await repository.getTicketById(t1.id);
    expect(t1Reloaded?.status).toBe('SOFT_BUMPED');

    const t2Reloaded = await repository.getTicketById(t2.id);
    expect(t2Reloaded?.status).toBe('SUMMONED');
  });

  it('should summon the third waiting client when both first and second clients are sequentially held (preventing ping-pong loop)', async () => {
    // Check-in Ticket 1, 2, 3
    const t1 = await queueEngine.checkIn({
      salonSlug: 'ramesh-barber',
      customerName: 'Client 1',
      customerPhone: '9876543201',
      serviceId: 'srv-r-1',
    });
    const t2 = await queueEngine.checkIn({
      salonSlug: 'ramesh-barber',
      customerName: 'Client 2',
      customerPhone: '9876543202',
      serviceId: 'srv-r-1',
    });
    const t3 = await queueEngine.checkIn({
      salonSlug: 'ramesh-barber',
      customerName: 'Client 3',
      customerPhone: '9876543203',
      serviceId: 'srv-r-1',
    });

    // Summon Ticket 1
    const s1 = await queueEngine.callNext(t1.salonId);
    expect(s1?.id).toBe(t1.id);

    // Hold Ticket 1 -> Ticket 2 should be summoned
    const hold1 = await queueEngine.holdAndCallNext({
      salonId: t1.salonId,
      currentTicketId: t1.id,
    });
    expect(hold1.bumpedTicket?.status).toBe('SOFT_BUMPED');
    expect(hold1.nextTicket?.id).toBe(t2.id);

    // Hold Ticket 2 -> Ticket 3 MUST be summoned (NOT Ticket 1 again!)
    const hold2 = await queueEngine.holdAndCallNext({
      salonId: t1.salonId,
      currentTicketId: t2.id,
    });
    expect(hold2.bumpedTicket?.status).toBe('SOFT_BUMPED');
    expect(hold2.bumpedTicket?.id).toBe(t2.id);
    expect(hold2.nextTicket?.id).toBe(t3.id); // Must be t3, NOT t1!
  });
});

