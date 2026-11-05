import { isMySqlConnected, getDb } from '../mysql';
import type { Organization, SubscriptionTier, Salon } from '../../engine/types';
import { memoryStore } from './store';

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

    const tier: SubscriptionTier = params.tier === 'PRO' || params.tier === 'ENTERPRISE' ? params.tier : 'STARTER';
    const limits = {
      STARTER: { maxBranches: 1, maxStylistsPerBranch: 1 },
      PRO: { maxBranches: 3, maxStylistsPerBranch: 10 },
      ENTERPRISE: { maxBranches: 999, maxStylistsPerBranch: 999 },
    }[tier] || { maxBranches: 1, maxStylistsPerBranch: 1 };

    const org: Organization = {
      id: 'org-' + Math.random().toString(36).substring(2, 9),
      name: params.name,
      slug,
      tier,
      ownerId: params.ownerId || null,
      maxBranches: params.maxBranches ?? limits.maxBranches,
      maxStylistsPerBranch: params.maxStylistsPerBranch ?? limits.maxStylistsPerBranch,
      createdAt: new Date(),
    };

    memoryStore.organizations.set(org.id, org);
    memoryStore.organizations.set(org.slug, org);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `INSERT INTO organizations (id, name, slug, tier, owner_id, max_branches, max_stylists_per_branch)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [org.id, org.name, org.slug, org.tier, org.ownerId, org.maxBranches, org.maxStylistsPerBranch]
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
      STARTER: { maxBranches: 1, maxStylistsPerBranch: 1 },
      PRO: { maxBranches: 3, maxStylistsPerBranch: 10 },
      ENTERPRISE: { maxBranches: 999, maxStylistsPerBranch: 999 },
    }[tier] || { maxBranches: 1, maxStylistsPerBranch: 1 };

    const org = await this.getOrganizationById(orgId);
    if (!org) return null;

    org.tier = tier;
    org.maxBranches = limits.maxBranches;
    org.maxStylistsPerBranch = limits.maxStylistsPerBranch;

    memoryStore.organizations.set(org.id, org);
    memoryStore.organizations.set(org.slug, org);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        'UPDATE organizations SET tier = ?, max_branches = ?, max_stylists_per_branch = ? WHERE id = ?',
        [tier, limits.maxBranches, limits.maxStylistsPerBranch, orgId]
      );
    }
    return org;
  },

  async checkOrganizationBranchQuota(orgId: string, getAllSalonsFn: () => Promise<Salon[]>): Promise<{ allowed: boolean; current: number; max: number; tier: SubscriptionTier }> {
    const org = await this.getOrganizationById(orgId);
    if (!org) return { allowed: true, current: 0, max: 999, tier: 'ENTERPRISE' };
    const branches = await this.getSalonsByOrganizationId(orgId, getAllSalonsFn);
    return {
      allowed: branches.length < org.maxBranches,
      current: branches.length,
      max: org.maxBranches,
      tier: org.tier,
    };
  },

  async checkSalonStylistQuota(salonId: string, getAllSalonsFn: () => Promise<Salon[]>): Promise<{ allowed: boolean; current: number; max: number; tier: SubscriptionTier }> {
    const all = await getAllSalonsFn();
    const salon = all.find((s) => s.id === salonId);
    if (!salon || !salon.organizationId) {
      return { allowed: true, current: salon ? salon.stylists.length : 0, max: 999, tier: 'ENTERPRISE' };
    }
    const org = await this.getOrganizationById(salon.organizationId);
    if (!org) {
      return { allowed: true, current: salon.stylists.length, max: 999, tier: 'ENTERPRISE' };
    }
    return {
      allowed: salon.stylists.length < org.maxStylistsPerBranch,
      current: salon.stylists.length,
      max: org.maxStylistsPerBranch,
      tier: org.tier,
    };
  },
};
