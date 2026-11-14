import { describe, it, expect, beforeEach } from 'bun:test';
import { rateLimiter } from '../src/security/rate-limiter';
import { securityRepo } from '../src/db/repositories/security.repo';
import { app } from '../index';

describe('Task 3: Dynamic Sliding-Window Rate Limiter', () => {
  beforeEach(async () => {
    rateLimiter.clearAll();
    await securityRepo.updateSettings({
      pinMaxAttempts: 3,
      pinWindowSeconds: 60,
      loginMaxAttempts: 5,
      loginWindowSeconds: 60,
      checkinMaxAttempts: 5,
      checkinWindowSeconds: 60,
    });
  });

  it('3.1 should allow attempts under the configured limit', () => {
    const key = 'test-client-1';
    const r1 = rateLimiter.checkLimit(key, 3, 60);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = rateLimiter.checkLimit(key, 3, 60);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = rateLimiter.checkLimit(key, 3, 60);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('3.2 should block attempts exceeding the limit and provide retryAfter', () => {
    const key = 'test-client-blocked';
    rateLimiter.checkLimit(key, 2, 60);
    rateLimiter.checkLimit(key, 2, 60);

    const blocked = rateLimiter.checkLimit(key, 2, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('3.3 should reset limits upon successful action', () => {
    const key = 'test-client-reset';
    rateLimiter.checkLimit(key, 3, 60);
    rateLimiter.checkLimit(key, 3, 60);

    rateLimiter.reset(key);
    const fresh = rateLimiter.checkLimit(key, 3, 60);
    expect(fresh.allowed).toBe(true);
    expect(fresh.remaining).toBe(2);
  });

  it('3.4 should enforce rate limiting on /api/auth/pin-switch endpoint', async () => {
    // pinMaxAttempts is set to 3
    const badPayload = JSON.stringify({
      salonId: 'salon-rural-01',
      staffId: 'stylist-01',
      pin: '9999', // wrong pin
    });

    // Attempt 1 -> 401
    const res1 = await app.handle(
      new Request('http://localhost:3000/api/auth/pin-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.10' },
        body: badPayload,
      })
    );
    expect(res1.status).toBe(401);

    // Attempt 2 -> 401
    const res2 = await app.handle(
      new Request('http://localhost:3000/api/auth/pin-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.10' },
        body: badPayload,
      })
    );
    expect(res2.status).toBe(401);

    // Attempt 3 -> 401
    const res3 = await app.handle(
      new Request('http://localhost:3000/api/auth/pin-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.10' },
        body: badPayload,
      })
    );
    expect(res3.status).toBe(401);

    // Attempt 4 -> Should be RATE LIMITED (HTTP 429)
    const res4 = await app.handle(
      new Request('http://localhost:3000/api/auth/pin-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.10' },
        body: badPayload,
      })
    );
    expect(res4.status).toBe(429);
    const body4: any = await res4.json();
    expect(body4.message).toContain('Too many failed PIN attempts');
  });

  it('3.5 should adapt when admin dynamically changes the limits', async () => {
    // Admin reduces pinMaxAttempts to 1
    await securityRepo.updateSettings({
      pinMaxAttempts: 1,
      pinWindowSeconds: 60,
    });

    const badPayload = JSON.stringify({
      salonId: 'salon-rural-01',
      staffId: 'stylist-01',
      pin: '9999',
    });

    // Attempt 1 -> 401
    const res1 = await app.handle(
      new Request('http://localhost:3000/api/auth/pin-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.20' },
        body: badPayload,
      })
    );
    expect(res1.status).toBe(401);

    // Attempt 2 -> Should immediately be blocked (429) because admin set limit to 1
    const res2 = await app.handle(
      new Request('http://localhost:3000/api/auth/pin-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.20' },
        body: badPayload,
      })
    );
    expect(res2.status).toBe(429);
  });
});
