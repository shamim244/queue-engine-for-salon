import { describe, it, expect } from 'bun:test';
import { generateUpiUri } from '../lib/utils';

describe('NPCI Dynamic UPI URI Generator Suite', () => {
  it('should generate valid NPCI standard UPI URI with 2-decimal amount and encoded params', () => {
    const uri = generateUpiUri({
      upiId: 'royal@upi',
      payeeName: 'Royal Salon',
      amount: 150,
      note: 'Ticket #101',
    });

    expect(uri).toBe('upi://pay?pa=royal%40upi&pn=Royal%20Salon&am=150.00&cu=INR&tn=Ticket%20%23101');
  });

  it('should handle special characters in salon name and ticket note cleanly', () => {
    const uri = generateUpiUri({
      upiId: 'rameshbarber@upi',
      payeeName: 'Ramesh Traditional & Spa',
      amount: 80.5,
      note: 'Haircut (बाल कटिंग)',
    });

    expect(uri).toContain('pa=rameshbarber%40upi');
    expect(uri).toContain('am=80.50');
    expect(uri).toContain('cu=INR');
  });

  it('should fallback gracefully if note is omitted', () => {
    const uri = generateUpiUri({
      upiId: 'salon@okaxis',
      payeeName: 'Aura Spa',
      amount: 500,
    });

    expect(uri).toContain('pa=salon%40okaxis');
    expect(uri).toContain('am=500.00');
    expect(uri).toContain('cu=INR');
    expect(uri).toContain('tn=Salon%20Service');
  });
});
