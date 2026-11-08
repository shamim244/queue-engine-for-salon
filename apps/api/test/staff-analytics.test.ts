import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { queueRoutes } from '../src/routes/queue.routes';
import { repository } from '../src/db/repository';

describe('Staff Analytics API & Dynamic Date Range Suite', () => {
  const app = new Elysia().use(queueRoutes);

  it('should accept date query parameter and return filtered results with selectedDate', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/queue/staff-report/salon-eagzbsy?date=2026-11-08')
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.selectedDate).toBe('2026-11-08');
    expect(typeof json.totalServedToday).toBe('number');
    expect(typeof json.totalRevenueToday).toBe('number');
    expect(typeof json.cashRevenue).toBe('number');
    expect(typeof json.onlineRevenue).toBe('number');
  });

  it('should retrieve tickets for a previous specific date', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/queue/staff-report/salon-eagzbsy?date=2026-11-07')
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.selectedDate).toBe('2026-11-07');
    expect(json.totalServedToday).toBeGreaterThanOrEqual(0);
  });

  it('should support week and month timeframe queries', async () => {
    const resWeek = await app.handle(
      new Request('http://localhost/api/queue/staff-report/salon-eagzbsy?timeframe=week')
    );
    expect(resWeek.status).toBe(200);
    const jsonWeek = await resWeek.json();
    expect(jsonWeek.success).toBe(true);
    expect(jsonWeek.timeframe).toBe('week');

    const resMonth = await app.handle(
      new Request('http://localhost/api/queue/staff-report/salon-eagzbsy?timeframe=month')
    );
    expect(resMonth.status).toBe(200);
    const jsonMonth = await resMonth.json();
    expect(jsonMonth.success).toBe(true);
    expect(jsonMonth.timeframe).toBe('month');
  });
});
