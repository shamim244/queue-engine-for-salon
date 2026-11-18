import { isMySqlConnected, getDb } from '../db/mysql';
import { memoryStore } from '../db/repositories/store';
import { authService } from '../auth/auth-service';

export interface UniquenessCheckResult {
  available: boolean;
  value: string;
  collisionType?: 'SALON' | 'ORGANIZATION' | 'USER' | 'PARTNER' | 'COUPON' | 'CONSUMER' | 'RESERVED' | 'STAFF' | 'SALON_OWNER' | 'EMAIL';
  reason?: string;
  suggestions: string[];
}

export const RESERVED_SLUGS = new Set([
  'api', 'admin', 'partner', 'owner', 'staff', 'tv', 'station', 'queue',
  'book', 'login', 'register', 'auth', 'system', 'terms', 'privacy',
  'settings', 'dashboard', 'me', 'salon', 'salons', 'explore', 'onboard',
  'help', 'support', 'test', 'demo', 'checkout', 'billing', 'wallet'
]);

export const RESERVED_USERNAMES = new Set([
  'admin', 'superadmin', 'system', 'support', 'owner', 'staff', 'barber',
  'root', 'api', 'help', 'queue', 'salon', 'engine', 'test', 'demo',
  'guest', 'user', 'moderator', 'billing', 'partner', 'stylist'
]);

export const RESERVED_REFERRAL_CODES = new Set([
  'ADMIN', 'SUPERADMIN', 'API', 'QUEUE', 'SALON', 'SUPPORT', 'HELP',
  'SYSTEM', 'ROOT', 'NULL', 'UNDEFINED', 'TEST', 'FREE', 'PROMO',
  'OFFER', 'DISCOUNT', 'ENGINE', 'PARTNER', 'STAFF', 'OWNER', 'VIP',
  'WELCOME', 'CASHBACK', 'REWARD', 'REFERRAL', 'BONUS'
]);

export class UniquenessService {
  /**
   * 1. Check Salon / Organization Slug Availability
   */
  async checkSlug(rawSlug: string): Promise<UniquenessCheckResult> {
    const slug = (rawSlug || '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

    if (!slug || slug.length < 2) {
      return {
        available: false,
        value: slug,
        reason: 'Slug must be at least 2 characters long.',
        suggestions: [],
      };
    }

    if (RESERVED_SLUGS.has(slug)) {
      return {
        available: false,
        value: slug,
        collisionType: 'RESERVED',
        reason: `URL handle '/s/${slug}' is reserved by the system.`,
        suggestions: [`${slug}-salon`, `${slug}-hub`, `${slug}-bhopal`],
      };
    }

    let isTaken = false;
    let collisionType: 'SALON' | 'ORGANIZATION' = 'SALON';

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [salonRows]: any = await db.query('SELECT id FROM salons WHERE slug = ? LIMIT 1', [slug]);
        if (salonRows && salonRows.length > 0) {
          isTaken = true;
          collisionType = 'SALON';
        } else {
          const [orgRows]: any = await db.query('SELECT id FROM organizations WHERE slug = ? LIMIT 1', [slug]);
          if (orgRows && orgRows.length > 0) {
            isTaken = true;
            collisionType = 'ORGANIZATION';
          }
        }
      } catch (err) {
        console.error('MySQL checkSlug error:', err);
      }
    }

    if (!isTaken) {
      for (const s of memoryStore.salons.values()) {
        if (s.slug === slug) {
          isTaken = true;
          collisionType = 'SALON';
          break;
        }
      }
    }

    if (!isTaken) {
      for (const o of memoryStore.organizations.values()) {
        if (o.slug === slug) {
          isTaken = true;
          collisionType = 'ORGANIZATION';
          break;
        }
      }
    }

