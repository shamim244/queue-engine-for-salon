import { isMySqlConnected, getDb } from '../mysql';
import type {
  PaymentOrder,
  OrganizationSubscription,
  PaymentOrderStatus,
} from '../../engine/types';
import { memoryStore, toMySqlDatetime } from './store';

function mapRowToOrder(r: any): PaymentOrder {
  let paymentData = null;
  if (r.payment_data) {
    paymentData = typeof r.payment_data === 'string' ? JSON.parse(r.payment_data) : r.payment_data;
  }
  let metadata = null;
  if (r.metadata) {
    metadata = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
  }

  return {
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    organizationId: r.organization_id || null,
    salonId: r.salon_id || null,
    customerId: r.customer_id || null,
    amount: Number(r.amount),
    currency: r.currency || 'INR',
    provider: r.provider,
    providerOrderId: r.provider_order_id || null,
    transactionRef: r.transaction_ref || null,
    status: r.status,
    paymentData,
    metadata,
    expiresAt: r.expires_at,
    completedAt: r.completed_at || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapRowToSubscription(r: any): OrganizationSubscription {
  return {
    id: r.id,
    organizationId: r.organization_id,
    planId: r.plan_id,
    cycle: r.cycle,
    startsAt: r.starts_at,
    expiresAt: r.expires_at,
    basePrice: Number(r.base_price),
    couponId: r.coupon_id || null,
    couponDiscount: Number(r.coupon_discount || 0),
    walletDeducted: Number(r.wallet_deducted || 0),
    netAmountPaid: Number(r.net_amount_paid),
    paymentMethod: r.payment_method,
    paymentOrderId: r.payment_order_id || null,
    transactionRef: r.transaction_ref || null,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const paymentRepo = {
  async createOrder(order: PaymentOrder): Promise<PaymentOrder> {
    // 1. Save in memoryStore
    memoryStore.paymentOrders.set(order.id, order);

    // 2. Persist in MySQL if connected
    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `INSERT INTO payment_orders (
            id, target_type, target_id, organization_id, salon_id, customer_id,
            amount, currency, provider, provider_order_id, transaction_ref,
            status, payment_data, metadata, expires_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order.id,
            order.targetType,
            order.targetId,
            order.organizationId || null,
            order.salonId || null,
            order.customerId || null,
            order.amount,
            order.currency,
            order.provider,
            order.providerOrderId || null,
            order.transactionRef || null,
            order.status,
            order.paymentData ? JSON.stringify(order.paymentData) : null,
            order.metadata ? JSON.stringify(order.metadata) : null,
            toMySqlDatetime(order.expiresAt),
            toMySqlDatetime(order.completedAt),
          ]
        );
      } catch (err: any) {
        console.warn(`[paymentRepo.createOrder] MySQL fallback: ${err.message}`);
      }
    }

    return order;
  },

  async getOrderById(orderId: string): Promise<PaymentOrder | null> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>('SELECT * FROM payment_orders WHERE id = ?', [orderId]);
        if (rows && rows.length > 0) {
          const order = mapRowToOrder(rows[0]);
          memoryStore.paymentOrders.set(order.id, order);
          return order;
        }
      } catch (err: any) {
        console.warn(`[paymentRepo.getOrderById] MySQL error: ${err.message}`);
      }
    }

    return memoryStore.paymentOrders.get(orderId) || null;
  },

  async updateOrderStatus(
    orderId: string,
    status: PaymentOrderStatus,
    transactionRef?: string,
    completedAt?: Date | string
  ): Promise<PaymentOrder | null> {
    const existing = await this.getOrderById(orderId);
    if (!existing) return null;

    const updated: PaymentOrder = {
      ...existing,
      status,
      transactionRef: transactionRef || existing.transactionRef,
      completedAt: completedAt || existing.completedAt,
      updatedAt: new Date(),
    };

    memoryStore.paymentOrders.set(orderId, updated);

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `UPDATE payment_orders 
           SET status = ?, transaction_ref = ?, completed_at = ?, updated_at = NOW()
           WHERE id = ?`,
          [
            status,
            updated.transactionRef || null,
            toMySqlDatetime(updated.completedAt),
            orderId,
          ]
        );
      } catch (err: any) {
        console.warn(`[paymentRepo.updateOrderStatus] MySQL fallback: ${err.message}`);
      }
    }

    return updated;
  },

  async createSubscription(sub: OrganizationSubscription): Promise<OrganizationSubscription> {
    memoryStore.organizationSubscriptions.set(sub.id, sub);

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `INSERT INTO organization_subscriptions (
            id, organization_id, plan_id, cycle, starts_at, expires_at,
            base_price, coupon_id, coupon_discount, wallet_deducted,
            net_amount_paid, payment_method, payment_order_id, transaction_ref, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sub.id,
            sub.organizationId,
            sub.planId,
            sub.cycle,
            toMySqlDatetime(sub.startsAt),
            toMySqlDatetime(sub.expiresAt),
            sub.basePrice,
            sub.couponId || null,
            sub.couponDiscount,
            sub.walletDeducted,
            sub.netAmountPaid,
            sub.paymentMethod,
            sub.paymentOrderId || null,
            sub.transactionRef || null,
            sub.status,
          ]
        );
      } catch (err: any) {
        console.warn(`[paymentRepo.createSubscription] MySQL fallback: ${err.message}`);
      }
    }

    return sub;
  },

  async getActiveSubscriptionByOrgId(orgId: string): Promise<OrganizationSubscription | null> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          `SELECT * FROM organization_subscriptions 
           WHERE organization_id = ? AND status = 'ACTIVE' AND expires_at > NOW()
           ORDER BY expires_at DESC LIMIT 1`,
          [orgId]
        );
        if (rows && rows.length > 0) {
          const sub = mapRowToSubscription(rows[0]);
          memoryStore.organizationSubscriptions.set(sub.id, sub);
          return sub;
        }
      } catch (err: any) {
        console.warn(`[paymentRepo.getActiveSubscriptionByOrgId] MySQL error: ${err.message}`);
      }
    }

    // Fallback to memoryStore
    const now = new Date();
    for (const sub of memoryStore.organizationSubscriptions.values()) {
      if (
        sub.organizationId === orgId &&
        sub.status === 'ACTIVE' &&
        new Date(sub.expiresAt) > now
      ) {
        return sub;
      }
    }

    return null;
  },
};
