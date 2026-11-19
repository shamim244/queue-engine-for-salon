import { describe, it, expect } from 'bun:test';
import { isAllowedOrigin } from '../src/security/cors-validator';
import { app } from '../index';

describe('Task 2: Subdomain-Safe CORS Validator & Security Headers', () => {
  it('2.1 should allow exact nexgentech.site apex domain', () => {
    expect(isAllowedOrigin('https://nexgentech.site')).toBe(true);
    expect(isAllowedOrigin('http://nexgentech.site')).toBe(true);
  });

  it('2.2 should allow all legitimate subdomains of nexgentech.site', () => {
    expect(isAllowedOrigin('https://web.nexgentech.site')).toBe(true);
    expect(isAllowedOrigin('https://app.nexgentech.site')).toBe(true);
    expect(isAllowedOrigin('https://tv.nexgentech.site')).toBe(true);
    expect(isAllowedOrigin('https://api.nexgentech.site')).toBe(true);
    expect(isAllowedOrigin('https://staging.test.nexgentech.site')).toBe(true);
    expect(isAllowedOrigin('https://web.nexgentech.site:3000')).toBe(true);
  });

  it('2.3 should STRICTLY REJECT evil lookalikes and query string bypasses', () => {
    // Malicious prefixes/suffixes that previously bypassed loose .includes()
    expect(isAllowedOrigin('https://evil-nexgentech.site')).toBe(false);
    expect(isAllowedOrigin('https://nexgentech.site.attacker.com')).toBe(false);
    expect(isAllowedOrigin('https://attacker.com/?q=nexgentech.site')).toBe(false);
    expect(isAllowedOrigin('https://fake-nexgentech.site/foo')).toBe(false);
    expect(isAllowedOrigin('https://notnexgentech.site')).toBe(false);
  });

  it('2.4 should allow local development origins and null/undefined (same-origin/mobile)', () => {
    expect(isAllowedOrigin(null)).toBe(true);
    expect(isAllowedOrigin(undefined)).toBe(true);
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedOrigin('http://localhost:3001')).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:3000')).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:3001')).toBe(true);
    // Local network / mobile private IP addresses
    expect(isAllowedOrigin('http://192.168.1.50:3000')).toBe(true);
    expect(isAllowedOrigin('http://192.168.0.101:3001')).toBe(true);
    expect(isAllowedOrigin('http://10.0.0.5:3000')).toBe(true);
    expect(isAllowedOrigin('http://172.20.10.2:3000')).toBe(true);
    expect(isAllowedOrigin('http://100.85.12.3:3000')).toBe(true);
    expect(isAllowedOrigin('http://[::1]:3000')).toBe(true);
    // Malicious IP lookalikes
    expect(isAllowedOrigin('http://evil-192.168.1.50')).toBe(false);
    expect(isAllowedOrigin('http://192.168.1.50.attacker.com')).toBe(false);
  });

  it('2.5 should dynamically allow admin-registered custom origins', () => {
    const customOrigins = ['https://partner-salon.com', 'https://kiosk.aura.in'];
    expect(isAllowedOrigin('https://partner-salon.com', customOrigins)).toBe(true);
    expect(isAllowedOrigin('https://kiosk.aura.in', customOrigins)).toBe(true);
    expect(isAllowedOrigin('https://unregistered-domain.com', customOrigins)).toBe(false);
  });

  it('2.6 should emit standard HTTP security headers on API responses', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })
    );

    expect(res.status).toBe(200);
    const headers = res.headers;
    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(headers.get('x-xss-protection')).toBe('1; mode=block');
    expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  });

  it('2.7 should accept CORS preflight OPTIONS requests from mobile IP with custom headers', async () => {
    const res = await app.handle(
      new Request('http://localhost:3001/api/health', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://192.168.1.50:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization, x-partner-id',
        },
      })
    );

    expect(res.status).toBe(204);
    const headers = res.headers;
    expect(headers.get('access-control-allow-origin')).toBe('http://192.168.1.50:3000');
    expect(headers.get('access-control-allow-credentials')).toBe('true');
  });
});