    if (isTaken) {
      return {
        available: false,
        value: slug,
        collisionType,
        reason: `Salon handle '/s/${slug}' is already taken by another ${collisionType === 'SALON' ? 'salon' : 'organization'}.`,
        suggestions: [`${slug}-salon`, `${slug}-india`, `${slug}-${Math.floor(10 + Math.random() * 89)}`],
      };
    }

    return {
      available: true,
      value: slug,
      suggestions: [],
    };
  }

  /**
   * 2. Check Owner / Staff Username Availability
   */
  async checkUsername(rawUsername: string): Promise<UniquenessCheckResult> {
    const username = (rawUsername || '').toLowerCase().trim().replace(/[^a-z0-9_]/g, '');

    if (!username || username.length < 3) {
      return {
        available: false,
        value: username,
        reason: 'Username must be at least 3 characters long and alphanumeric.',
        suggestions: [],
      };
    }

    if (RESERVED_USERNAMES.has(username)) {
      return {
        available: false,
        value: username,
        collisionType: 'RESERVED',
        reason: `Username '@${username}' is reserved by the system.`,
        suggestions: [`${username}_owner`, `${username}_salon`, `${username}_vip`],
      };
    }

    let isTaken = false;

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows]: any = await db.query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
        if (rows && rows.length > 0) {
          isTaken = true;
        }
      } catch (err) {
        console.error('MySQL checkUsername error:', err);
      }
    }

    if (!isTaken) {
      const memoryUser = await authService.getUserByUsername(username);
      if (memoryUser) isTaken = true;
    }

    if (isTaken) {
      return {
        available: false,
        value: username,
        collisionType: 'USER',
        reason: `Username '@${username}' is already taken.`,
        suggestions: [
          `${username}_owner`,
          `${username}_salon`,
          `${username}_${Math.floor(100 + Math.random() * 899)}`,
        ],
      };
    }

    return {
      available: true,
      value: username,
      suggestions: [],
    };
  }

  /**
   * 2b. Check User Email Uniqueness & Format Availability
   * Mandates unique email addresses as the Tier-1 Primary Login Credential
   */
  async checkEmail(rawEmail: string): Promise<UniquenessCheckResult> {
    const email = (rawEmail || '').toLowerCase().trim();

    if (!email) {
      return {
        available: false,
        value: email,
        reason: 'Email address is required.',
        suggestions: [],
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        available: false,
        value: email,
        reason: 'Please enter a valid email address (e.g. name@domain.com).',
        suggestions: [],
      };
    }

    let isTaken = false;

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows]: any = await db.query('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [email]);
        if (rows && rows.length > 0) {
          isTaken = true;
        }
      } catch (err) {
        console.error('MySQL checkEmail error:', err);
      }
    }

    if (!isTaken) {
      const memoryUser = await authService.getUserByEmail(email);
      if (memoryUser) isTaken = true;
    }

    if (isTaken) {
      return {
        available: false,
        value: email,
        collisionType: 'EMAIL',
        reason: 'This email address is already registered to another account.',
        suggestions: [],
      };
    }

    return {
      available: true,
      value: email,
      suggestions: [],
    };
  }

  /**
   * 3. Cross-Ecosystem Referral Code Uniqueness & Collision Guard
   * Prevents collisions across: Partners, Coupons, Salons, Organizations, Staff, Users, and Consumer Referrals
   */
  async checkReferralCode(rawCode: string, excludePartnerId?: string): Promise<UniquenessCheckResult> {
    const code = (rawCode || '').toUpperCase().trim();

    if (!code || code.length < 3 || code.length > 20) {
      return {
        available: false,
        value: code,
        reason: 'Referral code must be between 3 and 20 characters.',
        suggestions: [],
      };
    }

    const regex = /^[A-Z0-9_-]{3,20}$/;
    if (!regex.test(code)) {
      return {
        available: false,
        value: code,
        reason: 'Referral code can only contain uppercase letters, numbers, hyphens or underscores.',
        suggestions: [],
      };
    }

    if (RESERVED_REFERRAL_CODES.has(code)) {
      return {
        available: false,
        value: code,
        collisionType: 'RESERVED',
        reason: `Referral code '${code}' is reserved by the system.`,
        suggestions: [`${code}_VIP`, `${code}10`, `${code}_PRO`],
      };
    }

    if (isMySqlConnected) {
      try {
        const db = getDb();

        // A. Check Partner referral codes
        const [partnerRows]: any = await db.query(
          'SELECT id, referral_code FROM partners WHERE UPPER(referral_code) = ? LIMIT 1',
          [code]
        );
        if (partnerRows && partnerRows.length > 0) {
          const matched = partnerRows[0];
          if (!excludePartnerId || matched.id !== excludePartnerId) {
            return {
              available: false,
              value: code,
              collisionType: 'PARTNER',
              reason: `Referral code '${code}' is already taken by another partner (Growth Partner).`,
              suggestions: [`${code}_VIP`, `${code}10`, `${code}_PRO`],
            };
          }
        }

        // B. Check Coupons & Promo codes
        const [couponRows]: any = await db.query(
          'SELECT id, code FROM coupons WHERE UPPER(code) = ? LIMIT 1',
          [code]
        );
        if (couponRows && couponRows.length > 0) {
          return {
            available: false,
            value: code,
            collisionType: 'COUPON',
            reason: `Referral code '${code}' collides with an active system discount coupon.`,
            suggestions: [`${code}_PARTNER`, `${code}10`, `${code}_REF`],
          };
        }

        // C. Check Salons & Organizations (B2B Salon Referrals & Handles)
        const [salonRows]: any = await db.query(
          'SELECT id, slug FROM salons WHERE UPPER(slug) = ? OR UPPER(CONCAT("REF_", slug)) = ? LIMIT 1',
          [code, code]
        );
        if (salonRows && salonRows.length > 0) {
          return {
            available: false,
            value: code,
            collisionType: 'SALON_OWNER',
            reason: `Referral code '${code}' collides with a registered Salon identifier or referral code.`,
            suggestions: [`${code}_VIP`, `${code}10`, `${code}_OFFICIAL`],
          };
        }

        const [orgRows]: any = await db.query(
          'SELECT id, slug FROM organizations WHERE UPPER(slug) = ? OR UPPER(CONCAT("REF_", slug)) = ? LIMIT 1',
          [code, code]
        );
        if (orgRows && orgRows.length > 0) {
          return {
            available: false,
            value: code,
            collisionType: 'ORGANIZATION',
            reason: `Referral code '${code}' collides with a Salon Organization identifier.`,
            suggestions: [`${code}_VIP`, `${code}10`, `${code}_OFFICIAL`],
          };
        }

        // D. Check Staff / Stylists
        const [stylistRows]: any = await db.query(
          'SELECT id, username FROM stylists WHERE UPPER(username) = ? LIMIT 1',
          [code]
        );
        if (stylistRows && stylistRows.length > 0) {
          return {
            available: false,
            value: code,
            collisionType: 'STAFF',
            reason: `Referral code '${code}' collides with a Salon Staff member username.`,
            suggestions: [`${code}_VIP`, `${code}10`, `${code}_REF`],
          };
        }

        // E. Check Users (Salon Owners, Staff, Admins)
        const [userRows]: any = await db.query(
          'SELECT id, username, role FROM users WHERE UPPER(username) = ? LIMIT 1',
          [code]
        );
        if (userRows && userRows.length > 0) {
          const u = userRows[0];
          const isStaff = u.role === 'STAFF' || u.role === 'STYLIST';
          return {
            available: false,
            value: code,
            collisionType: isStaff ? 'STAFF' : 'USER',
            reason: `Referral code '${code}' collides with an existing account username (${u.role}).`,
            suggestions: [`${code}_VIP`, `${code}10`, `${code}_PARTNER`],
          };
        }

        // F. Check Consumer Referral codes
        const [refRows]: any = await db.query(
          'SELECT id, referrer_code FROM referral_attributions WHERE UPPER(referrer_code) = ? OR UPPER(CONCAT("REF_", referrer_phone)) = ? LIMIT 1',
          [code, code]
        );
        if (refRows && refRows.length > 0) {
          return {
            available: false,
            value: code,
            collisionType: 'CONSUMER',
            reason: `Referral code '${code}' collides with an existing customer referral code.`,
            suggestions: [`${code}_PRO`, `${code}_VIP`, `${code}20`],
          };
        }
      } catch (err) {
        console.error('MySQL checkReferralCode error:', err);
      }
    }

    // In-Memory Fallbacks
    for (const p of memoryStore.partners.values()) {
      if (p.referralCode?.toUpperCase() === code) {
        if (!excludePartnerId || p.id !== excludePartnerId) {
          return {
            available: false,
            value: code,
            collisionType: 'PARTNER',
            reason: `Referral code '${code}' is already taken by another partner (Growth Partner).`,
            suggestions: [`${code}_VIP`, `${code}10`, `${code}_PRO`],
          };
        }
      }
    }

    for (const c of memoryStore.coupons.values()) {
      if (c.code?.toUpperCase() === code) {
        return {
          available: false,
          value: code,
          collisionType: 'COUPON',
          reason: `Referral code '${code}' collides with an active system discount coupon.`,
          suggestions: [`${code}_PARTNER`, `${code}10`, `${code}_REF`],
        };
      }
    }

    for (const s of memoryStore.salons.values()) {
      if (s.slug?.toUpperCase() === code || `REF_${s.slug?.toUpperCase()}` === code) {
        return {
          available: false,
          value: code,
          collisionType: 'SALON_OWNER',
          reason: `Referral code '${code}' collides with a registered Salon identifier or referral code.`,
          suggestions: [`${code}_VIP`, `${code}10`, `${code}_OFFICIAL`],
        };
      }
    }

    for (const o of memoryStore.organizations.values()) {
      if (o.slug?.toUpperCase() === code || `REF_${o.slug?.toUpperCase()}` === code) {
        return {
          available: false,
          value: code,
          collisionType: 'ORGANIZATION',
          reason: `Referral code '${code}' collides with a Salon Organization identifier.`,
          suggestions: [`${code}_VIP`, `${code}10`, `${code}_OFFICIAL`],
        };
      }
    }

    for (const st of memoryStore.stylists.values()) {
      if ((st as any).username?.toUpperCase() === code) {
        return {
          available: false,
          value: code,
          collisionType: 'STAFF',
          reason: `Referral code '${code}' collides with a Salon Staff member username.`,
          suggestions: [`${code}_VIP`, `${code}10`, `${code}_REF`],
        };
      }
    }

    const userCandidate = await authService.getUserByUsername(code);
    if (userCandidate) {
      const isStaff = userCandidate.role === 'STAFF' || (userCandidate.role as string) === 'STYLIST';
      return {
        available: false,
        value: code,
        collisionType: isStaff ? 'STAFF' : 'USER',
        reason: `Referral code '${code}' collides with an existing account username (${userCandidate.role}).`,
        suggestions: [`${code}_VIP`, `${code}10`, `${code}_PARTNER`],
      };
    }

    for (const r of memoryStore.referralAttributions.values()) {
      if (r.referrerCode?.toUpperCase() === code || `REF_${(r as any).referrerPhone}`.toUpperCase() === code) {
        return {
          available: false,
          value: code,
          collisionType: 'CONSUMER',
          reason: `Referral code '${code}' collides with an existing customer referral code.`,
          suggestions: [`${code}_PRO`, `${code}_VIP`, `${code}20`],
        };
      }
    }

    return {
      available: true,
      value: code,
      suggestions: [],
    };
  }
}

export const uniquenessService = new UniquenessService();
