# Database Schema & Entity Relationship Diagram (ERD)

**Engine:** MySQL 8.0 / 9.1 (InnoDB)  
**Encoding:** `utf8mb4` | `utf8mb4_unicode_ci`  
**Connection Mode:** Connection Pool with Resilient In-Memory Fallback  

---

## 1. Entity Relationship Diagram

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ SALONS : owns
    ORGANIZATIONS ||--o{ USERS : governs
    SALONS ||--o{ STYLISTS : employs
    SALONS ||--o{ SERVICES : offers
    SALONS ||--o{ QUEUE_TICKETS : queues
    SALONS ||--o{ SERVICE_LOGS : tracks
    STYLISTS ||--o{ QUEUE_TICKETS : serves
    USERS ||--o{ SESSIONS : authenticates

    ORGANIZATIONS {
        varchar id PK
        varchar name
        varchar slug UK
        enum tier "STARTER, PRO, ENTERPRISE"
        int max_branches
        int max_stylists_per_branch
        timestamp created_at
    }

    SALONS {
        varchar id PK
        varchar organization_id FK
        varchar name
        varchar slug UK
        varchar phone
        varchar upi_payment_id
        varchar operating_hours
        timestamp created_at
    }

    STYLISTS {
        varchar id PK
        varchar salon_id FK
        varchar name
        varchar phone
        boolean is_active
        int historical_avg_duration_minutes
        varchar pin
    }

    SERVICES {
        varchar id PK
        varchar salon_id FK
        varchar name
        decimal base_price
        int estimated_duration_minutes
        boolean is_add_on
        varchar icon
    }

    QUEUE_TICKETS {
        varchar id PK
        varchar salon_id FK
        varchar stylist_id FK
        int ticket_number
        varchar customer_name
        varchar customer_phone
        varchar service_id FK
        varchar service_name
        enum status "WAITING, SUMMONED, IN_CHAIR, COMPLETED, SOFT_BUMPED, CANCELLED"
        enum payment_status "PENDING, CASH_PAID, ONLINE_PAID"
        int estimated_wait_minutes
        timestamp check_in_time
        timestamp summoned_time
        timestamp started_time
        timestamp completed_time
    }

    USERS {
        varchar id PK
        varchar organization_id FK
        varchar salon_id FK
        varchar username UK
        varchar password_hash
        varchar role "SUPER_ADMIN, SALON_OWNER, STAFF, CUSTOMER"
        varchar phone
        varchar email
    }

    SESSIONS {
        varchar id PK
        varchar user_id FK
        varchar token UK
        timestamp expires_at
    }
```

---

## 2. Table Indexing & Performance Rules
1. `queue_tickets`: Indexed on `(salon_id, status, check_in_time)` for microsecond queue lookups.
2. `stylists`: Indexed on `(salon_id, is_active)` to filter active chair availability instantly.
3. `services`: Indexed on `(salon_id, is_add_on)` for sub-50ms catalog responses.
4. `sessions`: Indexed on `(token)` for zero-delay token authentication.
