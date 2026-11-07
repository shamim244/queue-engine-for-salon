-- Engine Que System: MySQL 8.0 Schema
CREATE DATABASE IF NOT EXISTS engine_que_salon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE engine_que_salon;

-- 1. Salons
CREATE TABLE IF NOT EXISTS salons (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    country_code VARCHAR(5) DEFAULT '+91',
    currency VARCHAR(10) DEFAULT 'INR',
    address VARCHAR(255) NULL,
    upi_payment_id VARCHAR(100) NULL,
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
    icon VARCHAR(50) NULL,
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
