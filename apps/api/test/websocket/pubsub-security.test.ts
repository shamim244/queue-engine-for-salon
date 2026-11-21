import { describe, it, expect } from 'bun:test';
import {
  safeJsonParse,
  validateEnvelope,
  isSalonAuthorized,
  hasPrototypePollution,
  deepContainsPollution,
} from '../../src/websocket/security';

describe('WebSocket Pub/Sub Security & Multi-Tenant Boundary Suite', () => {
  describe('1. Prototype Pollution Prevention', () => {
    it('should detect and reject __proto__ injection in JSON strings', () => {
      const maliciousJson = '{"__proto__": {"admin": true}, "salonId": "salon-1"}';
      expect(hasPrototypePollution(maliciousJson)).toBe(true);

      const parsed = safeJsonParse(maliciousJson);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain('Prototype pollution');
    });

    it('should detect constructor and prototype injection', () => {
      const payload1 = '{"constructor": {"prototype": {"polluted": true}}}';
      expect(hasPrototypePollution(payload1)).toBe(true);
      expect(safeJsonParse(payload1).success).toBe(false);

      const payload2 = '{"prototype": {"isAdmin": true}}';
      expect(hasPrototypePollution(payload2)).toBe(true);
      expect(safeJsonParse(payload2).success).toBe(false);

      // Unicode escaped proto injection
      const payload3 = '{"\\u005f\\u005fproto\\u005f\\u005f": {"admin": true}}';
      expect(hasPrototypePollution(payload3)).toBe(true);
      expect(safeJsonParse(payload3).success).toBe(false);
    });

    it('should detect objects with tampered prototype chains', () => {
      const suspicious = Object.setPrototypeOf({ normalProp: 123 }, { evil: true });
      expect(deepContainsPollution(suspicious)).toBe(true);

      const standardObj = { normalProp: 123 };
      expect(deepContainsPollution(standardObj)).toBe(false);
    });

    it('should allow valid, benign JSON payloads', () => {
      const benignJson = JSON.stringify({
        eventId: 'evt_12345',
        sourceInstanceId: 'inst_node_1',
        timestamp: Date.now(),
        salonId: 'salon-rural-01',
        event: {
          type: 'TICKET_CREATED',
          salonId: 'salon-rural-01',
          ticket: { id: 't-101', ticketNumber: 101 },
        },
      });

      expect(hasPrototypePollution(benignJson)).toBe(false);
      const parsed = safeJsonParse(benignJson);
      expect(parsed.success).toBe(true);
      expect(parsed.data).toBeDefined();
    });
  });

  describe('2. Event Envelope Validation', () => {
    const validEnvelope = {
      eventId: 'evt_abc123456789',
      sourceInstanceId: 'inst_worker_1',
      timestamp: Date.now(),
      salonId: 'salon-rural-01',
      alternateId: 'ramesh-barber',
      event: {
        type: 'TICKET_CREATED',
        salonId: 'salon-rural-01',
        ticketNumber: 101,
      },
    };

    it('should accept a well-formed envelope', () => {
      const res = validateEnvelope(validEnvelope);
      expect(res.valid).toBe(true);
      expect(res.envelope).toBeDefined();
      expect(res.envelope?.eventId).toBe(validEnvelope.eventId);
    });

    it('should reject envelopes with missing or empty eventId', () => {
      const res1 = validateEnvelope({ ...validEnvelope, eventId: '' });
      expect(res1.valid).toBe(false);
      expect(res1.error).toContain('eventId');

      const res2 = validateEnvelope({ ...validEnvelope, eventId: undefined });
      expect(res2.valid).toBe(false);
    });

    it('should reject envelopes with missing or invalid sourceInstanceId', () => {
      const res = validateEnvelope({ ...validEnvelope, sourceInstanceId: '' });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('sourceInstanceId');
    });

    it('should reject envelopes with invalid or extreme timestamp (clock drift guard)', () => {
      // 48 hours ago
      const tooOld = validateEnvelope({
        ...validEnvelope,
        timestamp: Date.now() - 48 * 3600 * 1000,
      });
      expect(tooOld.valid).toBe(false);
      expect(tooOld.error).toContain('timestamp');

      // 1 hour in the future
      const future = validateEnvelope({
        ...validEnvelope,
        timestamp: Date.now() + 3600 * 1000,
      });
      expect(future.valid).toBe(false);
      expect(future.error).toContain('timestamp');
    });

    it('should reject envelopes with malformed or unsafe salonId', () => {
      const res1 = validateEnvelope({ ...validEnvelope, salonId: '' });
      expect(res1.valid).toBe(false);

      const res2 = validateEnvelope({ ...validEnvelope, salonId: 'salon; DROP TABLE users;' });
      expect(res2.valid).toBe(false);
      expect(res2.error).toContain('salonId');
    });

    it('should reject envelopes missing an inner event object or type', () => {
      const res1 = validateEnvelope({ ...validEnvelope, event: null });
      expect(res1.valid).toBe(false);

      const res2 = validateEnvelope({ ...validEnvelope, event: {} });
      expect(res2.valid).toBe(false);
      expect(res2.error).toContain('event.type');

      const res3 = validateEnvelope({ ...validEnvelope, event: { type: 'INVALID TYPE WITH SPACES' } });
      expect(res3.valid).toBe(false);
    });
  });

  describe('3. Multi-Tenant Boundary Isolation', () => {
    const aliasMap = new Map<string, Set<string>>([
      ['salon-rural-01', new Set(['salon-rural-01', 'ramesh-barber'])],
      ['ramesh-barber', new Set(['salon-rural-01', 'ramesh-barber'])],
      ['salon-modern-02', new Set(['salon-modern-02', 'aura-salon'])],
      ['aura-salon', new Set(['salon-modern-02', 'aura-salon'])],
    ]);

    it('should authorize client subscribed to the exact same salonId', () => {
      expect(isSalonAuthorized('salon-rural-01', 'salon-rural-01', undefined, aliasMap)).toBe(true);
    });

    it('should authorize client subscribed to recognized salon slug alias', () => {
      expect(isSalonAuthorized('ramesh-barber', 'salon-rural-01', 'ramesh-barber', aliasMap)).toBe(true);
      expect(isSalonAuthorized('salon-rural-01', 'salon-rural-01', 'ramesh-barber', aliasMap)).toBe(true);
    });

    it('should strictly BLOCK client from a different salon (Multi-Tenant Isolation)', () => {
      // Client belongs to aura-salon / salon-modern-02; Target is salon-rural-01
      expect(isSalonAuthorized('salon-modern-02', 'salon-rural-01', undefined, aliasMap)).toBe(false);
      expect(isSalonAuthorized('aura-salon', 'salon-rural-01', 'ramesh-barber', aliasMap)).toBe(false);
      expect(isSalonAuthorized('some-random-salon', 'salon-rural-01', undefined, aliasMap)).toBe(false);
    });

    it('should authorize GLOBAL and ADMIN clients for cross-tenant governance', () => {
      expect(isSalonAuthorized('GLOBAL', 'salon-rural-01', undefined, aliasMap)).toBe(true);
      expect(isSalonAuthorized('ADMIN', 'salon-rural-01', undefined, aliasMap)).toBe(true);
      expect(isSalonAuthorized('GLOBAL', 'salon-modern-02', undefined, aliasMap)).toBe(true);
    });

    it('should authorize even with asymmetric alias registration', () => {
      // Only target -> alias is mapped, not alias -> target
      const oneWayMap = new Map<string, Set<string>>([
        ['salon-x', new Set(['salon-x-slug'])],
      ]);
      expect(isSalonAuthorized('salon-x-slug', 'salon-x', undefined, oneWayMap)).toBe(true);

      // Only alias -> target is mapped
      const reverseMap = new Map<string, Set<string>>([
        ['salon-x-slug', new Set(['salon-x'])],
      ]);
      expect(isSalonAuthorized('salon-x-slug', 'salon-x', undefined, reverseMap)).toBe(true);
    });
  });
});
