import { describe, it, expect } from 'bun:test';
import fs from 'fs';
import path from 'path';

// Load security-utils script in Node/Bun environment
const securityUtilsPath = path.resolve(import.meta.dir, '../src/public/security-utils.js');

describe('Task 5: Portal Input Boundaries & Stored XSS Neutralization', () => {
  it('5.1 security-utils.js must exist and define escapeHtml & country codes', () => {
    expect(fs.existsSync(securityUtilsPath)).toBe(true);
    const content = fs.readFileSync(securityUtilsPath, 'utf-8');
    expect(content).toContain('function escapeHtml');
    expect(content).toContain('SUPPORTED_COUNTRY_CODES');
  });

  it('5.2 escapeHtml should properly sanitize dangerous XSS payloads', () => {
    // Dynamic import of security-utils or evaluation
    const script = fs.readFileSync(securityUtilsPath, 'utf-8');
    const fn = new Function(`${script}; return { escapeHtml, sanitize10DigitMobile };`)();
    const escapeHtml = fn.escapeHtml;

    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(escapeHtml("Robert'); DROP TABLE users;--")).toBe('Robert&#39;); DROP TABLE users;--');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('5.3 static portal HTML templates must reference security-utils.js', () => {
    const publicDir = path.resolve(import.meta.dir, '../src/public');
    const portals = ['tv.html', 'desk.html', 'barber.html', 'staff.html', 'customer.html'];

    for (const file of portals) {
      const htmlPath = path.join(publicDir, file);
      expect(fs.existsSync(htmlPath)).toBe(true);
      const content = fs.readFileSync(htmlPath, 'utf-8');
      expect(content).toContain('security-utils.js');
    }
  });

  it('5.4 customer and desk inputs must enforce maxlength boundaries', () => {
    const publicDir = path.resolve(import.meta.dir, '../src/public');
    const customerHtml = fs.readFileSync(path.join(publicDir, 'customer.html'), 'utf-8');
    const deskHtml = fs.readFileSync(path.join(publicDir, 'desk.html'), 'utf-8');

    // Name inputs must have maxlength
    expect(customerHtml).toContain('maxlength=');
    expect(deskHtml).toContain('maxlength=');
  });
});
