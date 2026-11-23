import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../index';
import { repository, defaultPlatformSettings } from '../src/db/repository';
import { cacheService } from '../src/cache/cache.service';

describe('Public & Admin Landing Page Configuration API', () => {
  beforeEach(async () => {
    await cacheService.del('landing_page_config');
    repository.updatePlatformSettings({
      landingPageConfig: {
        activeTemplate: '2_5D_SCROLL',
        enabledSections: [
          'hero',
          'simulator',
          'tv_mirror',
          'upi_showcase',
          'roi_calculator',
          'pricing',
          'partner_banner',
          'faq',
        ],
        brandName: 'SalonView',
        tagline: 'Total Clarity. Effortless Operations.',
        heroBadge: '💈 The Real-Time Salon Operating Engine',
        heroHeadline: 'Turn Weekend Walk-Outs Into Daily Cash.',
        heroSubheadline: 'Zero-app QR waitlists, live TV lounge mirrors, and instant 0% fee UPI payouts.',
        heroCtaText: 'Start Free 14-Day Trial',
        pricingStarterMonthly: 699,
        pricingProMonthly: 1499,
        pricingEliteMonthly: 3499,
        partnerCommissionPct: 30,
        supportWhatsapp: '+919876543210',
        supportEmail: 'support@salonview.in',
        socialInstagram: 'salonviewapp',
        socialTwitter: 'salonviewapp',
        socialLinkedin: 'salonviewapp',
      },
    });
  });

  it('GET /api/public/landing-config returns 200 and dynamic landing configuration', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/public/landing-config', {
        method: 'GET',
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.brandName).toBe('SalonView');
    expect(body.data.activeTemplate).toBe('2_5D_SCROLL');
    expect(body.data.pricingStarterMonthly).toBe(699);
    expect(body.data.partnerCommissionPct).toBe(30);
  });

  it('POST /api/admin/settings updates landing config and invalidates cache', async () => {
    // 1. First fetch primes the cache
    const firstRes = await app.handle(
      new Request('http://localhost/api/public/landing-config')
    );
    const firstBody = await firstRes.json();
    expect(firstBody.data.heroHeadline).toBe('Turn Weekend Walk-Outs Into Daily Cash.');

    // 2. Admin updates the headline and active template
    const updateRes = await app.handle(
      new Request('http://localhost/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          landingPageConfig: {
            activeTemplate: 'BENTO_OBSIDIAN',
            brandName: 'SalonView Pro',
            tagline: 'Precision Queue Operations',
            heroBadge: '🚀 Next-Gen Salon OS',
            heroHeadline: 'Eliminate Wait Times Forever.',
            heroSubheadline: 'High-speed salon management.',
            heroCtaText: 'Join Now',
            pricingStarterMonthly: 799,
            pricingProMonthly: 1699,
            pricingEliteMonthly: 3999,
            partnerCommissionPct: 35,
            supportWhatsapp: '+919999988888',
            supportEmail: 'contact@salonview.in',
            socialInstagram: 'salonview',
            socialTwitter: 'salonview',
            socialLinkedin: 'salonview',
          },
        }),
      })
    );
    expect(updateRes.status).toBe(200);

    // 3. Next fetch immediately returns fresh data due to cache invalidation
    const freshRes = await app.handle(
      new Request('http://localhost/api/public/landing-config')
    );
    const freshBody = await freshRes.json();
    expect(freshBody.data.brandName).toBe('SalonView Pro');
    expect(freshBody.data.activeTemplate).toBe('BENTO_OBSIDIAN');
    expect(freshBody.data.heroHeadline).toBe('Eliminate Wait Times Forever.');
    expect(freshBody.data.pricingStarterMonthly).toBe(799);
  });
});
