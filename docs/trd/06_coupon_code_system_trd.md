# Technical Requirements Document (TRD): Omni-Channel Coupon Code System

## 1. Technical Architecture & Component Flow

```mermaid
flowchart TD
    Client["Client Checkout / Door QR<br/>(UniversalPaymentModal / Customer Desk)"]
    API["Elysia Coupon Routes<br/>(apps/api/src/routes/coupon.routes.ts)"]
    Service["Coupon Validation Service<br/>(apps/api/src/coupon/coupon.service.ts)"]
    Repo["Coupon Repository<br/>(apps/api/src/db/repositories/coupon.repo.ts)"]
    MySQL["MySQL Database & In-Memory Store<br/>(coupons & coupon_redemptions)"]
    Payment["Payment Fulfillment Pipeline<br/>(payment.service.ts)"]

    Client -->|1. POST /api/coupons/apply| API
    API -->|2. Validate Eligibility & Rules| Service
    Service -->|3. Check Existence & Quotas| Repo
    Repo <-->|4. Query DB & Ledger| MySQL
    Service -->|5. Return Discount Calculation| Client
    Client -->|6. Re-render Net Price & Badges| Client
    Client -->|7. POST /api/payments/create-order (with couponId)| Payment
    Payment -->|8. Record Redemption on Payment Verify| Repo
```

---

## 2. Database Schema

### 2.1 `coupons` Table
```sql
CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    target_type ENUM('SUBSCRIPTION', 'SALON_SERVICE') NOT NULL,
    organization_id VARCHAR(36) NULL,
    salon_id VARCHAR(36) NULL,
    discount_type ENUM('PERCENT', 'FLAT') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    max_discount_amount DECIMAL(10,2) NULL,
    min_order_amount DECIMAL(10,2) DEFAULT 0.00,
    max_uses INT NULL,
    used_count INT DEFAULT 0,
    max_uses_per_user INT DEFAULT 1,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP NULL,
    status ENUM('ACTIVE', 'INACTIVE', 'EXPIRED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_coupon_lookup (code, status),
    INDEX idx_coupon_org_salon (organization_id, salon_id)
) ENGINE=InnoDB;
```

### 2.2 `coupon_redemptions` Table
```sql
CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id VARCHAR(36) PRIMARY KEY,
    coupon_id VARCHAR(36) NOT NULL,
    target_type ENUM('SUBSCRIPTION', 'SALON_SERVICE') NOT NULL,
    target_order_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NULL,
    discount_applied DECIMAL(10,2) NOT NULL,
    redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_redemption_coupon_user (coupon_id, user_id),
    INDEX idx_redemption_order (target_order_id)
) ENGINE=InnoDB;
```

---

## 3. Core TypeScript Contracts & Interfaces

File: `apps/api/src/coupon/types.ts`
```ts
export type CouponTargetType = 'SUBSCRIPTION' | 'SALON_SERVICE';
export type CouponDiscountType = 'PERCENT' | 'FLAT';
export type CouponStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED';

export interface Coupon {
  id: string;
  code: string;
  targetType: CouponTargetType;
  organizationId?: string | null;
  salonId?: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount: number;
  maxUses?: number | null;
  usedCount: number;
  maxUsesPerUser: number;
  validFrom: Date | string;
  validUntil?: Date | string | null;
  status: CouponStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CouponRedemption {
  id: string;
  couponId: string;
  targetType: CouponTargetType;
  targetOrderId: string;
  userId?: string | null;
  discountApplied: number;
  redeemedAt: Date | string;
}

export interface ApplyCouponInput {
  code: string;
  targetType: CouponTargetType;
  orderAmount: number;
  userId?: string | null;
  organizationId?: string | null;
  salonId?: string | null;
}

export interface ApplyCouponResult {
  valid: boolean;
  message?: string;
  coupon?: {
    id: string;
    code: string;
    discountType: CouponDiscountType;
    discountValue: number;
    maxDiscountAmount?: number | null;
  };
  discountAmount: number;
  netPayable: number;
}
```

---

## 4. Discount Math & Validation Rules

### 4.1 Discount Math
$$\text{Raw Discount} = \begin{cases} 
\text{discountValue} & \text{if } \text{FLAT} \\ 
\text{orderAmount} \times \frac{\text{discountValue}}{100} & \text{if } \text{PERCENT} 
\end{cases}$$

$$\text{Capped Discount} = \begin{cases} 
\min(\text{Raw Discount}, \text{maxDiscountAmount}) & \text{if maxDiscountAmount is set} \\ 
\text{Raw Discount} & \text{otherwise} 
\end{cases}$$

$$\text{Final Discount} = \min(\text{Capped Discount}, \text{orderAmount})$$
$$\text{Net Payable} = \max(0, \text{orderAmount} - \text{Final Discount})$$

### 4.2 Security & Abuse Mitigation
1. **Case-Insensitive Normalization:** Coupon codes are always trimmed and converted to uppercase (`code.trim().toUpperCase()`).
2. **Atomic Increment:** Incrementing `used_count` occurs atomically via `UPDATE coupons SET used_count = used_count + 1 WHERE id = ?`.
3. **Per-User Usage Check:** Counts prior records in `coupon_redemptions` for `(coupon_id, user_id)`. If `count >= max_uses_per_user`, reject with descriptive error.
4. **Target Scoping:** A `SALON_SERVICE` coupon issued by Salon A cannot be redeemed at Salon B or for a SaaS plan.

---

## 5. Elysia REST Endpoints

Prefix: `/api/coupons`
- `POST /apply`: Validates code and returns calculated discount.
- `GET /`: Lists active coupons (filterable by `targetType`, `salonId`, `organizationId`).
- `POST /`: Creates a new coupon (Admin or Salon Owner).
- `PATCH /:id`: Updates coupon details or toggles status.
- `DELETE /:id`: Soft-archives or deactivates coupon.
