-- 21-08-2026 ------------------------------------------------------------------------------
-- ============================================================
-- ADVANCE BOOKINGS FEATURE
-- Migration: 2026_08_01_000001_create_inventory_advance_bookings_table
-- Migration: 2026_08_01_000002_add_paid_amount_to_inventory_advance_bookings_table
-- ============================================================\

ALTER TABLE `branch_cities`
	DROP INDEX `branch_cities_city_number_unique`;

CREATE TABLE `inventory_advance_bookings` (
  `id`                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_no`              VARCHAR(255) NOT NULL UNIQUE,
  `customer_name`           VARCHAR(255) NOT NULL,
  `customer_phone`          VARCHAR(20) NOT NULL,
  `customer_address`        VARCHAR(1000) DEFAULT NULL,
  `booking_date`            DATE NOT NULL,
  `expected_delivery_date`  DATE DEFAULT NULL,
  `subtotal`                DECIMAL(15,4) NOT NULL DEFAULT 0,
  `tax_type`                VARCHAR(20) NOT NULL DEFAULT 'percentage',
  `tax_value`               DECIMAL(10,4) NOT NULL DEFAULT 0,
  `tax_amount`              DECIMAL(15,4) NOT NULL DEFAULT 0,
  `discount_type`           VARCHAR(20) NOT NULL DEFAULT 'percentage',
  `discount_value`          DECIMAL(10,4) NOT NULL DEFAULT 0,
  `discount_amount`         DECIMAL(15,4) NOT NULL DEFAULT 0,
  `grand_total`             DECIMAL(15,4) NOT NULL DEFAULT 0,
  `advance_paid`            DECIMAL(15,4) NOT NULL DEFAULT 0,
  `paid_amount`             DECIMAL(15,4) NOT NULL DEFAULT 0,
  `balance_amount`          DECIMAL(15,4) NOT NULL DEFAULT 0,
  `payment_method`          VARCHAR(50) DEFAULT NULL,
  `upi_reference_no`        VARCHAR(100) DEFAULT NULL,
  `payment_screenshot`      VARCHAR(255) DEFAULT NULL,
  `notes`                   TEXT DEFAULT NULL,
  `status`                  VARCHAR(30) NOT NULL DEFAULT 'pending',
  `is_deleted`              TINYINT(1) NOT NULL DEFAULT 0,
  `branch`                  VARCHAR(50) DEFAULT NULL,
  `branch_id`               VARCHAR(50) DEFAULT NULL,
  `cms_admin_id`            VARCHAR(50) DEFAULT NULL,
  `created_at`              TIMESTAMP NULL DEFAULT NULL,
  `updated_at`              TIMESTAMP NULL DEFAULT NULL,
  `deleted_at`              TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------

CREATE TABLE `inventory_advance_booking_items` (
  `id`                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `unique_id`                VARCHAR(50) DEFAULT NULL,
  `booking_id`               VARCHAR(255) NOT NULL,
  `product_id`               VARCHAR(100) DEFAULT NULL,
  `product_unique_id`        VARCHAR(100) DEFAULT NULL,
  `purchase_item_id`         VARCHAR(100) DEFAULT NULL,
  `purchase_item_unique_id`  VARCHAR(100) DEFAULT NULL,
  `product_name`             VARCHAR(255) NOT NULL,
  `attribute_summary`        VARCHAR(500) DEFAULT NULL,
  `quantity`                 DECIMAL(15,4) NOT NULL DEFAULT 1,
  `price`                    DECIMAL(15,4) NOT NULL DEFAULT 0,
  `discount_type`            VARCHAR(20) NOT NULL DEFAULT 'percentage',
  `discount_value`           DECIMAL(10,4) NOT NULL DEFAULT 0,
  `discount_amount`          DECIMAL(15,4) NOT NULL DEFAULT 0,
  `tax_type`                 VARCHAR(20) NOT NULL DEFAULT 'percentage',
  `tax_value`                DECIMAL(10,4) NOT NULL DEFAULT 0,
  `tax_amount`               DECIMAL(15,4) NOT NULL DEFAULT 0,
  `total`                    DECIMAL(15,4) NOT NULL DEFAULT 0,
  `branch_id`                VARCHAR(50) DEFAULT NULL,
  `cms_admin_id`             VARCHAR(50) DEFAULT NULL,
  `is_deleted`               TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`               TIMESTAMP NULL DEFAULT NULL,
  `updated_at`               TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------

ALTER TABLE `inventory_advance_bookings`
  ADD COLUMN `paid_amount` DECIMAL(15,4) NOT NULL DEFAULT 0 AFTER `advance_paid`;

-- 21-08-2026 ------------------------------------------------------------------------------

-- 07-07-2026 ------------------------------------------------------------------------------


ALTER TABLE `loan_credit_application_forms`
  MODIFY COLUMN `status` ENUM('field_executive','branch_manager','branch_support_executive')
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'field_executive';

ALTER TABLE `loan_customers`
  MODIFY COLUMN `status` ENUM('field_executive','branch_manager','branch_support_executive','deletion_request')
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'field_executive';

ALTER TABLE `loan_customers`
  ADD COLUMN `is_delete_requested` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_deleted`;

ALTER TABLE `loan_credit_application_forms`
  ADD COLUMN `is_delete_requested` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_deleted`;

-- Pre-close feature: add is_pre_close flag to payments and closed status to schedules
ALTER TABLE `loan_emi_payments`
  ADD COLUMN `is_pre_close` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_deleted`;

ALTER TABLE `loan_emi_schedules`
  MODIFY COLUMN `status` ENUM('pending','paid','overdue','partial','pending_at_admin','closed','pre_closed')
    NOT NULL DEFAULT 'pending';



-- 20-06-2026 ------------------------------------------------------------------------------


ALTER TABLE customer_enrollments
    ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
    ADD INDEX customer_enrollments_is_deleted_index (is_deleted);


-- 12-06-2026 ------------------------------------------------------------------------------

CREATE TABLE backup_loan_customers_20260612 AS
SELECT * FROM loan_customers;

CREATE TABLE backup_loan_credit_application_forms_20260612 AS
SELECT * FROM loan_credit_application_forms;

CREATE TABLE backup_loan_customer_verification_history_20260612 AS
SELECT * FROM loan_customer_verification_history;

SELECT COUNT(*) FROM backup_loan_customers_20260612;
SELECT COUNT(*) FROM backup_loan_credit_application_forms_20260612;
SELECT COUNT(*) FROM backup_loan_customer_verification_history_20260612;

CREATE TABLE customer_enrollments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    enrollment_number VARCHAR(255) NOT NULL UNIQUE,
    customer_unique_id VARCHAR(255) NOT NULL,

    enrollment_date DATE NOT NULL,

    enrolled_by VARCHAR(255) NULL,
    branch_id VARCHAR(255) NULL,
    cms_admin_id VARCHAR(255) NULL,

    status_history JSON NULL,

    verification_status ENUM(
        'pending',
        'verified',
        'rejected',
        'reverted'
    ) DEFAULT 'pending',

    verified_by VARCHAR(255) NULL,
    verified_at TIMESTAMP NULL,

    verification_notes TEXT NULL,
    rejection_reason TEXT NULL,

    reverted_by VARCHAR(50) NULL,
    reverted_at DATETIME NULL,

    status ENUM(
        'field_executive',
        'branch_support_executive',
        'branch_manager',
        'credit_manager',
        'approved',
        'rejected'
    ) DEFAULT 'field_executive',

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_customer_unique_id (customer_unique_id),
    INDEX idx_branch_id (branch_id),
    INDEX idx_verification_status (verification_status),
    INDEX idx_status (status)
);


INSERT INTO customer_enrollments (
    enrollment_number,
    customer_unique_id,
    enrollment_date,
    enrolled_by,
    branch_id,
    cms_admin_id,
    status,
    status_history,
    verification_status,
    verified_by,
    verified_at,
    verification_notes,
    created_at,
    updated_at
)

SELECT
    enrollment_number,
    customer_unique_id,
    DATE(COALESCE(enrollment_date, created_at)),
    user_id,
    branch_id,
    cms_admin_id,
    status,
    status_history,
    verification_status,
    verified_by,
    verified_at,
    verification_notes,
    created_at,
    updated_at
FROM loan_customers
WHERE enrollment_number IS NOT NULL
AND enrollment_number <> '';


SELECT COUNT(*) FROM customer_enrollments;

ALTER TABLE loan_credit_application_forms
ADD COLUMN enrollment_number VARCHAR(255) NULL
AFTER customer_unique_id;

CREATE INDEX idx_caf_enrollment_number
ON loan_credit_application_forms(enrollment_number);

UPDATE loan_credit_application_forms caf
INNER JOIN customer_enrollments ce
    ON ce.customer_unique_id = caf.customer_unique_id
SET caf.enrollment_number = ce.enrollment_number
WHERE caf.enrollment_number IS NULL
   OR caf.enrollment_number = '';

   SELECT
    loan_application_id,
    customer_unique_id,
    enrollment_number
FROM loan_credit_application_forms
LIMIT 20;

ALTER TABLE loan_customer_verification_history
ADD COLUMN enrollment_number VARCHAR(255) NULL
AFTER customer_unique_id;

CREATE INDEX idx_verification_history_enrollment
ON loan_customer_verification_history(enrollment_number);


UPDATE loan_customer_verification_history vh
INNER JOIN customer_enrollments ce
    ON ce.customer_unique_id = vh.customer_unique_id
SET vh.enrollment_number = ce.enrollment_number
WHERE vh.enrollment_number IS NULL;

ALTER TABLE loan_customer_verification_history
MODIFY COLUMN status
ENUM(
    'verified',
    'rejected',
    'reverted',
    'pending'
)
NOT NULL DEFAULT 'pending';


SELECT *
FROM loan_customers lc
LEFT JOIN customer_enrollments ce
ON ce.customer_unique_id = lc.customer_unique_id
WHERE ce.id IS NULL;

SELECT *
FROM loan_credit_application_forms
WHERE enrollment_number IS NULL
OR enrollment_number = '';


SELECT *
FROM loan_customer_verification_history
WHERE enrollment_number IS NULL;


-- 27 May 2026 ------------  

ALTER TABLE `loan_emi_schedules`
  ADD COLUMN `frequency` enum('weekly','biweekly','monthly') NOT NULL DEFAULT 'monthly' AFTER `installment_date`;


ALTER TABLE `loan_emi_schedules`
  DROP COLUMN `admin_user_id`,
  DROP COLUMN `paid_date`,
  DROP COLUMN `paid_amount`;


ALTER TABLE `loan_emi_payments`
  ADD COLUMN `admin_user_id` varchar(255) DEFAULT NULL AFTER `is_deleted`;


-- 25 May 2026 ------------  


ALTER TABLE `loan_credit_application_forms`
  ADD COLUMN `discount` decimal(15,2) DEFAULT NULL AFTER `down_payment`;

ALTER TABLE `loan_customers`
  ADD COLUMN `nominee_relationship_other` varchar(255) DEFAULT NULL AFTER `nominee_relationship`;

ALTER TABLE `loan_loans`
  ADD COLUMN `is_deleted` tinyint(4) NOT NULL DEFAULT 0 AFTER `installment_start_date`;


ALTER TABLE `loan_emi_schedules`
  ADD COLUMN `is_deleted` tinyint(4) NOT NULL DEFAULT 0 AFTER `status`;


ALTER TABLE `loan_agents`
  ADD COLUMN `password` varchar(255) DEFAULT NULL AFTER `email`,
  ADD COLUMN `unhashed_password` varchar(255) DEFAULT NULL AFTER `password`,
  ADD COLUMN `is_deleted` tinyint(4) NOT NULL DEFAULT 0 AFTER `status`;


ALTER TABLE `loan_customers`
  ADD COLUMN `unhashed_password` varchar(255) DEFAULT NULL AFTER `password`;


ALTER TABLE `loan_customers`
  DROP INDEX `loan_customers_email_unique`,
  ADD UNIQUE KEY `loan_customers_email_is_deleted_unique` (`email`, `is_deleted`);


ALTER TABLE `users`
  ADD COLUMN `unhashed_password` varchar(255) DEFAULT NULL AFTER `password`;


-- 04-06-2026


ALTER TABLE `investor_basic_information`
    ADD COLUMN `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `email`,
    ADD COLUMN `unhashed_password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `password`,
    ADD COLUMN `role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'investor' AFTER `unhashed_password`,
    

--    ACTION: Add to LIVE:
-- ALTER TABLE `loan_credit_application_forms`
--     ADD COLUMN `discount` decimal(15,2) DEFAULT NULL AFTER `down_payment`;

--    ACTION: Add to LIVE (soft delete support):
ALTER TABLE `investor_investments`
    ADD COLUMN `deleted_at` timestamp NULL DEFAULT NULL AFTER `updated_at`;

ALTER TABLE `investment_weekly_schedules`
    ADD COLUMN `deleted_at` timestamp NULL DEFAULT NULL AFTER `updated_at`;


