import { isMySqlConnected, getDb } from '../mysql';
import type { SubscriptionPlan, CreatePlanPayload } from '../../engine/types';
import { memoryStore } from './store';

export interface PlanCacheEntry {
  data: SubscriptionPlan[];
  cachedAt: number;
}

let plansCatalogCache: { [key: string]: PlanCacheEntry } = {};
const PLAN_CACHE_TTL_MS = 60000;

export function invalidatePlanCache(): void {
  plansCatalogCache = {};
}

function mapRowToPlan(r: any): SubscriptionPlan {
  let features: string[] = [];
  if (r.features) {
    if (Array.isArray(r.features)) {
      features = r.features;
    } else if (typeof r.features === 'string') {
      try {
        features = JSON.parse(r.features);
      } catch {
        features = [];
      }
    }
  }

  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    badge: r.badge || null,
    description: r.description || null,
    price1m: Number(r.price_1m),
    price3m: r.price_3m !== null && r.price_3m !== undefined ? Number(r.price_3m) : null,
    price6m: r.price_6m !== null && r.price_6m !== undefined ? Number(r.price_6m) : null,
    price1y: r.price_1y !== null && r.price_1y !== undefined ? Number(r.price_1y) : null,
    discountPct3m: Number(r.discount_pct_3m ?? 10),
    discountPct6m: Number(r.discount_pct_6m ?? 16),
    discountPct1y: Number(r.discount_pct_1y ?? 30),
    cycle1mEnabled: Boolean(r.cycle_1m_enabled),
    cycle3mEnabled: Boolean(r.cycle_3m_enabled),
    cycle6mEnabled: Boolean(r.cycle_6m_enabled),
    cycle1yEnabled: Boolean(r.cycle_1y_enabled),
    maxBranches: Number(r.max_branches ?? 1),
    maxStylistsPerBranch: Number(r.max_stylists_per_branch ?? 2),
    features,
    status: r.status,
    isFeatured: Boolean(r.is_featured),
    sortOrder: Number(r.sort_order ?? 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const planRepo = {
  invalidatePlanCache,

  async getAllPlans(options?: { status?: string }): Promise<SubscriptionPlan[]> {
    const statusFilter = options?.status || 'ACTIVE';
    const cacheKey = `plans_${statusFilter}`;
    const cached = plansCatalogCache[cacheKey];

    if (cached && Date.now() - cached.cachedAt < PLAN_CACHE_TTL_MS) {
      return cached.data;
    }

    let plans: SubscriptionPlan[] = [];

    if (isMySqlConnected) {
      const db = getDb();
      let query = 'SELECT * FROM subscription_plans';
      const params: any[] = [];

      if (statusFilter !== 'all') {
        query += ' WHERE status = ?';
        params.push(statusFilter);
      }

      query += ' ORDER BY sort_order ASC, price_1m ASC, created_at ASC';
      const [rows]: any = await db.query(query, params);
      plans = rows.map(mapRowToPlan);
    } else {
      const unique = new Set(memoryStore.plans.values());
      const all = Array.from(unique);
      if (statusFilter === 'all') {
        plans = all;
      } else {
        plans = all.filter((p) => p.status === statusFilter);
      }
      plans.sort((a, b) => a.sortOrder - b.sortOrder || a.price1m - b.price1m);
    }

    plansCatalogCache[cacheKey] = {
      data: plans,
      cachedAt: Date.now(),
    };

    return plans;
  },

  async getPlanById(id: string): Promise<SubscriptionPlan | null> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query('SELECT * FROM subscription_plans WHERE id = ? LIMIT 1', [id]);
      if (rows.length > 0) return mapRowToPlan(rows[0]);
    }
    return memoryStore.plans.get(id) || null;
  },

  async getPlanBySlug(slug: string): Promise<SubscriptionPlan | null> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query('SELECT * FROM subscription_plans WHERE slug = ? LIMIT 1', [slug]);
      if (rows.length > 0) return mapRowToPlan(rows[0]);
    }
    return memoryStore.plans.get(slug) || null;
  },

  async createPlan(payload: CreatePlanPayload): Promise<SubscriptionPlan> {
    const rawSlug = (payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || 'plan';
    let slug = rawSlug;
    let counter = 1;
    while (await this.getPlanBySlug(slug)) {
      slug = `${rawSlug}-${counter++}`;
    }

    const id = `plan-${Math.random().toString(36).substring(2, 9)}`;
    const discountPct3m = payload.discountPct3m ?? 10;
    const discountPct6m = payload.discountPct6m ?? 16;
    const discountPct1y = payload.discountPct1y ?? 30;

    const price3m = payload.price3m !== undefined ? payload.price3m : Math.round(payload.price1m * 3 * (1 - discountPct3m / 100));
    const price6m = payload.price6m !== undefined ? payload.price6m : Math.round(payload.price1m * 6 * (1 - discountPct6m / 100));
    const price1y = payload.price1y !== undefined ? payload.price1y : Math.round(payload.price1m * 12 * (1 - discountPct1y / 100));

    const plan: SubscriptionPlan = {
      id,
      name: payload.name,
      slug,
      badge: payload.badge || null,
      description: payload.description || null,
      price1m: payload.price1m,
      price3m,
      price6m,
      price1y,
      discountPct3m,
      discountPct6m,
      discountPct1y,
      cycle1mEnabled: payload.cycle1mEnabled ?? true,
      cycle3mEnabled: payload.cycle3mEnabled ?? true,
      cycle6mEnabled: payload.cycle6mEnabled ?? true,
      cycle1yEnabled: payload.cycle1yEnabled ?? true,
      maxBranches: payload.maxBranches ?? 1,
      maxStylistsPerBranch: payload.maxStylistsPerBranch ?? 2,
      features: payload.features || [],
      status: payload.status || 'ACTIVE',
      isFeatured: payload.isFeatured ?? false,
      sortOrder: payload.sortOrder ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memoryStore.plans.set(plan.id, plan);
    memoryStore.plans.set(plan.slug, plan);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `INSERT INTO subscription_plans (
          id, name, slug, badge, description,
          price_1m, price_3m, price_6m, price_1y,
          discount_pct_3m, discount_pct_6m, discount_pct_1y,
          cycle_1m_enabled, cycle_3m_enabled, cycle_6m_enabled, cycle_1y_enabled,
          max_branches, max_stylists_per_branch, features,
          status, is_featured, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          plan.id,
          plan.name,
          plan.slug,
          plan.badge,
          plan.description,
          plan.price1m,
          plan.price3m,
          plan.price6m,
          plan.price1y,
          plan.discountPct3m,
          plan.discountPct6m,
          plan.discountPct1y,
          plan.cycle1mEnabled,
          plan.cycle3mEnabled,
          plan.cycle6mEnabled,
          plan.cycle1yEnabled,
          plan.maxBranches,
          plan.maxStylistsPerBranch,
          JSON.stringify(plan.features),
          plan.status,
          plan.isFeatured,
          plan.sortOrder,
        ]
      );
    }

    invalidatePlanCache();
    return plan;
  },

  async updatePlan(id: string, updates: Partial<CreatePlanPayload>): Promise<SubscriptionPlan | null> {
    const existing = await this.getPlanById(id);
    if (!existing) return null;

    const updated: SubscriptionPlan = {
      ...existing,
      name: updates.name !== undefined ? updates.name : existing.name,
      badge: updates.badge !== undefined ? (updates.badge ? updates.badge : null) : existing.badge,
      description: updates.description !== undefined ? (updates.description ? updates.description : null) : existing.description,
      price1m: updates.price1m !== undefined ? updates.price1m : existing.price1m,
      price3m: updates.price3m !== undefined ? (updates.price3m !== null ? updates.price3m : null) : existing.price3m,
      price6m: updates.price6m !== undefined ? (updates.price6m !== null ? updates.price6m : null) : existing.price6m,
      price1y: updates.price1y !== undefined ? (updates.price1y !== null ? updates.price1y : null) : existing.price1y,
      discountPct3m: updates.discountPct3m !== undefined && updates.discountPct3m !== null ? updates.discountPct3m : existing.discountPct3m,
      discountPct6m: updates.discountPct6m !== undefined && updates.discountPct6m !== null ? updates.discountPct6m : existing.discountPct6m,
      discountPct1y: updates.discountPct1y !== undefined && updates.discountPct1y !== null ? updates.discountPct1y : existing.discountPct1y,
      cycle1mEnabled: updates.cycle1mEnabled !== undefined ? updates.cycle1mEnabled : existing.cycle1mEnabled,
      cycle3mEnabled: updates.cycle3mEnabled !== undefined ? updates.cycle3mEnabled : existing.cycle3mEnabled,
      cycle6mEnabled: updates.cycle6mEnabled !== undefined ? updates.cycle6mEnabled : existing.cycle6mEnabled,
      cycle1yEnabled: updates.cycle1yEnabled !== undefined ? updates.cycle1yEnabled : existing.cycle1yEnabled,
      maxBranches: updates.maxBranches !== undefined ? updates.maxBranches : existing.maxBranches,
      maxStylistsPerBranch: updates.maxStylistsPerBranch !== undefined ? updates.maxStylistsPerBranch : existing.maxStylistsPerBranch,
      features: updates.features !== undefined ? updates.features : existing.features,
      status: updates.status !== undefined ? updates.status : existing.status,
      isFeatured: updates.isFeatured !== undefined ? updates.isFeatured : existing.isFeatured,
      sortOrder: updates.sortOrder !== undefined ? updates.sortOrder : existing.sortOrder,
      updatedAt: new Date(),
    };

    memoryStore.plans.set(updated.id, updated);
    memoryStore.plans.set(updated.slug, updated);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `UPDATE subscription_plans SET
          name = ?, badge = ?, description = ?,
          price_1m = ?, price_3m = ?, price_6m = ?, price_1y = ?,
          discount_pct_3m = ?, discount_pct_6m = ?, discount_pct_1y = ?,
          cycle_1m_enabled = ?, cycle_3m_enabled = ?, cycle_6m_enabled = ?, cycle_1y_enabled = ?,
          max_branches = ?, max_stylists_per_branch = ?, features = ?,
          status = ?, is_featured = ?, sort_order = ?
        WHERE id = ?`,
        [
          updated.name,
          updated.badge,
          updated.description,
          updated.price1m,
          updated.price3m,
          updated.price6m,
          updated.price1y,
          updated.discountPct3m,
          updated.discountPct6m,
          updated.discountPct1y,
          updated.cycle1mEnabled,
          updated.cycle3mEnabled,
          updated.cycle6mEnabled,
          updated.cycle1yEnabled,
          updated.maxBranches,
          updated.maxStylistsPerBranch,
          JSON.stringify(updated.features),
          updated.status,
          updated.isFeatured,
          updated.sortOrder,
          updated.id,
        ]
      );
    }

    invalidatePlanCache();
    return updated;
  },

  async archivePlan(id: string): Promise<boolean> {
    const existing = await this.getPlanById(id);
    if (!existing) return false;

    existing.status = 'ARCHIVED';
    existing.updatedAt = new Date();

    memoryStore.plans.set(existing.id, existing);
    memoryStore.plans.set(existing.slug, existing);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query('UPDATE subscription_plans SET status = ? WHERE id = ?', ['ARCHIVED', id]);
    }

    invalidatePlanCache();
    return true;
  },
};
