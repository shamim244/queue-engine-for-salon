-- Engine Que System: MySQL 8.0 Schema
CREATE DATABASE IF NOT EXISTS engine_que_salon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE engine_que_salon;

-- 1. Salons
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
    wifi_ssid VARCHAR(100) NULL,
    wifi_password VARCHAR(100) NULL,
    enable_lounge_wifi BOOLEAN DEFAULT TRUE,
    enable_screen_wake_lock BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Stylists / Barbers
CREATE TABLE IF NOT EXISTS stylists (
    id VARCHAR(36) PRIMARY KEY,
    salon_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    historical_avg_duration_minutes INT DEFAULT 25,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    INDEX idx_salon_active (salon_id, is_active)
) ENGINE=InnoDB;

-- 3. Services & Add-ons
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(36) PRIMARY KEY,
    salon_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    estimated_duration_minutes INT NOT NULL,
    is_add_on BOOLEAN DEFAULT FALSE,
    icon VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    INDEX idx_salon_addon (salon_id, is_add_on)
) ENGINE=InnoDB;

-- 4. Queue Tickets
CREATE TABLE IF NOT EXISTS queue_tickets (
    id VARCHAR(36) PRIMARY KEY,
    salon_id VARCHAR(36) NOT NULL,
    stylist_id VARCHAR(36) NULL,
    ticket_number INT NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    service_id VARCHAR(36) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    selected_add_ons JSON NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    total_duration_minutes INT NOT NULL,
    status ENUM('WAITING', 'SUMMONED', 'IN_CHAIR', 'COMPLETED', 'SOFT_BUMPED', 'CANCELLED', 'NO_SHOW', 'PAUSED') DEFAULT 'WAITING',
    source ENUM('QR_SCAN', 'BARBER_QUICK_ADD', 'RECEPTIONIST', 'REMOTE_WEB') DEFAULT 'QR_SCAN',
    estimated_wait_minutes INT DEFAULT 0,
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    summoned_time TIMESTAMP NULL,
    started_time TIMESTAMP NULL,
    completed_time TIMESTAMP NULL,
    payment_status ENUM('PENDING', 'CASH_PAID', 'ONLINE_PAID') DEFAULT 'PENDING',
    payment_amount DECIMAL(10, 2) NULL,
    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    INDEX idx_salon_status_time (salon_id, status, check_in_time),
    INDEX idx_stylist_status (stylist_id, status)
) ENGINE=InnoDB;

-- 5. Service Logs (Used for rolling average velocity calculation)
CREATE TABLE IF NOT EXISTS service_logs (
    id VARCHAR(36) PRIMARY KEY,
    salon_id VARCHAR(36) NOT NULL,
    stylist_id VARCHAR(36) NOT NULL,
    service_id VARCHAR(36) NOT NULL,
    actual_duration_minutes INT NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Advance Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(64) PRIMARY KEY,
    salon_id VARCHAR(64) NOT NULL,
    stylist_id VARCHAR(64) NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    service_id VARCHAR(64) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    scheduled_date DATE NOT NULL,
    slot_start_time VARCHAR(5) NOT NULL, -- 'HH:mm' 24-hr format (e.g. '11:00')
    slot_end_time VARCHAR(5) NOT NULL,   -- 'HH:mm' 24-hr format (e.g. '11:40')
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
    INDEX idx_stylist_slot (stylist_id, scheduled_date, slot_start_time),
    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Daily Salon Payout Ledger Table
CREATE TABLE IF NOT EXISTS salon_payout_records (
    id VARCHAR(64) PRIMARY KEY,
    salon_id VARCHAR(64) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    gross_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    gateway_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,     -- 2.0%
    platform_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,    -- 1.0%
    net_payout DECIMAL(10, 2) NOT NULL DEFAULT 0.00,      -- 97.0%
    payout_vpa VARCHAR(100) NULL,                         -- UPI VPA or Bank Account
    payout_reference_id VARCHAR(128) NULL,
    status ENUM('PENDING', 'PROCESSING', 'SETTLED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    settled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_salon_payout (salon_id, status, created_at),
    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Partners Table
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

-- 9. Partner Salon Attributions
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
  INDEX idx_attr_salon (salon_id),
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Partner Wallet Ledger
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
  INDEX idx_ledger_salon (salon_id),
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Partner Payout Requests
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
  INDEX idx_payout_status (status),
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Partner In-App Notifications
CREATE TABLE IF NOT EXISTS partner_notifications (
  id VARCHAR(64) PRIMARY KEY,
  partner_id VARCHAR(64) NOT NULL,
  title VARCHAR(128) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('SALON_JOINED', 'EARNING_CREDITED', 'QUALIFIED', 'PAYOUT_STATUS', 'SYSTEM') NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_partner (partner_id, is_read),
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

