import type { EventEnvelope } from './types';

const PROTOTYPE_POLLUTION_REGEX = /["'](?:__proto__|constructor|prototype|\\u005f\\u005fproto\\u005f\\u005f|\\u0070rototype)["']\s*:/i;
const SAFE_ID_REGEX = /^[a-zA-Z0-9_\-\.:@~]+$/;
const SAFE_EVENT_TYPE_REGEX = /^[a-zA-Z0-9_\-\.:]{3,64}$/;

/**
 * Scans a JSON string for prohibited prototype pollution injection keys.
 */
export function hasPrototypePollution(rawJson: string): boolean {
  if (!rawJson || typeof rawJson !== 'string') return false;
  return PROTOTYPE_POLLUTION_REGEX.test(rawJson);
}

/**
 * Deeply validates an object to ensure no prototype pollution keys or prototype chain tampering exist.
 */
export function deepContainsPollution(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;

  // Verify prototype chain is not tampered
  const proto = Object.getPrototypeOf(obj);
  if (proto !== null && proto !== Object.prototype && proto !== Array.prototype) {
    return true;
  }

  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return true;
    }
    if (typeof obj[key] === 'object' && deepContainsPollution(obj[key])) {
      return true;
    }
  }
  return false;
}

/**
 * Hardened JSON parser with active prototype-pollution defense.
 */
export function safeJsonParse<T = any>(raw: string): { success: boolean; data?: T; error?: string } {
  if (typeof raw !== 'string') {
    return { success: false, error: 'Payload must be a string' };
  }

  if (hasPrototypePollution(raw)) {
    return { success: false, error: 'Prototype pollution detected in payload' };
  }

  try {
    const data = JSON.parse(raw, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new Error('Prohibited property name encountered during parsing');
      }
      return value;
    });

    if (deepContainsPollution(data)) {
      return { success: false, error: 'Prototype pollution detected in payload structure' };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'JSON parsing error' };
  }
}

/**
 * Validates an incoming Pub/Sub event envelope before broadcasting.
 * Prevents arbitrary injection, malformed data, or spoofed timestamps.
 */
export function validateEnvelope(envelope: unknown): {
  valid: boolean;
  error?: string;
  envelope?: EventEnvelope;
} {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return { valid: false, error: 'Envelope must be a non-null object' };
  }

  const env = envelope as Record<string, any>;

  // 1. eventId
  if (typeof env.eventId !== 'string' || !env.eventId.trim() || env.eventId.length > 128) {
    return { valid: false, error: 'Invalid or missing eventId' };
  }
  if (!SAFE_ID_REGEX.test(env.eventId)) {
    return { valid: false, error: 'eventId contains prohibited characters' };
  }

  // 2. sourceInstanceId
  if (typeof env.sourceInstanceId !== 'string' || !env.sourceInstanceId.trim() || env.sourceInstanceId.length > 128) {
    return { valid: false, error: 'Invalid or missing sourceInstanceId' };
  }
  if (!SAFE_ID_REGEX.test(env.sourceInstanceId)) {
    return { valid: false, error: 'sourceInstanceId contains prohibited characters' };
  }

  // 3. timestamp (enforce clock skew guard: past 24h, future <= 5 minutes)
  const now = Date.now();
  if (typeof env.timestamp !== 'number' || !Number.isFinite(env.timestamp)) {
    return { valid: false, error: 'Invalid timestamp: must be a finite number' };
  }
  const minTimestamp = now - 24 * 3600 * 1000;
  const maxTimestamp = now + 5 * 60 * 1000;
  if (env.timestamp < minTimestamp || env.timestamp > maxTimestamp) {
    return { valid: false, error: `Invalid timestamp out of bounds (${env.timestamp})` };
  }

  // 4. salonId
  if (typeof env.salonId !== 'string' || !env.salonId.trim() || env.salonId.length > 128) {
    return { valid: false, error: 'Invalid or missing salonId' };
  }
  if (!SAFE_ID_REGEX.test(env.salonId)) {
    return { valid: false, error: 'salonId contains prohibited characters' };
  }

  // 5. alternateId (optional)
  if (env.alternateId !== undefined && env.alternateId !== null) {
    if (typeof env.alternateId !== 'string' || env.alternateId.length > 128) {
      return { valid: false, error: 'alternateId must be a string <= 128 characters' };
    }
    if (env.alternateId.trim() && !SAFE_ID_REGEX.test(env.alternateId)) {
      return { valid: false, error: 'alternateId contains prohibited characters' };
    }
  }

  // 6. event payload & event.type
  if (!env.event || typeof env.event !== 'object' || Array.isArray(env.event)) {
    return { valid: false, error: 'Inner event must be a non-null object' };
  }
  if (typeof env.event.type !== 'string' || !SAFE_EVENT_TYPE_REGEX.test(env.event.type)) {
    return { valid: false, error: 'event.type must be an uppercase alphanumeric identifier (3-64 chars)' };
  }

  return {
    valid: true,
    envelope: env as EventEnvelope,
  };
}

/**
 * Checks whether a connected client subscriber is authorized to receive
 * an event destined for targetSalonId and alternateId.
 * Strictly guarantees multi-tenant boundary isolation.
 */
export function isSalonAuthorized(
  clientSalonId: string,
  targetSalonId: string,
  alternateId?: string,
  aliasMap?: Map<string, Set<string>>
): boolean {
  if (!clientSalonId) return false;

  // Global & Admin superusers have cross-tenant visibility
  if (clientSalonId === 'GLOBAL' || clientSalonId === 'ADMIN') {
    return true;
  }

  // Direct tenant match
  if (clientSalonId === targetSalonId) {
    return true;
  }

  // Direct alternate / slug match
  if (alternateId && clientSalonId === alternateId) {
    return true;
  }

  // Alias map resolution with full bidirectional symmetry
  if (aliasMap) {
    const targetAliases = aliasMap.get(targetSalonId);
    if (targetAliases && targetAliases.has(clientSalonId)) {
      return true;
    }

    const clientAliases = aliasMap.get(clientSalonId);
    if (clientAliases && clientAliases.has(targetSalonId)) {
      return true;
    }

    if (alternateId) {
      const altAliases = aliasMap.get(alternateId);
      if (altAliases && altAliases.has(clientSalonId)) {
        return true;
      }
      if (clientAliases && clientAliases.has(alternateId)) {
        return true;
      }
    }
  }

  return false;
}
