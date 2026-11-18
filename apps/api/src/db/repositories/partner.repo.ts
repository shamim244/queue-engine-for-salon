import { isMySqlConnected, getDb } from '../mysql';
import type {
  Partner,
  PartnerPersona,
  PartnerStatus,
  PartnerCommissionModel,
  PartnerDurationType,
  PartnerAccountType,
  PartnerAttributionSource,
  PartnerQualificationStatus,
  PartnerSalonAttribution,
  PartnerLedgerTransactionType,
  PartnerBalanceType,
  PartnerWalletLedgerEntry,
  PartnerPayoutMethod,
  PartnerPayoutStatus,
  PartnerPayoutRequest,
  PartnerNotification,
  PartnerNotificationType,
  PartnerWalletBalance,
  PartnerProgramSettings,
  PartnerMarketingContent,
} from '../../engine/types';
import { memoryStore, toMySqlDatetime, defaultPartnerProgramSettings, defaultPartnerMarketingContent } from './store';
import { calculatePartnerCommission } from '../../engine/partner-commission';
import { uniquenessService } from '../../security/uniqueness.service';

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${rand}${time}`;
}

export function sanitizeReferralCode(name: string): string {
  const strippedTitle = name.replace(/^(DR|MR|MRS|MS|PROF)\.?\s+/i, '');
  const normalized = strippedTitle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return normalized || 'PARTNER' + Math.floor(1000 + Math.random() * 9000);
}

export function sanitizePartner(partner: Partner): Partner {
  const hasPassword = Boolean(partner.passwordHash);
  const copy: any = { ...partner, hasPassword };
  delete copy.passwordHash;
  return copy;
}

function mapRowToPartner(r: any): Partner {
  return {
    id: r.id,
    userId: r.user_id || null,
    fullName: r.full_name,
    phone: r.phone,
    email: r.email || null,
    passwordHash: r.password_hash || null,
    hasPassword: Boolean(r.password_hash),
    city: r.city,
    persona: r.persona as PartnerPersona,
    referralCode: r.referral_code,
    status: r.status as PartnerStatus,
    commissionModel: r.commission_model as PartnerCommissionModel,
    commissionPercent: Number(r.commission_percent),
    bountyAmount: Number(r.bounty_amount),
    durationType: r.duration_type as PartnerDurationType,
    durationEndDate: r.duration_end_date ? new Date(r.duration_end_date) : null,
    isCommissionPaused: Boolean(r.is_commission_paused),
    payoutUpiId: r.payout_upi_id || null,
    payoutHolderName: r.payout_holder_name || null,
    payoutBankName: r.payout_bank_name || null,
    payoutBankAccount: r.payout_bank_account || null,
    payoutBankIfsc: r.payout_bank_ifsc || null,
    payoutAccountType: (r.payout_account_type as PartnerAccountType) || 'SAVINGS',
    pitchNotes: r.pitch_notes || null,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

function mapRowToAttribution(r: any): PartnerSalonAttribution {
  return {
    id: r.id,
    partnerId: r.partner_id,
    salonId: r.salon_id,
    source: r.source as PartnerAttributionSource,
    qualificationStatus: r.qualification_status as PartnerQualificationStatus,
    ticketsCompletedCount: Number(r.tickets_completed_count),
    firstPaidPlanAt: r.first_paid_plan_at ? new Date(r.first_paid_plan_at) : null,
    commissionExpiresAt: r.commission_expires_at ? new Date(r.commission_expires_at) : null,
    createdAt: new Date(r.created_at),
  };
}

function mapRowToLedger(r: any): PartnerWalletLedgerEntry {
  return {
    id: r.id,
    partnerId: r.partner_id,
    salonId: r.salon_id || null,
    transactionType: r.transaction_type as PartnerLedgerTransactionType,
    grossPlanAmount: Number(r.gross_plan_amount || 0),
    discountAmount: Number(r.discount_amount || 0),
    netPaidAmount: Number(r.net_paid_amount || 0),
    commissionAmount: Number(r.commission_amount),
    balanceType: r.balance_type as PartnerBalanceType,
    description: r.description,
    referenceId: r.reference_id || null,
    createdAt: new Date(r.created_at),
  };
}

function mapRowToPayout(r: any): PartnerPayoutRequest {
  return {
    id: r.id,
    partnerId: r.partner_id,
    amount: Number(r.amount),
    payoutMethod: r.payout_method as PartnerPayoutMethod,
    payoutTarget: r.payout_target,
    status: r.status as PartnerPayoutStatus,
    utrReference: r.utr_reference || null,
    adminNotes: r.admin_notes || null,
    requestedAt: new Date(r.requested_at),
    settledAt: r.settled_at ? new Date(r.settled_at) : null,
  };
}

function mapRowToNotification(r: any): PartnerNotification {
  return {
    id: r.id,
    partnerId: r.partner_id,
    title: r.title,
    message: r.message,
    type: r.type as PartnerNotificationType,
    isRead: Boolean(r.is_read),
    createdAt: new Date(r.created_at),
  };
}

export interface CreatePartnerApplicationInput {
  fullName: string;
  phone: string;
  email?: string;
  password?: string;
  city: string;
  persona: PartnerPersona;
  payoutUpiId?: string;
  payoutHolderName?: string;
  payoutBankName?: string;
  payoutBankAccount?: string;
  payoutBankIfsc?: string;
  payoutAccountType?: PartnerAccountType;
  pitchNotes?: string;
  userId?: string;
  referralCode?: string;
}

export interface AdminOnboardPartnerInput extends CreatePartnerApplicationInput {
  status?: PartnerStatus;
  commissionModel?: PartnerCommissionModel;
  commissionPercent?: number;
  bountyAmount?: number;
  durationType?: PartnerDurationType;
}

export interface UpdatePayoutMethodsInput {
  payoutUpiId?: string;
  payoutHolderName?: string;
  payoutBankName?: string;
  payoutBankAccount?: string;
  payoutBankIfsc?: string;
  payoutAccountType?: PartnerAccountType;
}

export interface QuoteReferralDiscountInput {
  partnerCode: string;
  planTier?: string;
  basePrice: number;
}

export interface ReferralDiscountQuote {
  isValid: boolean;
  partnerId?: string;
  partnerName?: string;
  city?: string;
  discountPercent: number;
  discountAmount: number;
  netPayableAmount: number;
  message: string;
}

const processedMilestoneTickets = new Set<string>();

const partnerPayoutLocks = new Map<string, Promise<any>>();

export const partnerRepo = {
  async resetForTesting(): Promise<void> {
    partnerPayoutLocks.clear();
    processedMilestoneTickets.clear();
    memoryStore.partners.clear();
    memoryStore.partnerAttributions.clear();
    memoryStore.partnerLedger.clear();
    memoryStore.partnerPayouts.clear();
    memoryStore.partnerNotifications.clear();
    memoryStore.partnerProgramSettings = { ...defaultPartnerProgramSettings };
    memoryStore.partnerMarketingContent = { ...defaultPartnerMarketingContent };

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query('DELETE FROM partner_notifications');
        await db.query('DELETE FROM partner_payout_requests');
        await db.query('DELETE FROM partner_wallet_ledger');
        await db.query('DELETE FROM partner_salon_attributions');
        await db.query('DELETE FROM partners');
      } catch {
        // Ignore errors if tables not yet migrated in test env
      }
    }
  },

  async createPartnerApplication(input: CreatePartnerApplicationInput): Promise<Partner> {
    const cleanPhone = input.phone.trim();
    const cleanEmail = (input.email || '').trim().toLowerCase();

    if (!cleanEmail) {
      throw new Error('Email address is mandatory for partner registration.');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Please enter a valid email address (e.g. partner@example.com).');
    }

    // Check duplicate phone & email
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>('SELECT id FROM partners WHERE phone = ? LIMIT 1', [cleanPhone]);
        if (rows && rows.length > 0) {
          throw new Error('Phone number already registered');
        }

        const [emailRows] = await db.query<any[]>('SELECT id FROM partners WHERE LOWER(email) = ? LIMIT 1', [cleanEmail]);
        if (emailRows && emailRows.length > 0) {
          throw new Error(`Email address '${cleanEmail}' is already registered to another partner.`);
        }

        const [userRows] = await db.query<any[]>('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [cleanEmail]);
        if (userRows && userRows.length > 0) {
          throw new Error(`Email address '${cleanEmail}' is already registered to an existing user account.`);
        }
      } catch (err: any) {
        if (err.message.includes('already registered')) {
          throw err;
        }
      }
    }

    for (const p of memoryStore.partners.values()) {
      if (p.phone === cleanPhone) {
        throw new Error('Phone number already registered');
      }
      if (p.email?.toLowerCase() === cleanEmail) {
        throw new Error(`Email address '${cleanEmail}' is already registered to another partner.`);
      }
    }

    const id = generateId('part');
    let referralCode = input.referralCode?.trim().toUpperCase() || sanitizeReferralCode(input.fullName);

    // Validate custom referral code if provided
    if (input.referralCode && input.referralCode.trim()) {
      const check = await uniquenessService.checkReferralCode(referralCode);
      if (!check.available) {
        throw new Error(check.reason || `Referral code "${referralCode}" is already taken.`);
      }
    } else {
      // Ensure unique auto-generated code across ALL namespaces
      let suffix = 1;
      const baseCode = referralCode;
      let check = await uniquenessService.checkReferralCode(referralCode);
      while (!check.available) {
        referralCode = `${baseCode}${suffix++}`;
        check = await uniquenessService.checkReferralCode(referralCode);
      }
    }
    const now = new Date();

    let passwordHash: string | null = null;
    if (input.password && input.password.trim()) {
      passwordHash = await Bun.password.hash(input.password.trim(), { algorithm: 'bcrypt', cost: 10 });
    }

    const partner: Partner = {
      id,
      userId: input.userId || null,
      fullName: input.fullName.trim(),
      phone: cleanPhone,
      email: input.email?.trim() || null,
      passwordHash,
      hasPassword: Boolean(passwordHash),
      city: input.city.trim(),
      persona: input.persona,
      referralCode,
      status: 'PENDING_REVIEW',
      commissionModel: 'RECURRING_PERCENT',
      commissionPercent: 10.0,
      bountyAmount: 0.0,
      durationType: '6_MONTHS',
      durationEndDate: null,
      isCommissionPaused: false,
      payoutUpiId: input.payoutUpiId?.trim() || null,
      payoutHolderName: input.payoutHolderName?.trim() || null,
      payoutBankName: input.payoutBankName?.trim() || null,
      payoutBankAccount: input.payoutBankAccount?.trim() || null,
      payoutBankIfsc: input.payoutBankIfsc?.trim() || null,
      payoutAccountType: input.payoutAccountType || 'SAVINGS',
      pitchNotes: input.pitchNotes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `INSERT INTO partners (
            id, user_id, full_name, phone, email, password_hash, city, persona, referral_code,
            status, commission_model, commission_percent, bounty_amount,
            duration_type, duration_end_date, is_commission_paused,
            payout_upi_id, payout_holder_name, payout_bank_name, payout_bank_account, payout_bank_ifsc, payout_account_type, pitch_notes,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            partner.id,
            partner.userId,
            partner.fullName,
            partner.phone,
            partner.email,
            partner.passwordHash,
            partner.city,
            partner.persona,
            partner.referralCode,
            partner.status,
            partner.commissionModel,
            partner.commissionPercent,
            partner.bountyAmount,
            partner.durationType,
            toMySqlDatetime(partner.durationEndDate),
            partner.isCommissionPaused ? 1 : 0,
            partner.payoutUpiId,
            partner.payoutHolderName,
            partner.payoutBankName,
            partner.payoutBankAccount,
            partner.payoutBankIfsc,
            partner.payoutAccountType,
            partner.pitchNotes,
            toMySqlDatetime(partner.createdAt),
            toMySqlDatetime(partner.updatedAt),
          ]
        );
      } catch (err) {
        console.error('MySQL insert partner error, storing in memory:', err);
      }
    }

    memoryStore.partners.set(partner.id, partner);
    return partner;
  },

  async adminOnboardPartner(input: AdminOnboardPartnerInput): Promise<Partner> {
    const cleanPhone = input.phone.trim();
    const cleanEmail = (input.email || '').trim().toLowerCase();

    if (!cleanEmail) {
      throw new Error('Email address is mandatory for partner onboarding.');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Please enter a valid email address (e.g. partner@example.com).');
    }

    // Check duplicate phone & email
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>('SELECT id FROM partners WHERE phone = ? LIMIT 1', [cleanPhone]);
        if (rows && rows.length > 0) {
          throw new Error('Phone number already registered');
        }

        const [emailRows] = await db.query<any[]>('SELECT id FROM partners WHERE LOWER(email) = ? LIMIT 1', [cleanEmail]);
        if (emailRows && emailRows.length > 0) {
          throw new Error(`Email address '${cleanEmail}' is already registered to another partner.`);
        }

        const [userRows] = await db.query<any[]>('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [cleanEmail]);
        if (userRows && userRows.length > 0) {
          throw new Error(`Email address '${cleanEmail}' is already registered to an existing user account.`);
        }
      } catch (err: any) {
        if (err.message.includes('already registered')) {
          throw err;
        }
      }
    }

    for (const p of memoryStore.partners.values()) {
      if (p.phone === cleanPhone) {
        throw new Error('Phone number already registered');
      }
      if (p.email?.toLowerCase() === cleanEmail) {
        throw new Error(`Email address '${cleanEmail}' is already registered to another partner.`);
      }
    }

    const id = generateId('part');
    let referralCode = input.referralCode?.trim().toUpperCase() || sanitizeReferralCode(input.fullName);

    // Validate custom referral code if provided
    if (input.referralCode && input.referralCode.trim()) {
      const regex = /^[A-Z0-9_-]{3,20}$/;
      if (!regex.test(referralCode)) {
        throw new Error('Referral code must be 3-20 characters long and contain only uppercase letters, numbers, hyphens or underscores.');
      }
      const existing = await this.getPartnerByCode(referralCode);
      if (existing) {
        throw new Error(`Referral code "${referralCode}" is already taken by another partner.`);
      }
    } else {
      // Ensure unique auto-generated code
      let suffix = 1;
      const baseCode = referralCode;
      while (await this.getPartnerByCode(referralCode)) {
        referralCode = `${baseCode}${suffix++}`;
      }
    }

    const now = new Date();
    let passwordHash: string | null = null;
    if (input.password && input.password.trim()) {
      passwordHash = await Bun.password.hash(input.password.trim(), { algorithm: 'bcrypt', cost: 10 });
    }

    const settings = await this.getProgramSettings();

    const partner: Partner = {
      id,
      userId: input.userId || null,
      fullName: input.fullName.trim(),
      phone: cleanPhone,
      email: input.email?.trim() || null,
      passwordHash,
      hasPassword: Boolean(passwordHash),
      city: input.city.trim(),
      persona: input.persona || 'GROUND_HUSTLER',
      referralCode,
      status: input.status || 'ACTIVE',
      commissionModel: input.commissionModel || settings.defaultCommissionModel || 'RECURRING_PERCENT',
      commissionPercent: input.commissionPercent !== undefined ? Number(input.commissionPercent) : (settings.defaultCommissionPercent ?? 10.0),
      bountyAmount: input.bountyAmount !== undefined ? Number(input.bountyAmount) : (settings.defaultBountyAmount ?? 0.0),
      durationType: input.durationType || settings.defaultDurationType || '6_MONTHS',
      durationEndDate: null,
      isCommissionPaused: false,
      payoutUpiId: input.payoutUpiId?.trim() || null,
      payoutHolderName: input.payoutHolderName?.trim() || null,
      payoutBankName: input.payoutBankName?.trim() || null,
      payoutBankAccount: input.payoutBankAccount?.trim() || null,
      payoutBankIfsc: input.payoutBankIfsc?.trim() || null,
      payoutAccountType: input.payoutAccountType || 'SAVINGS',
      pitchNotes: input.pitchNotes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `INSERT INTO partners (
            id, user_id, full_name, phone, email, password_hash, city, persona, referral_code,
            status, commission_model, commission_percent, bounty_amount,
            duration_type, duration_end_date, is_commission_paused,
            payout_upi_id, payout_holder_name, payout_bank_name, payout_bank_account, payout_bank_ifsc, payout_account_type, pitch_notes,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            partner.id,
            partner.userId,
            partner.fullName,
            partner.phone,
            partner.email,
            partner.passwordHash,
            partner.city,
            partner.persona,
            partner.referralCode,
            partner.status,
            partner.commissionModel,
            partner.commissionPercent,
            partner.bountyAmount,
            partner.durationType,
            toMySqlDatetime(partner.durationEndDate),
            partner.isCommissionPaused ? 1 : 0,
            partner.payoutUpiId,
            partner.payoutHolderName,
            partner.payoutBankName,
            partner.payoutBankAccount,
            partner.payoutBankIfsc,
            partner.payoutAccountType,
            partner.pitchNotes,
            toMySqlDatetime(partner.createdAt),
            toMySqlDatetime(partner.updatedAt),
          ]
        );
      } catch (err: any) {
        console.error('MySQL adminOnboardPartner error:', err);
        throw new Error(err.message || 'Failed to save partner in database');
      }
    }

    memoryStore.partners.set(partner.id, partner);
    return partner;
  },

  async getPartnerById(id: string): Promise<Partner | null> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>('SELECT * FROM partners WHERE id = ? LIMIT 1', [id]);
        if (rows && rows.length > 0) {
          const p = mapRowToPartner(rows[0]);
          memoryStore.partners.set(p.id, p);
          return p;
        }
      } catch (err) {
        console.error('MySQL getPartnerById error:', err);
      }
    }
    return memoryStore.partners.get(id) || null;
  },

  async getPartnerByCode(code: string): Promise<Partner | null> {
    const cleanCode = code.trim().toUpperCase();
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>('SELECT * FROM partners WHERE UPPER(referral_code) = ? LIMIT 1', [cleanCode]);
        if (rows && rows.length > 0) {
          const p = mapRowToPartner(rows[0]);
          memoryStore.partners.set(p.id, p);
          return p;
        }
      } catch (err) {
        console.error('MySQL getPartnerByCode error:', err);
      }
    }
    for (const p of memoryStore.partners.values()) {
      if (p.referralCode.toUpperCase() === cleanCode) {
        return p;
      }
    }
    return null;
  },

  async getAllPartners(filter?: { persona?: string; status?: string }): Promise<Partner[]> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        let q = 'SELECT * FROM partners WHERE 1=1';
        const params: any[] = [];
        if (filter?.persona) {
          q += ' AND persona = ?';
          params.push(filter.persona);
        }
        if (filter?.status) {
          q += ' AND status = ?';
          params.push(filter.status);
        }
        q += ' ORDER BY created_at DESC';
        const [rows] = await db.query<any[]>(q, params);
        return rows.map(mapRowToPartner);
      } catch (err) {
        console.error('MySQL getAllPartners error:', err);
      }
    }

    let partners = Array.from(memoryStore.partners.values());
    if (filter?.persona) {
      partners = partners.filter((p) => p.persona === filter.persona);
    }
    if (filter?.status) {
      partners = partners.filter((p) => p.status === filter.status);
    }
    return partners.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  },

  async updatePartnerStatus(partnerId: string, status: PartnerStatus): Promise<Partner> {
    const partner = await this.getPartnerById(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    partner.status = status;
    partner.updatedAt = new Date();

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query('UPDATE partners SET status = ?, updated_at = ? WHERE id = ?', [
          status,
          toMySqlDatetime(partner.updatedAt),
          partnerId,
        ]);
      } catch (err) {
        console.error('MySQL updatePartnerStatus error:', err);
      }
    }

    memoryStore.partners.set(partner.id, partner);
    return partner;
  },

  async setCommissionPaused(partnerId: string, isPaused: boolean): Promise<Partner> {
    const partner = await this.getPartnerById(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    partner.isCommissionPaused = isPaused;
    partner.updatedAt = new Date();

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query('UPDATE partners SET is_commission_paused = ?, updated_at = ? WHERE id = ?', [
          isPaused ? 1 : 0,
          toMySqlDatetime(partner.updatedAt),
          partnerId,
        ]);
      } catch (err) {
        console.error('MySQL setCommissionPaused error:', err);
      }
    }

    memoryStore.partners.set(partner.id, partner);
    return partner;
  },

  async updateCommissionTerms(
    partnerId: string,
    updates: Partial<{
      commissionModel: PartnerCommissionModel;
      commissionPercent: number;
      bountyAmount: number;
      durationType: PartnerDurationType;
      durationEndDate?: Date | string | null;
      payoutUpiId?: string | null;
      payoutBankAccount?: string | null;
      payoutBankIfsc?: string | null;
    }>
  ): Promise<Partner> {
    const partner = await this.getPartnerById(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    if (updates.commissionModel !== undefined) partner.commissionModel = updates.commissionModel;
    if (updates.commissionPercent !== undefined) partner.commissionPercent = updates.commissionPercent;
    if (updates.bountyAmount !== undefined) partner.bountyAmount = updates.bountyAmount;
    if (updates.durationType !== undefined) partner.durationType = updates.durationType;
    if (updates.durationEndDate !== undefined) partner.durationEndDate = updates.durationEndDate;
    if (updates.payoutUpiId !== undefined) partner.payoutUpiId = updates.payoutUpiId;
    if (updates.payoutBankAccount !== undefined) partner.payoutBankAccount = updates.payoutBankAccount;
    if (updates.payoutBankIfsc !== undefined) partner.payoutBankIfsc = updates.payoutBankIfsc;

    partner.updatedAt = new Date();

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `UPDATE partners SET
            commission_model = ?, commission_percent = ?, bounty_amount = ?,
            duration_type = ?, duration_end_date = ?, payout_upi_id = ?,
            payout_bank_account = ?, payout_bank_ifsc = ?, updated_at = ?
          WHERE id = ?`,
          [
            partner.commissionModel,
            partner.commissionPercent,
            partner.bountyAmount,
            partner.durationType,
            toMySqlDatetime(partner.durationEndDate),
            partner.payoutUpiId,
            partner.payoutBankAccount,
            partner.payoutBankIfsc,
            toMySqlDatetime(partner.updatedAt),
            partnerId,
          ]
        );
      } catch (err) {
        console.error('MySQL updateCommissionTerms error:', err);
      }
    }

    memoryStore.partners.set(partner.id, partner);
    return partner;
  },

  async updatePartnerReferralCode(partnerId: string, newCode: string): Promise<Partner> {
    const cleanCode = newCode.trim().toUpperCase();
    if (!cleanCode) {
      throw new Error('Referral code cannot be empty.');
    }
    const regex = /^[A-Z0-9_-]{3,20}$/;
    if (!regex.test(cleanCode)) {
      throw new Error('Referral code must be 3-20 characters long and contain only uppercase letters, numbers, hyphens or underscores.');
    }

    const reserved = ['ADMIN', 'SUPERADMIN', 'API', 'QUEUE', 'SALON', 'SUPPORT', 'HELP', 'SYSTEM', 'ROOT', 'NULL', 'UNDEFINED', 'TEST'];
    if (reserved.includes(cleanCode)) {
      throw new Error(`Referral code "${cleanCode}" is reserved. Please choose another.`);
    }

    const partner = await this.getPartnerById(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    if (partner.referralCode.toUpperCase() === cleanCode) {
      return partner;
    }

    const check = await uniquenessService.checkReferralCode(cleanCode, partnerId);
    if (!check.available) {
      throw new Error(check.reason || `Referral code "${cleanCode}" is already taken.`);
    }

    partner.referralCode = cleanCode;
    partner.updatedAt = new Date();

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query('UPDATE partners SET referral_code = ?, updated_at = ? WHERE id = ?', [
          cleanCode,
          toMySqlDatetime(partner.updatedAt),
          partnerId,
        ]);
      } catch (err: any) {
        console.error('MySQL updatePartnerReferralCode error:', err);
        throw new Error(err.message || 'Failed to update referral code in database');
      }
    }

    memoryStore.partners.set(partner.id, partner);
    return partner;
  },

  async createAttribution(params: {
    partnerId: string;
    salonId: string;
    source?: PartnerAttributionSource;
    qualificationStatus?: PartnerQualificationStatus;
  }): Promise<PartnerSalonAttribution> {
    const id = generateId('attr');
    const partner = await this.getPartnerById(params.partnerId);

    let commissionExpiresAt: Date | null = null;
    if (partner) {
      const now = Date.now();
      if (partner.durationType === '3_MONTHS') {
        commissionExpiresAt = new Date(now + 90 * 24 * 60 * 60 * 1000);
      } else if (partner.durationType === '6_MONTHS') {
        commissionExpiresAt = new Date(now + 180 * 24 * 60 * 60 * 1000);
      } else if (partner.durationType === '12_MONTHS') {
        commissionExpiresAt = new Date(now + 365 * 24 * 60 * 60 * 1000);
      }
    }

    const attribution: PartnerSalonAttribution = {
      id,
      partnerId: params.partnerId,
      salonId: params.salonId,
      source: params.source || 'LINK',
      qualificationStatus: params.qualificationStatus || 'UNQUALIFIED',
      ticketsCompletedCount: 0,
      firstPaidPlanAt: null,
      commissionExpiresAt,
      createdAt: new Date(),
    };

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `INSERT INTO partner_salon_attributions (
            id, partner_id, salon_id, source, qualification_status,
            tickets_completed_count, first_paid_plan_at, commission_expires_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            attribution.id,
            attribution.partnerId,
            attribution.salonId,
            attribution.source,
            attribution.qualificationStatus,
            attribution.ticketsCompletedCount,
            toMySqlDatetime(attribution.firstPaidPlanAt),
            toMySqlDatetime(attribution.commissionExpiresAt),
            toMySqlDatetime(attribution.createdAt),
          ]
        );
      } catch (err) {
        console.error('MySQL createAttribution error:', err);
      }
    }

    memoryStore.partnerAttributions.set(attribution.salonId, attribution);
    return attribution;
  },

  async getAttributionBySalonId(salonId: string): Promise<PartnerSalonAttribution | null> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>('SELECT * FROM partner_salon_attributions WHERE salon_id = ? LIMIT 1', [
          salonId,
        ]);
        if (rows && rows.length > 0) {
          const attr = mapRowToAttribution(rows[0]);
          memoryStore.partnerAttributions.set(attr.salonId, attr);
          return attr;
        }
      } catch (err) {
        console.error('MySQL getAttributionBySalonId error:', err);
      }
    }
    return memoryStore.partnerAttributions.get(salonId) || null;
  },

  async getAttributionsByPartnerId(partnerId: string): Promise<PartnerSalonAttribution[]> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          'SELECT * FROM partner_salon_attributions WHERE partner_id = ? ORDER BY created_at DESC',
          [partnerId]
        );
        return rows.map(mapRowToAttribution);
      } catch (err) {
        console.error('MySQL getAttributionsByPartnerId error:', err);
      }
    }
    return Array.from(memoryStore.partnerAttributions.values())
      .filter((a) => a.partnerId === partnerId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  },

  async updateAttribution(attr: PartnerSalonAttribution): Promise<PartnerSalonAttribution> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `UPDATE partner_salon_attributions SET
            qualification_status = ?, tickets_completed_count = ?,
            first_paid_plan_at = ?, commission_expires_at = ?
          WHERE id = ?`,
          [
            attr.qualificationStatus,
            attr.ticketsCompletedCount,
            toMySqlDatetime(attr.firstPaidPlanAt),
            toMySqlDatetime(attr.commissionExpiresAt),
            attr.id,
          ]
        );
      } catch (err) {
        console.error('MySQL updateAttribution error:', err);
      }
    }
    memoryStore.partnerAttributions.set(attr.salonId, attr);
    return attr;
  },

  async incrementSalonTicketCount(salonId: string, ticketId?: string): Promise<void> {
    if (ticketId) {
      if (processedMilestoneTickets.has(ticketId)) {
        return; // Idempotent: ticket already counted towards milestone
      }
      processedMilestoneTickets.add(ticketId);
    }

    const attr = await this.getAttributionBySalonId(salonId);
    if (!attr || attr.qualificationStatus === 'QUALIFIED') return;

    attr.ticketsCompletedCount += 1;

    if (attr.ticketsCompletedCount >= 15) {
      attr.qualificationStatus = 'QUALIFIED';
      await this.updateAttribution(attr);
      await this.unlockPendingLedgerEntries(attr.partnerId, salonId);

      await this.createNotification({
        partnerId: attr.partnerId,
        title: 'Milestone Unlocked! 🚀',
        message: 'A salon you referred just completed 15 tickets. All locked earnings are now available for withdrawal!',
        type: 'QUALIFIED',
      });
    } else {
      await this.updateAttribution(attr);
    }
  },

  async addLedgerEntry(
    entry: Omit<PartnerWalletLedgerEntry, 'id' | 'createdAt'>
  ): Promise<PartnerWalletLedgerEntry> {
    const id = generateId('led');
    const fullEntry: PartnerWalletLedgerEntry = {
      id,
      partnerId: entry.partnerId,
      salonId: entry.salonId || null,
      transactionType: entry.transactionType,
      grossPlanAmount: entry.grossPlanAmount || 0,
      discountAmount: entry.discountAmount || 0,
      netPaidAmount: entry.netPaidAmount || 0,
      commissionAmount: entry.commissionAmount,
      balanceType: entry.balanceType,
      description: entry.description,
      referenceId: entry.referenceId || null,
      createdAt: new Date(),
    };

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `INSERT INTO partner_wallet_ledger (
            id, partner_id, salon_id, transaction_type, gross_plan_amount,
            discount_amount, net_paid_amount, commission_amount, balance_type,
            description, reference_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            fullEntry.id,
            fullEntry.partnerId,
            fullEntry.salonId,
            fullEntry.transactionType,
            fullEntry.grossPlanAmount,
            fullEntry.discountAmount,
            fullEntry.netPaidAmount,
            fullEntry.commissionAmount,
            fullEntry.balanceType,
            fullEntry.description,
            fullEntry.referenceId,
            toMySqlDatetime(fullEntry.createdAt),
          ]
        );
      } catch (err) {
        console.error('MySQL addLedgerEntry error:', err);
      }
    }

    memoryStore.partnerLedger.set(fullEntry.id, fullEntry);
    return fullEntry;
  },

  async unlockPendingLedgerEntries(partnerId: string, salonId?: string): Promise<void> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        let q = 'UPDATE partner_wallet_ledger SET balance_type = "AVAILABLE" WHERE partner_id = ? AND balance_type = "PENDING_LOCK"';
        const params: any[] = [partnerId];
        if (salonId) {
          q += ' AND salon_id = ?';
          params.push(salonId);
        }
        await db.query(q, params);
      } catch (err) {
        console.error('MySQL unlockPendingLedgerEntries error:', err);
      }
    }

    for (const entry of memoryStore.partnerLedger.values()) {
      if (entry.partnerId === partnerId && entry.balanceType === 'PENDING_LOCK') {
        if (!salonId || entry.salonId === salonId) {
          entry.balanceType = 'AVAILABLE';
        }
      }
    }
  },

  async getLedgerByPartnerId(partnerId: string): Promise<PartnerWalletLedgerEntry[]> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          'SELECT * FROM partner_wallet_ledger WHERE partner_id = ? ORDER BY created_at DESC',
          [partnerId]
        );
        return rows.map(mapRowToLedger);
      } catch (err) {
        console.error('MySQL getLedgerByPartnerId error:', err);
      }
    }
    return Array.from(memoryStore.partnerLedger.values())
      .filter((l) => l.partnerId === partnerId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  },

  async getWalletBalance(partnerId: string): Promise<PartnerWalletBalance> {
    const ledger = await this.getLedgerByPartnerId(partnerId);
    const payouts = await this.getPayoutRequests(partnerId);

    let pendingLockedBalance = 0;
    let availableCredits = 0;
    let lifetimeEarnings = 0;

    for (const entry of ledger) {
      if (entry.balanceType === 'PENDING_LOCK') {
        pendingLockedBalance += entry.commissionAmount;
      } else if (entry.balanceType === 'AVAILABLE') {
        if (entry.transactionType !== 'WITHDRAWAL_DEBIT') {
          availableCredits += entry.commissionAmount;
        }
      }

      if (entry.transactionType === 'COMMISSION_CREDIT' || entry.transactionType === 'BOUNTY_CREDIT' || (entry.transactionType === 'ADJUSTMENT' && entry.commissionAmount > 0)) {
        lifetimeEarnings += entry.commissionAmount;
      }
    }

    let activeWithdrawals = 0;
    let totalWithdrawn = 0;

    for (const payout of payouts) {
      if (payout.status === 'REQUESTED' || payout.status === 'APPROVED') {
        activeWithdrawals += payout.amount;
      } else if (payout.status === 'PAID') {
        activeWithdrawals += payout.amount;
        totalWithdrawn += payout.amount;
      }
    }

    const availableBalance = Math.max(0, Number((availableCredits - activeWithdrawals).toFixed(2)));

    return {
      availableBalance,
      pendingLockedBalance: Number(pendingLockedBalance.toFixed(2)),
      totalWithdrawn: Number(totalWithdrawn.toFixed(2)),
      lifetimeEarnings: Number(lifetimeEarnings.toFixed(2)),
    };
  },

  async creditDirectBalance(partnerId: string, amount: number): Promise<void> {
    await this.addLedgerEntry({
      partnerId,
      transactionType: 'ADJUSTMENT',
      grossPlanAmount: 0,
      discountAmount: 0,
      netPaidAmount: 0,
      commissionAmount: amount,
      balanceType: 'AVAILABLE',
      description: 'Direct balance credit',
    });
  },

  async requestPayout(params: {
    partnerId: string;
    amount: number;
    payoutMethod: PartnerPayoutMethod;
    payoutTarget: string;
  }): Promise<PartnerPayoutRequest> {
    if (params.amount < 500) {
      throw new Error('Minimum withdrawal amount is ₹500');
    }

    // ADR 005 C5: Serialize payout requests per partner to prevent concurrent overdraft
    const currentLock = partnerPayoutLocks.get(params.partnerId) || Promise.resolve();
    let releaseLock: () => void = () => {};
    const nextLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    partnerPayoutLocks.set(params.partnerId, currentLock.then(() => nextLock));

    await currentLock;
    try {
      const balance = await this.getWalletBalance(params.partnerId);
      if (params.amount > balance.availableBalance) {
        throw new Error('Insufficient available balance');
      }

      const id = generateId('payout');
      const now = new Date();
      const payout: PartnerPayoutRequest = {
        id,
        partnerId: params.partnerId,
        amount: params.amount,
        payoutMethod: params.payoutMethod,
        payoutTarget: params.payoutTarget,
        status: 'REQUESTED',
        utrReference: null,
        adminNotes: null,
        requestedAt: now,
        settledAt: null,
      };

      if (isMySqlConnected) {
        try {
          const db = getDb();
          await db.query(
            `INSERT INTO partner_payout_requests (
              id, partner_id, amount, payout_method, payout_target,
              status, utr_reference, admin_notes, requested_at, settled_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              payout.id,
              payout.partnerId,
              payout.amount,
              payout.payoutMethod,
              payout.payoutTarget,
              payout.status,
              payout.utrReference,
              payout.adminNotes,
              toMySqlDatetime(payout.requestedAt),
              toMySqlDatetime(payout.settledAt),
            ]
          );
        } catch (err) {
          console.error('MySQL requestPayout error:', err);
        }
      }

      memoryStore.partnerPayouts.set(payout.id, payout);

      await this.createNotification({
        partnerId: params.partnerId,
        title: 'Payout Requested ⏳',
        message: `Withdrawal request for ₹${params.amount} via ${params.payoutMethod} has been submitted for approval.`,
        type: 'PAYOUT_STATUS',
      });

      return payout;
    } finally {
      releaseLock();
    }
  },

  async getPayoutRequests(partnerId?: string): Promise<PartnerPayoutRequest[]> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        let q = 'SELECT * FROM partner_payout_requests';
        const params: any[] = [];
        if (partnerId) {
          q += ' WHERE partner_id = ?';
          params.push(partnerId);
        }
        q += ' ORDER BY requested_at DESC';
        const [rows] = await db.query<any[]>(q, params);
        return rows.map(mapRowToPayout);
      } catch (err) {
        console.error('MySQL getPayoutRequests error:', err);
      }
    }

    let payouts = Array.from(memoryStore.partnerPayouts.values());
    if (partnerId) {
      payouts = payouts.filter((p) => p.partnerId === partnerId);
    }
    return payouts.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
  },

  async getPayoutRequestById(id: string): Promise<PartnerPayoutRequest | null> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>('SELECT * FROM partner_payout_requests WHERE id = ? LIMIT 1', [id]);
        if (rows && rows.length > 0) {
          const p = mapRowToPayout(rows[0]);
          memoryStore.partnerPayouts.set(p.id, p);
          return p;
        }
      } catch (err) {
        console.error('MySQL getPayoutRequestById error:', err);
      }
    }
    return memoryStore.partnerPayouts.get(id) || null;
  },

  async settlePayout(
    payoutId: string,
    payload: { utrReference: string; adminNotes?: string }
  ): Promise<PartnerPayoutRequest> {
    const payout = await this.getPayoutRequestById(payoutId);
    if (!payout) {
      throw new Error(`Payout request not found: ${payoutId}`);
    }

    // ADR 005 C5: Guard against double-paying or settling non-pending requests
    if (payout.status !== 'REQUESTED' && payout.status !== 'APPROVED') {
      throw new Error(`Cannot settle payout in ${payout.status} state. Only REQUESTED or APPROVED payouts can be settled.`);
    }

    payout.status = 'PAID';
    payout.utrReference = payload.utrReference;
    payout.adminNotes = payload.adminNotes || null;
    payout.settledAt = new Date();

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          'UPDATE partner_payout_requests SET status = "PAID", utr_reference = ?, admin_notes = ?, settled_at = ? WHERE id = ? AND status IN ("REQUESTED", "APPROVED")',
          [payout.utrReference, payout.adminNotes, toMySqlDatetime(payout.settledAt), payoutId]
        );
      } catch (err) {
        console.error('MySQL settlePayout error:', err);
      }
    }

    memoryStore.partnerPayouts.set(payout.id, payout);

    await this.createNotification({
      partnerId: payout.partnerId,
      title: 'Payout Settled! ✅',
      message: `Your withdrawal of ₹${payout.amount} has been paid (UTR: ${payload.utrReference}).`,
      type: 'PAYOUT_STATUS',
    });

    return payout;
  },

  async rejectPayout(payoutId: string, reason: string): Promise<PartnerPayoutRequest> {
    const payout = await this.getPayoutRequestById(payoutId);
    if (!payout) {
      throw new Error(`Payout request not found: ${payoutId}`);
    }

    // ADR 005 C5: Prevent rejecting an already PAID payout to stop fraudulent refunds
    if (payout.status !== 'REQUESTED' && payout.status !== 'APPROVED') {
      throw new Error(`Cannot reject payout in ${payout.status} state. Only REQUESTED or APPROVED payouts can be rejected.`);
    }

    payout.status = 'REJECTED';
    payout.adminNotes = reason;
    payout.settledAt = new Date();

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          'UPDATE partner_payout_requests SET status = "REJECTED", admin_notes = ?, settled_at = ? WHERE id = ? AND status IN ("REQUESTED", "APPROVED")',
          [payout.adminNotes, toMySqlDatetime(payout.settledAt), payoutId]
        );
      } catch (err) {
        console.error('MySQL rejectPayout error:', err);
      }
    }

    memoryStore.partnerPayouts.set(payout.id, payout);

    await this.createNotification({
      partnerId: payout.partnerId,
      title: 'Payout Request Rejected ❌',
      message: `Your withdrawal request of ₹${payout.amount} was rejected: ${reason}. Funds are restored to your Available balance.`,
      type: 'PAYOUT_STATUS',
    });

    return payout;
  },

  async processSubscriptionPayment(payload: {
    salonId: string;
    grossAmount: number;
    discountAmount: number;
    paymentReference: string;
  }): Promise<{ commissionEarned: number; reason?: string }> {
    const netPaidAmount = Math.max(0, payload.grossAmount - payload.discountAmount);

    const attribution = await this.getAttributionBySalonId(payload.salonId);
    if (!attribution) {
      return { commissionEarned: 0, reason: 'No partner attribution' };
    }

    const partner = await this.getPartnerById(attribution.partnerId);
    if (!partner || partner.status !== 'ACTIVE' || partner.isCommissionPaused) {
      return { commissionEarned: 0, reason: 'Partner inactive or paused' };
    }

    // Idempotency: prevent double-crediting if this payment order was already processed
    if (payload.paymentReference) {
      const existingLedger = await this.getLedgerByPartnerId(partner.id);
      const duplicate = existingLedger.find(
        (e) => e.referenceId === payload.paymentReference && e.transactionType === 'COMMISSION_CREDIT'
      );
      if (duplicate) {
        return { commissionEarned: duplicate.commissionAmount, reason: 'Already processed' };
      }
    }

    // First paid plan check: unlocks qualification
    if (netPaidAmount > 0 && attribution.qualificationStatus === 'UNQUALIFIED') {
      attribution.qualificationStatus = 'QUALIFIED';
      attribution.firstPaidPlanAt = new Date();
      await this.updateAttribution(attribution);
      await this.unlockPendingLedgerEntries(partner.id, payload.salonId);

      await this.createNotification({
        partnerId: partner.id,
        title: 'Salon Qualified! 🌟',
        message: 'A salon you referred purchased their first paid plan! All locked earnings are now available.',
        type: 'QUALIFIED',
      });
    }

    if (netPaidAmount <= 0) {
      return { commissionEarned: 0, reason: '100% Free / Discounted Plan' };
    }

    // Check expiration
    if (attribution.commissionExpiresAt && new Date() > attribution.commissionExpiresAt) {
      return { commissionEarned: 0, reason: 'Recurring commission period expired' };
    }

    // ADR 005 C7: Determine if bounty applies (one-time bounty on qualifying payment for FLAT_BOUNTY or HYBRID)
    const existingLedger = await this.getLedgerByPartnerId(partner.id);
    const bountyAlreadyPaid = existingLedger.some(
      (e) => e.salonId === payload.salonId && e.transactionType === 'BOUNTY_CREDIT'
    );

    let effectiveBounty = 0;
    if ((partner.commissionModel === 'FLAT_BOUNTY' || partner.commissionModel === 'HYBRID') && !bountyAlreadyPaid) {
      effectiveBounty = partner.bountyAmount || 0;
    }

    const calc = calculatePartnerCommission({
      commissionModel: partner.commissionModel,
      grossPlanAmount: payload.grossAmount,
      discountAmount: payload.discountAmount,
      commissionPercent: partner.commissionPercent,
      bountyAmount: effectiveBounty,
      expiresAt: attribution.commissionExpiresAt,
      isPaused: partner.isCommissionPaused,
    });

    if (calc.commissionAmount > 0) {
      if (partner.commissionModel === 'FLAT_BOUNTY') {
        await this.addLedgerEntry({
          partnerId: partner.id,
          salonId: payload.salonId,
          transactionType: 'BOUNTY_CREDIT',
          grossPlanAmount: payload.grossAmount,
          discountAmount: payload.discountAmount,
          netPaidAmount,
          commissionAmount: calc.commissionAmount,
          balanceType: 'AVAILABLE',
          description: `Flat Bounty Referral Reward (₹${calc.commissionAmount})`,
          referenceId: payload.paymentReference,
        });
      } else if (partner.commissionModel === 'HYBRID') {
        if (effectiveBounty > 0) {
          await this.addLedgerEntry({
            partnerId: partner.id,
            salonId: payload.salonId,
            transactionType: 'BOUNTY_CREDIT',
            grossPlanAmount: payload.grossAmount,
            discountAmount: payload.discountAmount,
            netPaidAmount,
            commissionAmount: effectiveBounty,
            balanceType: 'AVAILABLE',
            description: `One-Time Hybrid Bounty Reward (₹${effectiveBounty})`,
            referenceId: payload.paymentReference,
          });
        }
        const recurringPercent = Number((calc.commissionAmount - effectiveBounty).toFixed(2));
        if (recurringPercent > 0) {
          await this.addLedgerEntry({
            partnerId: partner.id,
            salonId: payload.salonId,
            transactionType: 'COMMISSION_CREDIT',
            grossPlanAmount: payload.grossAmount,
            discountAmount: payload.discountAmount,
            netPaidAmount,
            commissionAmount: recurringPercent,
            balanceType: 'AVAILABLE',
            description: `Subscription Commission (${partner.commissionPercent}%)`,
            referenceId: payload.paymentReference,
          });
        }
      } else {
        await this.addLedgerEntry({
          partnerId: partner.id,
          salonId: payload.salonId,
          transactionType: 'COMMISSION_CREDIT',
          grossPlanAmount: payload.grossAmount,
          discountAmount: payload.discountAmount,
          netPaidAmount,
          commissionAmount: calc.commissionAmount,
          balanceType: 'AVAILABLE',
          description: `Subscription Commission (${partner.commissionPercent}%)`,
          referenceId: payload.paymentReference,
        });
      }

      await this.createNotification({
        partnerId: partner.id,
        title: 'Commission Credited! 💰',
        message: `₹${calc.commissionAmount} credited to your wallet from subscription payment.`,
        type: 'EARNING_CREDITED',
      });
    }

    return { commissionEarned: calc.commissionAmount };
  },

  async createNotification(params: {
    partnerId: string;
    title: string;
    message: string;
    type: PartnerNotificationType;
  }): Promise<PartnerNotification> {
    const id = generateId('notif');
    const notif: PartnerNotification = {
      id,
      partnerId: params.partnerId,
      title: params.title,
      message: params.message,
      type: params.type,
      isRead: false,
      createdAt: new Date(),
    };

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          'INSERT INTO partner_notifications (id, partner_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [notif.id, notif.partnerId, notif.title, notif.message, notif.type, 0, toMySqlDatetime(notif.createdAt)]
        );
      } catch (err) {
        console.error('MySQL createNotification error:', err);
      }
    }

    memoryStore.partnerNotifications.set(notif.id, notif);
    return notif;
  },

  async getNotifications(partnerId: string): Promise<PartnerNotification[]> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          'SELECT * FROM partner_notifications WHERE partner_id = ? ORDER BY created_at DESC',
          [partnerId]
        );
        return rows.map(mapRowToNotification);
      } catch (err) {
        console.error('MySQL getNotifications error:', err);
      }
    }
    return Array.from(memoryStore.partnerNotifications.values())
      .filter((n) => n.partnerId === partnerId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query('UPDATE partner_notifications SET is_read = 1 WHERE id = ?', [notificationId]);
      } catch (err) {
        console.error('MySQL markNotificationRead error:', err);
      }
    }
    const n = memoryStore.partnerNotifications.get(notificationId);
    if (n) {
      n.isRead = true;
    }
  },

  async authenticatePartner(params: {
    identifier: string;
    password: string;
  }): Promise<{ success: boolean; partner: Partner }> {
    const rawIdentifier = (params.identifier || '').trim();
    if (!rawIdentifier || !params.password) {
      throw new Error('Invalid credentials');
    }

    const cleanLower = rawIdentifier.toLowerCase();
    const cleanDigits = rawIdentifier.replace(/\D/g, '');
    const cleanPhone = rawIdentifier.replace(/[\s\-\(\)]/g, '');

    let partner: Partner | null = null;

    if (isMySqlConnected) {
      try {
        const db = getDb();
        // Public referral codes are strictly disallowed as login identifiers for security
        if (rawIdentifier.includes('@')) {
          const [rows] = await db.query<any[]>(
            'SELECT * FROM partners WHERE LOWER(email) = ? LIMIT 1',
            [cleanLower]
          );
          if (rows && rows.length > 0) {
            partner = mapRowToPartner(rows[0]);
          }
        } else {
          const [rows] = await db.query<any[]>(
            `SELECT * FROM partners 
             WHERE phone = ? OR phone = ? OR phone = ?
             LIMIT 1`,
            [rawIdentifier, cleanPhone, cleanDigits ? `+91${cleanDigits.slice(-10)}` : '']
          );
          if (rows && rows.length > 0) {
            partner = mapRowToPartner(rows[0]);
          }
        }
      } catch (err) {
        console.error('MySQL authenticatePartner error:', err);
      }
    }

    if (!partner) {
      for (const p of memoryStore.partners.values()) {
        const pDigits = p.phone.replace(/\D/g, '');
        const pPhoneClean = p.phone.replace(/[\s\-\(\)]/g, '');
        const matchPhone =
          pPhoneClean === cleanPhone ||
          p.phone === rawIdentifier ||
          (cleanDigits.length >= 10 && pDigits.endsWith(cleanDigits.slice(-10)));
        const matchEmail = Boolean(p.email && p.email.toLowerCase() === cleanLower);

        // Security: matchCode is strictly excluded. Only email or phone are permitted credentials.
        if (rawIdentifier.includes('@') ? matchEmail : matchPhone) {
          partner = p;
          break;
        }
      }
    }

    if (!partner) {
      throw new Error('Invalid credentials. Please log in using your registered Email Address or Mobile Number.');
    }

    if (partner.status === 'PENDING_REVIEW') {
      throw new Error('Account is pending Super Admin review');
    }

    if (partner.status === 'REJECTED') {
      throw new Error('Partner application was rejected');
    }

    if (partner.status === 'PAUSED') {
      throw new Error('Partner account is suspended');
    }

    if (!partner.passwordHash) {
      throw new Error('NO_PASSWORD_SET: No password configured for this partner account. Please contact Super Admin.');
    }

    const isMatch = await Bun.password.verify(params.password, partner.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    return {
      success: true,
      partner,
    };
  },

  async setPartnerPassword(partnerId: string, plainPassword: string): Promise<Partner> {
    const cleanPassword = (plainPassword || '').trim();
    if (cleanPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const partner = await this.getPartnerById(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    const passwordHash = await Bun.password.hash(cleanPassword, { algorithm: 'bcrypt', cost: 10 });
    partner.passwordHash = passwordHash;
    partner.hasPassword = true;
    partner.updatedAt = new Date();

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query('UPDATE partners SET password_hash = ?, updated_at = ? WHERE id = ?', [
          passwordHash,
          toMySqlDatetime(partner.updatedAt),
          partnerId,
        ]);
      } catch (err) {
        console.error('MySQL setPartnerPassword error:', err);
      }
    }

    memoryStore.partners.set(partner.id, partner);
    return partner;
  },

  async updatePayoutMethods(partnerId: string, bankData: UpdatePayoutMethodsInput): Promise<Partner> {
    const partner = await this.getPartnerById(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    if (bankData.payoutBankIfsc !== undefined) {
      if (bankData.payoutBankIfsc && bankData.payoutBankIfsc.trim()) {
        const ifsc = bankData.payoutBankIfsc.trim().toUpperCase();
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(ifsc)) {
          throw new Error('Invalid IFSC Code format');
        }
        partner.payoutBankIfsc = ifsc;
      } else {
        partner.payoutBankIfsc = null;
      }
    }

    if (bankData.payoutUpiId !== undefined) {
      partner.payoutUpiId = bankData.payoutUpiId ? bankData.payoutUpiId.trim() : null;
    }
    if (bankData.payoutHolderName !== undefined) {
      partner.payoutHolderName = bankData.payoutHolderName ? bankData.payoutHolderName.trim() : null;
    }
    if (bankData.payoutBankName !== undefined) {
      partner.payoutBankName = bankData.payoutBankName ? bankData.payoutBankName.trim() : null;
    }
    if (bankData.payoutBankAccount !== undefined) {
      partner.payoutBankAccount = bankData.payoutBankAccount ? bankData.payoutBankAccount.trim() : null;
    }
    if (bankData.payoutAccountType !== undefined) {
      partner.payoutAccountType = bankData.payoutAccountType;
    }
    partner.updatedAt = new Date();

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `UPDATE partners SET 
            payout_upi_id = ?, payout_holder_name = ?, payout_bank_name = ?, 
            payout_bank_account = ?, payout_bank_ifsc = ?, payout_account_type = ?, 
            updated_at = ? 
           WHERE id = ?`,
          [
            partner.payoutUpiId,
            partner.payoutHolderName,
            partner.payoutBankName,
            partner.payoutBankAccount,
            partner.payoutBankIfsc,
            partner.payoutAccountType,
            toMySqlDatetime(partner.updatedAt),
            partnerId,
          ]
        );
      } catch (err) {
        console.error('MySQL updatePayoutMethods error:', err);
      }
    }

    memoryStore.partners.set(partner.id, partner);
    return partner;
  },

  async requestPayoutByOption(params: {
    partnerId: string;
    amount: number;
    payoutMethod: PartnerPayoutMethod;
  }): Promise<PartnerPayoutRequest> {
    const partner = await this.getPartnerById(params.partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${params.partnerId}`);
    }

    let payoutTarget = '';
    if (params.payoutMethod === 'BANK_TRANSFER') {
      if (!partner.payoutBankAccount || !partner.payoutBankIfsc) {
        throw new Error('Bank account details not configured in profile');
      }
      payoutTarget = `${partner.payoutBankName ? partner.payoutBankName + ' ' : ''}A/C: ${partner.payoutBankAccount} (IFSC: ${partner.payoutBankIfsc})`;
    } else if (params.payoutMethod === 'UPI') {
      if (!partner.payoutUpiId) {
        throw new Error('UPI ID not configured in profile');
      }
      payoutTarget = partner.payoutUpiId;
    } else {
      throw new Error(`Unsupported payout method: ${params.payoutMethod}`);
    }

    return await this.requestPayout({
      partnerId: params.partnerId,
      amount: params.amount,
      payoutMethod: params.payoutMethod,
      payoutTarget,
    });
  },

  async quoteReferralDiscount(params: QuoteReferralDiscountInput): Promise<ReferralDiscountQuote> {
    const code = (params.partnerCode || '').trim();
    if (!code) {
      return {
        isValid: false,
        discountPercent: 0,
        discountAmount: 0,
        netPayableAmount: params.basePrice,
        message: 'No partner code provided',
      };
    }

    const partner = await this.getPartnerByCode(code);
    if (!partner || partner.status !== 'ACTIVE') {
      // Check if this is a Salon Owner B2B referral code (e.g. REF_GETSALON)
      const { referralService } = await import('../../wallet/referral.service');
      const referrerOrgId = await referralService.resolveReferrerOrg(code);
      if (referrerOrgId) {
        const { organizationRepo } = await import('./organization.repo');
        const org = await organizationRepo.getOrganizationById(referrerOrgId);
        const { repository } = await import('../repository');
        const platformSettings = repository.getPlatformSettings();
        const discountPercent = platformSettings.b2bReferral?.refereeDiscountPercent ?? 20;
        const discountAmount = Number(((params.basePrice * discountPercent) / 100).toFixed(2));
        const netPayableAmount = Math.max(0, Number((params.basePrice - discountAmount).toFixed(2)));

        return {
          isValid: true,
          partnerId: referrerOrgId,
          partnerName: org?.name || 'Partner Salon Owner',
          city: 'Verified Salon Partner',
          discountPercent,
          discountAmount,
          netPayableAmount,
          message: `${discountPercent}% Salon Referral Discount applied!`,
        };
      }

      return {
        isValid: false,
        discountPercent: 0,
        discountAmount: 0,
        netPayableAmount: params.basePrice,
        message: 'Invalid or inactive partner referral code',
      };
    }

    const settings = await this.getProgramSettings();
    const discountPercent = settings.defaultReferralDiscountPercent || 10;
    const discountAmount = Number(((params.basePrice * discountPercent) / 100).toFixed(2));
    const netPayableAmount = Number((params.basePrice - discountAmount).toFixed(2));

    return {
      isValid: true,
      partnerId: partner.id,
      partnerName: partner.fullName,
      city: partner.city,
      discountPercent,
      discountAmount,
      netPayableAmount,
      message: `Special ${discountPercent}% Partner Discount applied!`,
    };
  },

  async getProgramSettings(): Promise<PartnerProgramSettings> {
    if (!memoryStore.partnerProgramSettings) {
      memoryStore.partnerProgramSettings = { ...defaultPartnerProgramSettings };
    }
    return memoryStore.partnerProgramSettings;
  },

  async updateProgramSettings(updates: Partial<PartnerProgramSettings>): Promise<PartnerProgramSettings> {
    const current = await this.getProgramSettings();
    const updated: PartnerProgramSettings = {
      ...current,
      ...updates,
      defaultCommissionPercent:
        updates.defaultCommissionPercent !== undefined
          ? Number(updates.defaultCommissionPercent)
          : current.defaultCommissionPercent,
      defaultBountyAmount:
        updates.defaultBountyAmount !== undefined
          ? Number(updates.defaultBountyAmount)
          : current.defaultBountyAmount,
      defaultReferralDiscountPercent:
        updates.defaultReferralDiscountPercent !== undefined
          ? Number(updates.defaultReferralDiscountPercent)
          : current.defaultReferralDiscountPercent,
      qualificationTicketsThreshold:
        updates.qualificationTicketsThreshold !== undefined
          ? Number(updates.qualificationTicketsThreshold)
          : current.qualificationTicketsThreshold,
      minPayoutThreshold:
        updates.minPayoutThreshold !== undefined
          ? Number(updates.minPayoutThreshold)
          : current.minPayoutThreshold,
      autoApprovePartners:
        updates.autoApprovePartners !== undefined
          ? Boolean(updates.autoApprovePartners)
          : current.autoApprovePartners,
    };
    memoryStore.partnerProgramSettings = updated;
    return updated;
  },

  async getMarketingContent(): Promise<PartnerMarketingContent> {
    if (!memoryStore.partnerMarketingContent) {
      memoryStore.partnerMarketingContent = { ...defaultPartnerMarketingContent };
    }
    return memoryStore.partnerMarketingContent;
  },

  async updateMarketingContent(updates: Partial<PartnerMarketingContent>): Promise<PartnerMarketingContent> {
    const current = await this.getMarketingContent();
    const updated: PartnerMarketingContent = {
      ...current,
      ...updates,
    };
    memoryStore.partnerMarketingContent = updated;
    return updated;
  },

  async getAllAttributionsWithDetails(): Promise<any[]> {
    const attributions = Array.from(memoryStore.partnerAttributions.values());
    const enriched = await Promise.all(
      attributions.map(async (attr) => {
        const partner = await this.getPartnerById(attr.partnerId);
        const salon = memoryStore.salons.get(attr.salonId);
        return {
          id: attr.id,
          partnerId: attr.partnerId,
          partnerName: partner?.fullName || 'Unknown Partner',
          partnerCode: partner?.referralCode || 'N/A',
          partnerPhone: partner?.phone || '',
          salonId: attr.salonId,
          salonName: salon?.name || 'Partner Salon',
          salonPhone: salon?.phone || '',
          source: attr.source,
          qualificationStatus: attr.qualificationStatus,
          ticketsCompletedCount: attr.ticketsCompletedCount,
          firstPaidPlanAt: attr.firstPaidPlanAt,
          commissionExpiresAt: attr.commissionExpiresAt,
          createdAt: attr.createdAt,
        };
      })
    );
    return enriched.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  },

  async reassignAttribution(attributionId: string, newPartnerId: string): Promise<any> {
    let attr = memoryStore.partnerAttributions.get(attributionId);
    if (!attr) {
      for (const a of memoryStore.partnerAttributions.values()) {
        if (a.id === attributionId || a.salonId === attributionId) {
          attr = a;
          break;
        }
      }
    }
    if (!attr) {
      throw new Error(`Attribution not found: ${attributionId}`);
    }
    const newPartner = await this.getPartnerById(newPartnerId);
    if (!newPartner) {
      throw new Error(`Partner not found: ${newPartnerId}`);
    }

    attr.partnerId = newPartner.id;
    attr.source = 'ADMIN_ASSIGNED';
    memoryStore.partnerAttributions.set(attr.salonId, attr);
    memoryStore.partnerAttributions.set(attr.id, attr);
    return attr;
  },

  async createManualAttribution(salonId: string, partnerId: string): Promise<any> {
    const partner = await this.getPartnerById(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }
    const existing = Array.from(memoryStore.partnerAttributions.values()).find((a) => a.salonId === salonId);
    if (existing) {
      existing.partnerId = partner.id;
      existing.source = 'ADMIN_ASSIGNED';
      memoryStore.partnerAttributions.set(existing.id, existing);
      return existing;
    }
    return this.createAttribution({
      partnerId: partner.id,
      salonId,
      source: 'ADMIN_ASSIGNED',
      qualificationStatus: 'UNQUALIFIED',
    });
  },
};
