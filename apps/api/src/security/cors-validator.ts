import { config } from '../config';

const configuredOrigins = new Set([
  'https://web.nexgentech.site',
  'http://web.nexgentech.site',
  'https://nexgentech.site',
  'http://nexgentech.site',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  ...(config.cors?.allowedOrigins || []),
]);

// Strict anchored regex for nexgentech.site and all its subdomains (*.nexgentech.site) with optional port
const NEXGENTECH_SUBDOMAIN_REGEX = /^https?:\/\/([a-zA-Z0-9-]+\.)*nexgentech\.site(:\d+)?$/i;
const LOCALHOST_REGEX = /^https?:\/\/localhost(:\d+)?$/i;
const LOOPBACK_REGEX = /^https?:\/\/127\.0\.0\.1(:\d+)?$/i;

export function isAllowedOrigin(
  origin: string | null | undefined,
  customOrigins?: string[]
): boolean {
  if (!origin) return true; // Same-origin, direct CLI/curl, or native mobile client
  const clean = origin.trim().replace(/\/+$/, '');

  // 0. Wildcard allow-all (development / flexible staging)
  if (configuredOrigins.has('*') || (config.cors?.allowedOrigins || []).includes('*')) return true;

  // 1. Check statically configured origins
  if (configuredOrigins.has(clean)) return true;

  // 2. Check dynamic admin-registered custom origins
  if (customOrigins && customOrigins.length > 0) {
    if (customOrigins.some(c => c.trim().replace(/\/+$/, '') === clean)) return true;
  }

  // 3. Strict regex check for nexgentech.site and all subdomains (*.nexgentech.site)
  if (NEXGENTECH_SUBDOMAIN_REGEX.test(clean)) return true;

  // 4. Localhost and Loopback testing origins
  if (LOCALHOST_REGEX.test(clean) || LOOPBACK_REGEX.test(clean)) return true;

  return false;
}
