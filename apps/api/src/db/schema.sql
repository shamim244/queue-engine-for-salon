-- Engine Que System: MySQL 8.0 Comprehensive Schema
CREATE DATABASE IF NOT EXISTS engine_que_salon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE engine_que_salon;

-- ============================================================================
-- 0. Migration Ledger
-- ============================================================================
CREATE TABLE IF NOT EXISTS migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  batch INT NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 1. Core Tenancy: Organizations & Salons
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  tier ENUM('FREE', 'STARTER', 'PRO', 'ENTERPRISE') DEFAULT 'FREE',
  plan_id VARCHAR(36) NULL,
  owner_id VARCHAR(36) NULL,
  max_branches INT DEFAULT 1,
  max_stylists_per_branch INT DEFAULT 2,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS salons (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  operating_mode VARCHAR(50) NULL DEFAULT NULL,
  country_code VARCHAR(5) DEFAULT '+91',
  currency VARCHAR(10) DEFAULT 'INR',
  address VARCHAR(255) NULL,
  upi_payment_id VARCHAR(100) NULL,
  tagline VARCHAR(255) NULL,
  about TEXT NULL,
  email VARCHAR(150) NULL,
  whatsapp_phone VARCHAR(25) NULL,
  google_maps_url VARCHAR(500) NULL,
  instagram_handle VARCHAR(100) NULL,
  operating_hours VARCHAR(255) NULL,
  amenities JSON NULL,
  announcement VARCHAR(255) NULL,
  announcement_active BOOLEAN DEFAULT FALSE,
  loyalty_reward_service_id VARCHAR(36) NULL,
  loyalty_reward_service_name VARCHAR(100) NULL,
  loyalty_cooldown_hours INT NOT NULL DEFAULT 4,
  loyalty_voucher_validity_days INT NOT NULL DEFAULT 90,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stylists (
  id VARCHAR(36) PRIMARY KEY,
  salon_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  username VARCHAR(100) NULL,
  email VARCHAR(100) NULL,
  user_id VARCHAR(36) NULL,
  pin VARCHAR(20) NULL,
  custom_avg_duration_minutes INT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  historical_avg_duration_minutes INT DEFAULT 25,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_salon_active (salon_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(36) PRIMARY KEY,
  salon_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL,
  estimated_duration_minutes INT NOT NULL,
  is_add_on BOOLEAN DEFAULT FALSE,
  pricing_type ENUM('FIXED', 'STARTING_AT', 'FLEXIBLE_CHAIR') DEFAULT 'FIXED',
  icon VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_salon_addon (salon_id, is_add_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. Real-Time Operations: Queues, Jobs, Leaves
-- ============================================================================
CREATE TABLE IF NOT EXISTS queue_tickets (
  id VARCHAR(36) PRIMARY KEY,
  salon_id VARCHAR(36) NOT NULL,
  stylist_id VARCHAR(36) NULL,
  ticket_number INT NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_id VARCHAR(36) NULL,
  service_id VARCHAR(36) NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  selected_add_ons JSON NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  total_duration_minutes INT NOT NULL,
  status ENUM('WAITING', 'SUMMONED', 'IN_CHAIR', 'COMPLETED', 'SOFT_BUMPED', 'CANCELLED', 'NO_SHOW', 'PAUSED') DEFAULT 'WAITING',
  source ENUM('QR_SCAN', 'BARBER_QUICK_ADD', 'RECEPTIONIST', 'REMOTE_WEB') DEFAULT 'QR_SCAN',
  routing_preference ENUM('AUTO_FASTEST', 'SPECIFIC_STYLIST') DEFAULT 'AUTO_FASTEST',
  notes TEXT NULL,
  grooming_tags JSON NULL,
  estimated_wait_minutes INT DEFAULT 0,
  check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  summoned_time TIMESTAMP NULL,
  started_time TIMESTAMP NULL,
  completed_time TIMESTAMP NULL,
  payment_status ENUM('PENDING', 'CASH_PAID', 'ONLINE_PAID') DEFAULT 'PENDING',
  payment_amount DECIMAL(10, 2) NULL,
  INDEX idx_salon_status_time (salon_id, status, check_in_time),
  INDEX idx_stylist_status (stylist_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_logs (
  id VARCHAR(36) PRIMARY KEY,
  salon_id VARCHAR(36) NOT NULL,
  stylist_id VARCHAR(36) NOT NULL,
  service_id VARCHAR(36) NOT NULL,
  actual_duration_minutes INT NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  salon_id VARCHAR(36) NULL,
  organization_id VARCHAR(36) NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(100) NULL,
  role VARCHAR(50) NOT NULL,
  staff_id VARCHAR(36) NULL,
  pin_hash VARCHAR(255) NULL,
  status VARCHAR(30) DEFAULT 'ACTIVE',
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_salon (salon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NULL,
  grooming_specs TEXT NULL,
  preferred_barber_id VARCHAR(36) NULL,
  preferred_barber_name VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(128) UNIQUE NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_token (token),
  INDEX idx_session_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS queue_jobs (
  id VARCHAR(36) PRIMARY KEY,
  salon_id VARCHAR(36) NULL,
  type VARCHAR(50) NOT NULL,
  payload JSON NOT NULL,
  status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  last_error TEXT NULL,
  scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_job_status_sched (status, scheduled_for),
  INDEX idx_job_salon (salon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stylist_service_durations (
  id VARCHAR(36) PRIMARY KEY,
  salon_id VARCHAR(36) NOT NULL,
  stylist_id VARCHAR(36) NOT NULL,
  service_id VARCHAR(36) NOT NULL,
  duration_minutes INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stylist_service (stylist_id, service_id),
  INDEX idx_salon_stylist (salon_id, stylist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_leaves (
  id VARCHAR(36) PRIMARY KEY,
  salon_id VARCHAR(36) NOT NULL,
  stylist_id VARCHAR(36) NOT NULL,
  leave_date DATE NOT NULL,
  end_date DATE NULL,
  reason VARCHAR(255) NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') DEFAULT 'APPROVED',
  applied_by VARCHAR(50) DEFAULT 'OWNER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_salon_date (salon_id, leave_date),
  INDEX idx_stylist_date (stylist_id, leave_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. Billing, Plans, Orders, Gateway Settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  badge VARCHAR(50) NULL,
  description TEXT NULL,
  price_1m DECIMAL(10,2) NOT NULL,
  price_3m DECIMAL(10,2) NULL,
  price_6m DECIMAL(10,2) NULL,
  price_1y DECIMAL(10,2) NULL,
  discount_pct_3m DECIMAL(5,2) DEFAULT 10.00,
  discount_pct_6m DECIMAL(5,2) DEFAULT 16.00,
  discount_pct_1y DECIMAL(5,2) DEFAULT 30.00,
  cycle_1m_enabled BOOLEAN DEFAULT TRUE,
  cycle_3m_enabled BOOLEAN DEFAULT TRUE,
  cycle_6m_enabled BOOLEAN DEFAULT TRUE,
  cycle_1y_enabled BOOLEAN DEFAULT TRUE,
  max_branches INT NOT NULL DEFAULT 1,
  max_stylists_per_branch INT NOT NULL DEFAULT 2,
  features JSON NOT NULL,
  status ENUM('ACTIVE', 'DRAFT', 'ARCHIVED') DEFAULT 'ACTIVE',
  is_featured BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_plan_status (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_orders (
  id VARCHAR(36) PRIMARY KEY,
  target_type ENUM('SUBSCRIPTION', 'QUEUE_TICKET', 'WALLET_TOPUP') NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NULL,
  salon_id VARCHAR(36) NULL,
  customer_id VARCHAR(36) NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  provider ENUM('UPI_QR', 'CASH', 'RAZORPAY', 'WALLET') NOT NULL,
  provider_order_id VARCHAR(100) NULL,
  transaction_ref VARCHAR(100) NULL,
  utr_number VARCHAR(64) NULL,
  payment_proof_note TEXT NULL,
  reviewed_by VARCHAR(64) NULL,
  reviewed_at TIMESTAMP NULL,
  rejection_reason TEXT NULL,
  status ENUM('PENDING', 'PENDING_APPROVAL', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED', 'REFUNDED', 'REJECTED') DEFAULT 'PENDING',
  payment_data JSON NULL,
  metadata JSON NULL,
  expires_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_status (status, target_type),
  INDEX idx_order_org (organization_id, created_at),
  INDEX idx_order_salon (salon_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  plan_id VARCHAR(36) NOT NULL,
  cycle ENUM('1m', '3m', '6m', '1y', 'custom') NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  coupon_id VARCHAR(36) NULL,
  coupon_discount DECIMAL(10,2) DEFAULT 0.00,
  wallet_deducted DECIMAL(10,2) DEFAULT 0.00,
  net_amount_paid DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_order_id VARCHAR(36) NULL,
  transaction_ref VARCHAR(100) NULL,
  status ENUM('ACTIVE', 'EXPIRED', 'CANCELLED', 'GRACE_PERIOD') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_org_sub (organization_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_gateway_settings (
  id VARCHAR(36) PRIMARY KEY,
  upi_manual_enabled BOOLEAN DEFAULT TRUE,
  upi_vpa VARCHAR(120) DEFAULT 'salonpayments@icici',
  upi_merchant_name VARCHAR(120) DEFAULT 'Salon Queue SaaS',
  cash_enabled BOOLEAN DEFAULT TRUE,
  cash_instructions TEXT NULL,
  razorpay_enabled BOOLEAN DEFAULT FALSE,
  razorpay_key_id VARCHAR(120) NULL,
  razorpay_key_secret VARCHAR(120) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. Coupons, Wallets & B2B Referrals
-- ============================================================================
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
  is_first_time_only TINYINT(1) DEFAULT 0,
  valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'EXPIRED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_coupon_lookup (code, status),
  INDEX idx_coupon_org_salon (organization_id, salon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallets (
  id VARCHAR(36) PRIMARY KEY,
  wallet_type ENUM('OWNER', 'CONSUMER') NOT NULL,
  owner_org_id VARCHAR(36) NULL,
  consumer_phone VARCHAR(20) NULL,
  salon_id VARCHAR(36) NULL,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'INR',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_owner_wallet (owner_org_id),
  UNIQUE KEY uq_consumer_wallet (salon_id, consumer_phone),
  INDEX idx_wallet_type (wallet_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id VARCHAR(36) PRIMARY KEY,
  wallet_id VARCHAR(36) NOT NULL,
  wallet_type ENUM('OWNER', 'CONSUMER') NOT NULL,
  owner_org_id VARCHAR(36) NULL,
  consumer_phone VARCHAR(20) NULL,
  salon_id VARCHAR(36) NULL,
  type ENUM('CREDIT', 'DEBIT') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  reference_id VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_trans_wallet (wallet_id, created_at),
  INDEX idx_trans_owner (owner_org_id, created_at),
  INDEX idx_trans_consumer (salon_id, consumer_phone, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS referral_attributions (
  id VARCHAR(36) PRIMARY KEY,
  referral_type ENUM('B2B_OWNER', 'B2C_CONSUMER') NOT NULL,
  referrer_code VARCHAR(50) NOT NULL,
  referrer_org_id VARCHAR(36) NULL,
  referrer_phone VARCHAR(20) NULL,
  referred_org_id VARCHAR(36) NULL,
  referred_phone VARCHAR(20) NULL,
  salon_id VARCHAR(36) NULL,
  reward_amount DECIMAL(10,2) NOT NULL,
  status ENUM('PENDING', 'CONVERTED', 'EXPIRED') DEFAULT 'PENDING',
  conversion_reference_id VARCHAR(100) NULL,
  converted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ref_code (referrer_code),
  INDEX idx_ref_org (referrer_org_id, status),
  INDEX idx_referred_org (referred_org_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. Appointments & Escrow Payouts
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(64) PRIMARY KEY,
  salon_id VARCHAR(64) NOT NULL,
  stylist_id VARCHAR(64) NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  service_id VARCHAR(64) NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  scheduled_date DATE NOT NULL,
  slot_start_time VARCHAR(5) NOT NULL,
  slot_end_time VARCHAR(5) NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  advance_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  payment_method ENUM('RAZORPAY', 'UPI_QR', 'WALLET', 'PAY_AT_SALON') NOT NULL DEFAULT 'RAZORPAY',
  gateway_order_id VARCHAR(128) NULL,
  gateway_payment_id VARCHAR(128) NULL,
  escrow_status ENUM('HELD', 'RELEASED_TO_OWNER', 'REFUNDED_TO_CUSTOMER', 'PARTIAL_SPLIT') NOT NULL DEFAULT 'HELD',
  status ENUM('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'IN_CHAIR', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED') NOT NULL DEFAULT 'PENDING_PAYMENT',
  rescheduled_from_id VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_salon_slot (salon_id, scheduled_date, status),
  INDEX idx_customer (customer_phone),
  INDEX idx_stylist_slot (stylist_id, scheduled_date, slot_start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS salon_payout_records (
  id VARCHAR(64) PRIMARY KEY,
  salon_id VARCHAR(64) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  gateway_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  platform_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  net_payout DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  payout_vpa VARCHAR(100) NULL,
  payout_reference_id VARCHAR(128) NULL,
  status ENUM('PENDING', 'PROCESSING', 'SETTLED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  settled_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_salon_payout (salon_id, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. Partner Affiliate System
-- ============================================================================
CREATE TABLE IF NOT EXISTS partners (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NULL,
  full_name VARCHAR(128) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(128) NULL,
  password_hash VARCHAR(255) NULL,
  city VARCHAR(64) NOT NULL,
  persona ENUM('CREATOR', 'GROUND_HUSTLER', 'SALON_OWNER', 'DEDICATED') NOT NULL DEFAULT 'GROUND_HUSTLER',
  referral_code VARCHAR(32) NOT NULL UNIQUE,
  status ENUM('PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'REJECTED') NOT NULL DEFAULT 'PENDING_REVIEW',
  commission_model ENUM('RECURRING_PERCENT', 'FLAT_BOUNTY', 'HYBRID') NOT NULL DEFAULT 'RECURRING_PERCENT',
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  bounty_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  duration_type ENUM('LIFETIME', '3_MONTHS', '6_MONTHS', '12_MONTHS') NOT NULL DEFAULT '6_MONTHS',
  duration_end_date DATETIME NULL,
  is_commission_paused BOOLEAN NOT NULL DEFAULT FALSE,
  payout_upi_id VARCHAR(128) NULL,
  payout_holder_name VARCHAR(128) NULL,
  payout_bank_name VARCHAR(128) NULL,
  payout_bank_account VARCHAR(64) NULL,
  payout_bank_ifsc VARCHAR(32) NULL,
  payout_account_type ENUM('SAVINGS', 'CURRENT') NOT NULL DEFAULT 'SAVINGS',
  pitch_notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_partner_phone (phone),
  INDEX idx_partner_code (referral_code),
  INDEX idx_partner_status (status),
  INDEX idx_partner_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partner_salon_attributions (
  id VARCHAR(64) PRIMARY KEY,
  partner_id VARCHAR(64) NOT NULL,
  salon_id VARCHAR(64) NOT NULL UNIQUE,
  source ENUM('LINK', 'PROMO_CODE', 'ASSISTED_ONBOARDING', 'ADMIN_ASSIGNED') NOT NULL DEFAULT 'LINK',
  qualification_status ENUM('UNQUALIFIED', 'QUALIFIED') NOT NULL DEFAULT 'UNQUALIFIED',
  tickets_completed_count INT NOT NULL DEFAULT 0,
  first_paid_plan_at DATETIME NULL,
  commission_expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attr_partner (partner_id),
  INDEX idx_attr_salon (salon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partner_wallet_ledger (
  id VARCHAR(64) PRIMARY KEY,
  partner_id VARCHAR(64) NOT NULL,
  salon_id VARCHAR(64) NULL,
  transaction_type ENUM('COMMISSION_CREDIT', 'BOUNTY_CREDIT', 'WITHDRAWAL_DEBIT', 'ADJUSTMENT') NOT NULL,
  gross_plan_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  net_paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  commission_amount DECIMAL(10,2) NOT NULL,
  balance_type ENUM('PENDING_LOCK', 'AVAILABLE') NOT NULL DEFAULT 'PENDING_LOCK',
  description VARCHAR(255) NOT NULL,
  reference_id VARCHAR(128) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ledger_partner (partner_id),
  INDEX idx_ledger_salon (salon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partner_payout_requests (
  id VARCHAR(64) PRIMARY KEY,
  partner_id VARCHAR(64) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payout_method ENUM('UPI', 'BANK_TRANSFER') NOT NULL DEFAULT 'UPI',
  payout_target VARCHAR(128) NOT NULL,
  status ENUM('REQUESTED', 'APPROVED', 'PAID', 'REJECTED') NOT NULL DEFAULT 'REQUESTED',
  utr_reference VARCHAR(128) NULL,
  admin_notes TEXT NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at DATETIME NULL,
  INDEX idx_payout_partner (partner_id),
  INDEX idx_payout_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partner_notifications (
  id VARCHAR(64) PRIMARY KEY,
  partner_id VARCHAR(64) NOT NULL,
  title VARCHAR(128) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('SALON_JOINED', 'EARNING_CREDITED', 'QUALIFIED', 'PAYOUT_STATUS', 'SYSTEM') NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_partner (partner_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. Security Settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS security_settings (
  id VARCHAR(36) PRIMARY KEY,
  pin_max_attempts INT DEFAULT 5,
  pin_window_seconds INT DEFAULT 900,
  login_max_attempts INT DEFAULT 10,
  login_window_seconds INT DEFAULT 900,
  checkin_max_attempts INT DEFAULT 10,
  checkin_window_seconds INT DEFAULT 300,
  allowed_custom_origins JSON NULL,
  default_country_code VARCHAR(10) DEFAULT '+91',
  allowed_country_codes JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. Customer Loyalty & Grooming Specs
-- ============================================================================
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id VARCHAR(36) PRIMARY KEY,
  salon_id VARCHAR(36) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_name VARCHAR(100) NULL,
  current_stamps INT NOT NULL DEFAULT 0,
  total_lifetime_stamps INT NOT NULL DEFAULT 0,
  completed_milestones INT NOT NULL DEFAULT 0,
  last_stamp_awarded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_salon_customer_phone (salon_id, customer_phone),
  INDEX idx_salon_stamps (salon_id, current_stamps),
  INDEX idx_customer_phone (customer_phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS loyalty_vouchers (
  id VARCHAR(36) PRIMARY KEY,
  voucher_code VARCHAR(32) UNIQUE NOT NULL,
  salon_id VARCHAR(36) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  reward_service_id VARCHAR(36) NOT NULL,
  reward_service_name VARCHAR(100) NOT NULL,
  reward_service_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status ENUM('ACTIVE', 'REDEEMED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  redeemed_at TIMESTAMP NULL,
  redeemed_ticket_id VARCHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_salon_phone_status (salon_id, customer_phone, status),
  INDEX idx_voucher_code (voucher_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
