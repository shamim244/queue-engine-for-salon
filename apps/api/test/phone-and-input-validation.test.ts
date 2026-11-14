import { describe, it, expect } from 'bun:test';
import { parseAndValidateMobile, getSupportedCountryCodes } from '../src/security/phone-validator';
import { app } from '../index';

describe('Task 4: Standardized 10-Digit Mobile Phone Engine & Multi-Country Support', () => {
  it('4.1 should return supported country codes including India and international countries', () => {
    const list = getSupportedCountryCodes();
    expect(list.length).toBeGreaterThanOrEqual(5);
    const codes = list.map(c => c.code);
    expect(codes).toContain('+91'); // India
    expect(codes).toContain('+1');  // USA / Canada
    expect(codes).toContain('+44'); // UK
    expect(codes).toContain('+971'); // UAE
    expect(codes).toContain('+65'); // Singapore
  });

  it('4.2 should validate raw 10-digit Indian numbers defaulting to +91', () => {
    const res = parseAndValidateMobile('9876543210');
    expect(res.isValid).toBe(true);
    expect(res.countryCode).toBe('+91');
    expect(res.nationalNumber).toBe('9876543210');
    expect(res.normalizedPhone).toBe('+919876543210');
  });

  it('4.3 should handle numbers with spaces, dashes, or leading 0', () => {
    const withSpaces = parseAndValidateMobile('  98765 43210  ');
    expect(withSpaces.isValid).toBe(true);
    expect(withSpaces.nationalNumber).toBe('9876543210');
    expect(withSpaces.normalizedPhone).toBe('+919876543210');

    const withDashes = parseAndValidateMobile('+91-98765-43210');
    expect(withDashes.isValid).toBe(true);
    expect(withDashes.countryCode).toBe('+91');
    expect(withDashes.nationalNumber).toBe('9876543210');

    const withLeadingZero = parseAndValidateMobile('09876543210');
    expect(withLeadingZero.isValid).toBe(true);
    expect(withLeadingZero.nationalNumber).toBe('9876543210');
    expect(withLeadingZero.normalizedPhone).toBe('+919876543210');
  });

  it('4.4 should support international numbers with 10-digit national format', () => {
    // US number: +1 followed by 10 digits
    const usNum = parseAndValidateMobile('+1 2025550143');
    expect(usNum.isValid).toBe(true);
    expect(usNum.countryCode).toBe('+1');
    expect(usNum.nationalNumber).toBe('2025550143');
    expect(usNum.normalizedPhone).toBe('+12025550143');

    // UAE number: +971 followed by 9-10 digits, or custom preferred code
    const uaeNum = parseAndValidateMobile('5012345678', '+971');
    expect(uaeNum.isValid).toBe(true);
    expect(uaeNum.countryCode).toBe('+971');
    expect(uaeNum.nationalNumber).toBe('5012345678');
    expect(uaeNum.normalizedPhone).toBe('+9715012345678');
  });

  it('4.5 should STRICTLY REJECT numbers that are not 10 digits', () => {
    // Too short (9 digits)
    const tooShort = parseAndValidateMobile('987654321');
    expect(tooShort.isValid).toBe(false);
    expect(tooShort.error).toContain('10 digits');

    // Too long (11 digits without country prefix)
    const tooLong = parseAndValidateMobile('987654321099');
    expect(tooLong.isValid).toBe(false);
    expect(tooLong.error).toContain('10 digits');

    // Non-numeric
    const nonNumeric = parseAndValidateMobile('9876abc210');
    expect(nonNumeric.isValid).toBe(false);
  });

  it('4.6 should reject oversized customerName in checkin endpoint (> 80 characters)', async () => {
    const hugeName = 'A'.repeat(120);
    const res = await app.handle(
      new Request('http://localhost:3000/api/queue/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonSlug: 'aura-salon',
          customerName: hugeName,
          customerPhone: '9876543210',
          serviceId: 'srv-haircut',
        }),
      })
    );

    // Should fail schema validation (422 or 400)
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
