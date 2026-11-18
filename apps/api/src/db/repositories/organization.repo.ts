import { isMySqlConnected, getDb } from '../mysql';
import type { Organization, SubscriptionTier, Salon } from '../../engine/types';
import { memoryStore } from './store';
import { planRepo } from './plan.repo';

export const organizationRepo = {
  async getOrganizationById(id: string): Promise<Organization | null> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query('SELECT * FROM organizations WHERE id = ? LIMIT 1', [id]);
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        tier: r.tier,
        planId: r.plan_id || null,
        ownerId: r.owner_id,
        maxBranches: Number(r.max_branches),
        maxStylistsPerBranch: Number(r.max_stylists_per_branch),
        createdAt: r.created_at,
      };
    }
    return memoryStore.organizations.get(id) || null;
  },

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query('SELECT * FROM organizations WHERE slug = ? LIMIT 1', [slug]);
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        tier: r.tier,
        planId: r.plan_id || null,
        ownerId: r.owner_id,
        maxBranches: Number(r.max_branches),
        maxStylistsPerBranch: Number(r.max_stylists_per_branch),
        createdAt: r.created_at,
      };
    }
    return memoryStore.organizations.get(slug) || null;
  },

  async getAllOrganizations(): Promise<Organization[]> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query('SELECT * FROM organizations');
      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        tier: r.tier,
        planId: r.plan_id || null,
        ownerId: r.owner_id,
        maxBranches: Number(r.max_branches),
        maxStylistsPerBranch: Number(r.max_stylists_per_branch),
        createdAt: r.created_at,
      }));
    }
    const unique = new Set(memoryStore.organizations.values());
    return Array.from(unique);
  },

  async createOrganization(params: {
    name: string;
    slug?: string;
    tier?: SubscriptionTier;
    planId?: string | null;
    ownerId?: string | null;
    maxBranches?: number;
    maxStylistsPerBranch?: number;
  }): Promise<Organization> {
    const rawSlug = (params.slug || params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || 'org';
    let slug = rawSlug;
    let counter = 1;
    while (await this.getOrganizationBySlug(slug)) {
      slug = `${rawSlug}-${counter++}`;
    }

    let tier: SubscriptionTier = params.tier === 'FREE' ? 'FREE' : params.tier === 'PRO' || params.tier === 'ENTERPRISE' ? params.tier : 'STARTER';
    let maxBranches = params.maxBranches;
    let maxStylistsPerBranch = params.maxStylistsPerBranch;

    if (params.planId) {
      let plan = await planRepo.getPlanById(params.planId);
      if (!plan) {
        plan = await planRepo.getPlanBySlug(params.planId);
      }
      if (plan) {
        if (!params.tier) {
          const badgeUpper = (plan.badge || '').toUpperCase();
          const slugUpper = (plan.slug || '').toUpperCase();
          const nameUpper = (plan.name || '').toUpperCase();
          if (badgeUpper.includes('ENTERPRISE') || slugUpper.includes('ENTERPRISE') || nameUpper.includes('ENTERPRISE') || plan.maxBranches > 5) {
            tier = 'ENTERPRISE';
          } else if (badgeUpper.includes('POPULAR') || badgeUpper.includes('PRO') || slugUpper.includes('PRO') || nameUpper.includes('PRO') || plan.maxBranches > 1 || plan.maxStylistsPerBranch > 2) {
            tier = 'PRO';
          } else if (badgeUpper.includes('FREE') || slugUpper.includes('FREE') || nameUpper.includes('FREE') || (Number(plan.price1m) === 0 && Number(plan.price3m) === 0)) {
            tier = 'FREE';
          } else {
            tier = 'STARTER';
          }
        }
        if (maxBranches === undefined) maxBranches = plan.maxBranches;
        if (maxStylistsPerBranch === undefined) maxStylistsPerBranch = plan.maxStylistsPerBranch;
      }
    }

    if (maxBranches === undefined || maxStylistsPerBranch === undefined) {
      const limits = {
        FREE: { maxBranches: 1, maxStylistsPerBranch: 1 },
        STARTER: { maxBranches: 1, maxStylistsPerBranch: 1 },
        PRO: { maxBranches: 3, maxStylistsPerBranch: 10 },
        ENTERPRISE: { maxBranches: 999, maxStylistsPerBranch: 999 },
      }[tier] || { maxBranches: 1, maxStylistsPerBranch: 1 };
      if (maxBranches === undefined) maxBranches = limits.maxBranches;
      if (maxStylistsPerBranch === undefined) maxStylistsPerBranch = limits.maxStylistsPerBranch;
    }

    const org: Organization = {
      id: 'org-' + Math.random().toString(36).substring(2, 9),
      name: params.name,
      slug,
      tier,
      planId: params.planId || null,
      ownerId: params.ownerId || null,
      maxBranches,
      maxStylistsPerBranch,
      createdAt: new Date(),
    };

    memoryStore.organizations.set(org.id, org);
    memoryStore.organizations.set(org.slug, org);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `INSERT INTO organizations (id, name, slug, tier, plan_id, owner_id, max_branches, max_stylists_per_branch)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [org.id, org.name, org.slug, org.tier, org.planId || null, org.ownerId, org.maxBranches, org.maxStylistsPerBranch]
      );
    }

    return org;
  },

  async getSalonsByOrganizationId(orgId: string, getAllSalonsFn: () => Promise<Salon[]>): Promise<Salon[]> {
    const all = await getAllSalonsFn();
    return all.filter((s) => s.organizationId === orgId);
  },

  async updateOrganizationTier(orgId: string, tier: SubscriptionTier): Promise<Organization | null> {
    const limits = {
      STARTER: { maxBranches: 1, maxStylistsPerBranch: 1, planId: 'plan-starter-01' },
      PRO: { maxBranches: 3, maxStylistsPerBranch: 10, planId: 'plan-pro-01' },
      ENTERPRISE: { maxBranches: 999, maxStylistsPerBranch: 999, planId: 'plan-enterprise-01' },
    }[tier] || { maxBranches: 1, maxStylistsPerBranch: 1, planId: 'plan-starter-01' };

    const org = await this.getOrganizationById(orgId);
    if (!org) return null;

    org.tier = tier;
    org.planId = limits.planId;
    org.maxBranches = limits.maxBranches;
    org.maxStylistsPerBranch = limits.maxStylistsPerBranch;

    memoryStore.organizations.set(org.id, org);
    memoryStore.organizations.set(org.slug, org);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        'UPDATE organizations SET tier = ?, plan_id = ?, max_branches = ?, max_stylists_per_branch = ? WHERE id = ?',
        [tier, limits.planId, limits.maxBranches, limits.maxStylistsPerBranch, orgId]
      );
    }
    return org;
  },

  async updateOrganizationPlan(orgId: string, planId: string): Promise<Organization | null> {
    const org = await this.getOrganizationById(orgId);
    if (!org) return null;

    let plan = await planRepo.getPlanById(planId);
    if (!plan) {
      plan = await planRepo.getPlanBySlug(planId);
    }
    if (!plan) return null;

    let newTier: SubscriptionTier = 'STARTER';
    const badgeUpper = (plan.badge || '').toUpperCase();
    const slugUpper = (plan.slug || '').toUpperCase();
    const nameUpper = (plan.name || '').toUpperCase();
    if (badgeUpper.includes('ENTERPRISE') || slugUpper.includes('ENTERPRISE') || nameUpper.includes('ENTERPRISE') || plan.maxBranches > 5) {
      newTier = 'ENTERPRISE';
    } else if (badgeUpper.includes('POPULAR') || badgeUpper.includes('PRO') || slugUpper.includes('PRO') || nameUpper.includes('PRO') || plan.maxBranches > 1 || plan.maxStylistsPerBranch > 2) {
      newTier = 'PRO';
    } else if (badgeUpper.includes('FREE') || slugUpper.includes('FREE') || nameUpper.includes('FREE') || (plan.price1m === 0 && plan.price3m === 0)) {
      newTier = 'FREE';
    }

    org.tier = newTier;
    org.planId = plan.id;
    org.maxBranches = plan.maxBranches;
    org.maxStylistsPerBranch = plan.maxStylistsPerBranch;

    memoryStore.organizations.set(org.id, org);
    memoryStore.organizations.set(org.slug, org);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        'UPDATE organizations SET tier = ?, plan_id = ?, max_branches = ?, max_stylists_per_branch = ? WHERE id = ?',
        [newTier, plan.id, plan.maxBranches, plan.maxStylistsPerBranch, orgId]
      );
    }
    return org;
  },

  async checkOrganizationBranchQuota(
    orgId: string,
    getAllSalonsFn: () => Promise<Salon[]>
  ): Promise<{ allowed: boolean; current: number; max: number; tier: SubscriptionTier; planId?: string | null }> {
    const org = await this.getOrganizationById(orgId);
    if (!org) return { allowed: true, current: 0, max: 999, tier: 'ENTERPRISE', planId: null };

    const planRef = org.planId || org.tier;
    let plan = planRef ? await planRepo.getPlanById(planRef) : null;
    if (!plan && planRef) {
      plan = await planRepo.getPlanBySlug(planRef.toLowerCase());
    }
    const maxBranches = plan?.maxBranches ?? org.maxBranches ?? 1;

    const branches = await this.getSalonsByOrganizationId(orgId, getAllSalonsFn);
    return {
      allowed: branches.length < maxBranches,
      current: branches.length,
      max: maxBranches,
      tier: org.tier,
      planId: org.planId,
    };
  },

  async checkSalonStylistQuota(
    salonId: string,
    getAllSalonsFn: () => Promise<Salon[]>
  ): Promise<{ allowed: boolean; current: number; max: number; tier: SubscriptionTier; planId?: string | null }> {
    const all = await getAllSalonsFn();
    const salon = all.find((s) => s.id === salonId);
    if (!salon || !salon.organizationId) {
      return { allowed: true, current: salon ? salon.stylists.length : 0, max: 999, tier: 'ENTERPRISE', planId: null };
    }
    const org = await this.getOrganizationById(salon.organizationId);
    if (!org) {
      return { allowed: true, current: salon.stylists.length, max: 999, tier: 'ENTERPRISE', planId: null };
    }

    const planRef = org.planId || org.tier;
    let plan = planRef ? await planRepo.getPlanById(planRef) : null;
    if (!plan && planRef) {
      plan = await planRepo.getPlanBySlug(planRef.toLowerCase());
    }
    const maxStylists = plan?.maxStylistsPerBranch ?? org.maxStylistsPerBranch ?? 2;

    return {
      allowed: salon.stylists.length < maxStylists,
      current: salon.stylists.length,
      max: maxStylists,
      tier: org.tier,
      planId: org.planId,
    };
  },
};
