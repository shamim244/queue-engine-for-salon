import { isMySqlConnected, getDb } from '../mysql';
import type {
  PaymentOrder,
  OrganizationSubscription,
  PaymentOrderStatus,
  PaymentGatewaySettings,
} from '../../engine/types';
import { memoryStore, toMySqlDatetime, defaultPaymentGatewaySettings } from './store';

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
    utrNumber: r.utr_number || null,
    paymentProofNote: r.payment_proof_note || null,
    reviewedBy: r.reviewed_by || null,
    reviewedAt: r.reviewed_at || null,
    rejectionReason: r.rejection_reason || null,
    status: r.status,
    paymentData,
    metadata,
    expiresAt: r.expires_at,
    completedAt: r.completed_at || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapRowToGatewaySettings(r: any): PaymentGatewaySettings {
  return {
    id: r.id,
    upiManualEnabled: Boolean(r.upi_manual_enabled),
    upiVpa: r.upi_vpa || 'salonpayments@icici',
    upiMerchantName: r.upi_merchant_name || 'Salon Queue SaaS',
    cashEnabled: Boolean(r.cash_enabled),
    cashInstructions: r.cash_instructions || 'Pay at salon head office or deposit cash to our designated bank account.',
    razorpayEnabled: Boolean(r.razorpay_enabled),
    razorpayKeyId: r.razorpay_key_id || '',
    razorpayKeySecret: r.razorpay_key_secret || '',
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
            utr_number, payment_proof_note, reviewed_by, reviewed_at, rejection_reason,
            status, payment_data, metadata, expires_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            order.utrNumber || null,
            order.paymentProofNote || null,
            order.reviewedBy || null,
            toMySqlDatetime(order.reviewedAt),
            order.rejectionReason || null,
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

  async getGatewaySettings(): Promise<PaymentGatewaySettings> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          'SELECT * FROM payment_gateway_settings WHERE id = ?',
          ['default_gateway_settings']
        );
        if (rows && rows.length > 0) {
          const settings = mapRowToGatewaySettings(rows[0]);
          memoryStore.gatewaySettings = settings;
          return settings;
        }
      } catch (err: any) {
        console.warn(`[paymentRepo.getGatewaySettings] MySQL fallback: ${err.message}`);
      }
    }
    return memoryStore.gatewaySettings || { ...defaultPaymentGatewaySettings };
  },

  async updateGatewaySettings(
    patch: Partial<PaymentGatewaySettings>
  ): Promise<PaymentGatewaySettings> {
    const current = await this.getGatewaySettings();
    const updated: PaymentGatewaySettings = {
      ...current,
      ...patch,
      updatedAt: new Date(),
    };
    memoryStore.gatewaySettings = updated;

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `INSERT INTO payment_gateway_settings (
            id, upi_manual_enabled, upi_vpa, upi_merchant_name, cash_enabled,
            cash_instructions, razorpay_enabled, razorpay_key_id, razorpay_key_secret
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            upi_manual_enabled = VALUES(upi_manual_enabled),
            upi_vpa = VALUES(upi_vpa),
            upi_merchant_name = VALUES(upi_merchant_name),
            cash_enabled = VALUES(cash_enabled),
            cash_instructions = VALUES(cash_instructions),
            razorpay_enabled = VALUES(razorpay_enabled),
            razorpay_key_id = VALUES(razorpay_key_id),
            razorpay_key_secret = VALUES(razorpay_key_secret),
            updated_at = NOW()`,
          [
            'default_gateway_settings',
            updated.upiManualEnabled,
            updated.upiVpa,
            updated.upiMerchantName,
            updated.cashEnabled,
            updated.cashInstructions,
            updated.razorpayEnabled,
            updated.razorpayKeyId || null,
            updated.razorpayKeySecret || null,
          ]
        );
      } catch (err: any) {
        console.warn(`[paymentRepo.updateGatewaySettings] MySQL fallback: ${err.message}`);
      }
    }

    return updated;
  },

  async getPendingApprovalOrders(): Promise<PaymentOrder[]> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          `SELECT * FROM payment_orders 
           WHERE status = 'PENDING_APPROVAL' 
           ORDER BY created_at DESC`
        );
        if (rows) {
          return rows.map((r) => {
            const o = mapRowToOrder(r);
            memoryStore.paymentOrders.set(o.id, o);
            return o;
          });
        }
      } catch (err: any) {
        console.warn(`[paymentRepo.getPendingApprovalOrders] MySQL fallback: ${err.message}`);
      }
    }

    const list: PaymentOrder[] = [];
    for (const order of memoryStore.paymentOrders.values()) {
      if (order.status === 'PENDING_APPROVAL') {
        list.push(order);
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getAllOrders(options?: {
    status?: string;
    provider?: string;
    organizationId?: string;
    limit?: number;
  }): Promise<PaymentOrder[]> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const conditions: string[] = [];
        const params: any[] = [];

        if (options?.status && options.status !== 'ALL') {
          conditions.push('status = ?');
          params.push(options.status);
        }
        if (options?.provider && options.provider !== 'ALL') {
          conditions.push('provider = ?');
          params.push(options.provider);
        }
        if (options?.organizationId) {
          conditions.push('organization_id = ?');
          params.push(options.organizationId);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limitClause = options?.limit ? `LIMIT ${Number(options.limit)}` : 'LIMIT 100';

        const [rows] = await db.query<any[]>(
          `SELECT * FROM payment_orders ${whereClause} ORDER BY created_at DESC ${limitClause}`,
          params
        );
        if (rows) {
          return rows.map((r) => {
            const o = mapRowToOrder(r);
            memoryStore.paymentOrders.set(o.id, o);
            return o;
          });
        }
      } catch (err: any) {
        console.warn(`[paymentRepo.getAllOrders] MySQL fallback: ${err.message}`);
      }
    }

    let list: PaymentOrder[] = Array.from(memoryStore.paymentOrders.values());
    if (options?.status && options.status !== 'ALL') {
      list = list.filter((o) => o.status === options.status);
    }
    if (options?.provider && options.provider !== 'ALL') {
      list = list.filter((o) => o.provider === options.provider);
    }
    if (options?.organizationId) {
      list = list.filter((o) => o.organizationId === options.organizationId);
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (options?.limit) {
      list = list.slice(0, options.limit);
    }
    return list;
  },

  async submitManualPayment(
    orderId: string,
    utrNumber?: string,
    notes?: string
  ): Promise<PaymentOrder | null> {
    const existing = await this.getOrderById(orderId);
    if (!existing) return null;

    const updated: PaymentOrder = {
      ...existing,
      status: 'PENDING_APPROVAL',
      utrNumber: utrNumber || existing.utrNumber || null,
      paymentProofNote: notes || existing.paymentProofNote || null,
      updatedAt: new Date(),
    };

    memoryStore.paymentOrders.set(orderId, updated);

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `UPDATE payment_orders 
           SET status = 'PENDING_APPROVAL', 
               utr_number = ?, 
               payment_proof_note = ?, 
               updated_at = NOW()
           WHERE id = ?`,
          [updated.utrNumber, updated.paymentProofNote, orderId]
        );
      } catch (err: any) {
        console.warn(`[paymentRepo.submitManualPayment] MySQL fallback: ${err.message}`);
      }
    }

    return updated;
  },

  async claimOrderForProcessing(
    orderId: string,
    fromStatus: PaymentOrderStatus = 'PENDING_APPROVAL'
  ): Promise<boolean> {
    const existing = await this.getOrderById(orderId);
    if (!existing || existing.status !== fromStatus) {
      return false;
    }

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [result]: any = await db.query(
          `UPDATE payment_orders 
           SET status = 'PROCESSING', updated_at = NOW()
           WHERE id = ? AND status = ?`,
          [orderId, fromStatus]
        );
        if (result && result.affectedRows === 0) {
          return false;
        }
      } catch (err: any) {
        console.warn(`[paymentRepo.claimOrderForProcessing] MySQL fallback: ${err.message}`);
      }
    }

    existing.status = 'PROCESSING';
    existing.updatedAt = new Date();
    return true;
  },

  async approvePaymentOrder(
    orderId: string,
    adminId?: string,
    transactionRef?: string
  ): Promise<PaymentOrder | null> {
    const existing = await this.getOrderById(orderId);
    if (!existing) return null;

    const now = new Date();
    const ref = transactionRef || existing.utrNumber || `APPROVE_${Date.now()}`;
    const updated: PaymentOrder = {
      ...existing,
      status: 'COMPLETED',
      transactionRef: ref,
      reviewedBy: adminId || 'admin',
      reviewedAt: now,
      completedAt: now,
      updatedAt: now,
    };

    memoryStore.paymentOrders.set(orderId, updated);

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `UPDATE payment_orders 
           SET status = 'COMPLETED', 
               transaction_ref = ?, 
               reviewed_by = ?, 
               reviewed_at = NOW(), 
               completed_at = NOW(), 
               updated_at = NOW()
           WHERE id = ?`,
          [ref, updated.reviewedBy, orderId]
        );
      } catch (err: any) {
        console.warn(`[paymentRepo.approvePaymentOrder] MySQL fallback: ${err.message}`);
      }
    }

    return updated;
  },

  async rejectPaymentOrder(
    orderId: string,
    reason: string,
    adminId?: string
  ): Promise<PaymentOrder | null> {
    const existing = await this.getOrderById(orderId);
    if (!existing) return null;

    const now = new Date();
    const updated: PaymentOrder = {
      ...existing,
      status: 'REJECTED',
      rejectionReason: reason,
      reviewedBy: adminId || 'admin',
      reviewedAt: now,
      updatedAt: now,
    };

    memoryStore.paymentOrders.set(orderId, updated);

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `UPDATE payment_orders 
           SET status = 'REJECTED', 
               rejection_reason = ?, 
               reviewed_by = ?, 
               reviewed_at = NOW(), 
               updated_at = NOW()
           WHERE id = ?`,
          [reason, updated.reviewedBy, orderId]
        );
      } catch (err: any) {
        console.warn(`[paymentRepo.rejectPaymentOrder] MySQL fallback: ${err.message}`);
      }
    }

    return updated;
  },
};
