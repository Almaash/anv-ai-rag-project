/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `branch_cities` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `city_name` varchar(255) NOT NULL,
  `city_code` varchar(10) NOT NULL,
  `city_number` varchar(10) NOT NULL,
  `branch_code` varchar(20) DEFAULT NULL,
  `state` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_cities_city_code_unique` (`city_code`),
  UNIQUE KEY `branch_cities_city_number_unique` (`city_number`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_enrollments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `enrollment_number` varchar(255) NOT NULL,
  `customer_unique_id` varchar(255) NOT NULL,
  `enrollment_date` date NOT NULL,
  `enrolled_by` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `status_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`status_history`)),
  `verification_status` enum('pending','verified','rejected','reverted') NOT NULL DEFAULT 'pending',
  `verified_by` varchar(255) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `verification_notes` text DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `reverted_by` varchar(50) DEFAULT NULL,
  `reverted_at` datetime DEFAULT NULL,
  `status` enum('field_executive','branch_support_executive','branch_manager','credit_manager','approved','rejected') NOT NULL DEFAULT 'field_executive',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_enrollments_enrollment_number_unique` (`enrollment_number`),
  KEY `customer_enrollments_branch_id_index` (`branch_id`),
  KEY `customer_enrollments_verification_status_index` (`verification_status`),
  KEY `customer_enrollments_status_index` (`status`),
  KEY `customer_enrollments_customer_unique_id_index` (`customer_unique_id`),
  KEY `customer_enrollments_is_deleted_index` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `branches` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch_city_id` bigint(20) unsigned DEFAULT NULL,
  `sequence` int(11) DEFAULT NULL,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(255) NOT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branches_code_unique` (`code`),
  KEY `branches_admin_user_id_index` (`admin_user_id`),
  KEY `branches_branch_id_index` (`branch_id`),
  KEY `branches_is_deleted_index` (`is_deleted`),
  KEY `branches_branch_city_id_foreign` (`branch_city_id`),
  CONSTRAINT `branches_branch_city_id_foreign` FOREIGN KEY (`branch_city_id`) REFERENCES `branch_cities` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `departments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `dept_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `departments_dept_id_unique` (`dept_id`),
  KEY `departments_admin_user_id_index` (`admin_user_id`),
  KEY `departments_branch_id_index` (`branch_id`),
  KEY `departments_is_deleted_index` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `finance_cash_book` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `cash_book_id` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `opening_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `cash_in` decimal(15,2) NOT NULL DEFAULT 0.00,
  `cash_out` decimal(15,2) NOT NULL DEFAULT 0.00,
  `closing_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `payment_mode` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `note` text DEFAULT NULL,
  `branch` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `finance_cash_book_cash_book_id_unique` (`cash_book_id`),
  UNIQUE KEY `finance_cash_book_date_unique` (`date`),
  KEY `finance_cash_book_created_by_foreign` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `finance_transactions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `transaction_id` varchar(255) NOT NULL,
  `payment_reference_id` varchar(255) DEFAULT NULL,
  `payment_mode` enum('cash','bank_transfer','upi','cheque','demand_draft','neft','rtgs','imps','other') DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `transaction_type` enum('credit','debit') NOT NULL,
  `transaction_date` date NOT NULL,
  `description` text DEFAULT NULL,
  `attachment` varchar(255) DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `branch` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `finance_transactions_transaction_id_unique` (`transaction_id`),
  UNIQUE KEY `finance_transactions_payment_reference_id_unique` (`payment_reference_id`),
  KEY `finance_transactions_transaction_id_index` (`transaction_id`),
  KEY `finance_transactions_transaction_type_index` (`transaction_type`),
  KEY `finance_transactions_transaction_date_index` (`transaction_date`),
  KEY `finance_transactions_created_by_foreign` (`created_by`),
  KEY `finance_transactions_payment_reference_id_index` (`payment_reference_id`),
  CONSTRAINT `finance_transactions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hrms_attendance` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) NOT NULL,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `employee_id` varchar(255) NOT NULL,
  `leave_request_id` bigint(20) unsigned DEFAULT NULL,
  `date` date NOT NULL,
  `clock_in` time DEFAULT NULL,
  `clock_out` time DEFAULT NULL,
  `status` enum('present','absent','late','half-day','on-leave','overtime') DEFAULT 'present',
  `note` text DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `total_hours` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `hrms_attendance_employee_id_foreign` (`employee_id`),
  KEY `hrms_attendance_is_deleted_index` (`is_deleted`),
  KEY `hrms_attendance_leave_request_id_foreign` (`leave_request_id`),
  KEY `hrms_attendance_admin_user_id_index` (`cms_admin_id`),
  KEY `hrms_attendance_branch_id_index` (`branch_id`),
  CONSTRAINT `hrms_attendance_leave_request_id_foreign` FOREIGN KEY (`leave_request_id`) REFERENCES `hrms_leave_requests` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hrms_departments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `dept_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) NOT NULL,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hrms_departments_dept_id_unique` (`dept_id`),
  KEY `hrms_departments_is_deleted_index` (`is_deleted`),
  KEY `hrms_departments_admin_user_id_index` (`cms_admin_id`),
  KEY `hrms_departments_branch_id_index` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hrms_designations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `designation_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) NOT NULL,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hrms_designations_designation_id_unique` (`designation_id`),
  KEY `hrms_designations_is_deleted_index` (`is_deleted`),
  KEY `hrms_designations_admin_user_id_index` (`cms_admin_id`),
  KEY `hrms_designations_branch_id_index` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hrms_employee_addresses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `employee_id` varchar(255) NOT NULL,
  `type` enum('permanent','current') NOT NULL,
  `address_line_1` varchar(255) NOT NULL,
  `address_line_2` varchar(255) DEFAULT NULL,
  `city` varchar(255) NOT NULL,
  `state` varchar(255) NOT NULL,
  `country` varchar(255) NOT NULL,
  `pincode` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `hrms_employee_addresses_employee_id_foreign` (`employee_id`),
  KEY `hrms_employee_addresses_is_deleted_index` (`is_deleted`),
  KEY `hrms_employee_addresses_admin_user_id_index` (`admin_user_id`),
  KEY `hrms_employee_addresses_branch_id_index` (`branch_id`),
  CONSTRAINT `hrms_employee_addresses_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `hrms_employees` (`employee_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hrms_employee_bank_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `employee_id` varchar(255) NOT NULL,
  `bank_name` varchar(255) NOT NULL,
  `account_holder_name` varchar(255) NOT NULL,
  `account_number` text NOT NULL,
  `ifsc_code` varchar(255) NOT NULL,
  `branch_name` varchar(255) NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `hrms_employee_bank_details_employee_id_foreign` (`employee_id`),
  KEY `hrms_employee_bank_details_is_deleted_index` (`is_deleted`),
  KEY `hrms_employee_bank_details_admin_user_id_index` (`admin_user_id`),
  KEY `hrms_employee_bank_details_branch_id_index` (`branch_id`),
  CONSTRAINT `hrms_employee_bank_details_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `hrms_employees` (`employee_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hrms_employee_documents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `employee_id` bigint(20) unsigned NOT NULL,
  `document_type` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `verified` tinyint(1) NOT NULL DEFAULT 0,
  `uploaded_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `hrms_employee_documents_employee_id_foreign` (`employee_id`),
  KEY `hrms_employee_documents_is_deleted_index` (`is_deleted`),
  KEY `hrms_employee_documents_admin_user_id_index` (`admin_user_id`),
  KEY `hrms_employee_documents_branch_id_index` (`branch_id`),
  CONSTRAINT `hrms_employee_documents_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `hrms_employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hrms_employee_leave_balances` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `employee_id` bigint(20) unsigned NOT NULL,
  `leave_type_id` bigint(20) unsigned NOT NULL,
  `total_allocated` int(11) NOT NULL DEFAULT 0,
  `used` int(11) NOT NULL DEFAULT 0,
  `remaining` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `hrms_employee_leave_balances_employee_id_foreign` (`employee_id`),
  KEY `hrms_employee_leave_balances_leave_type_id_foreign` (`leave_type_id`),
  KEY `hrms_employee_leave_balances_is_deleted_index` (`is_deleted`),
  KEY `hrms_employee_leave_balances_admin_user_id_index` (`admin_user_id`),
  KEY `hrms_employee_leave_balances_branch_id_index` (`branch_id`),
  CONSTRAINT `hrms_employee_leave_balances_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `hrms_employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `hrms_employee_leave_balances_leave_type_id_foreign` FOREIGN KEY (`leave_type_id`) REFERENCES `hrms_leave_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hrms_employee_personal_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `employee_id` varchar(255) NOT NULL,
  `father_name` varchar(255) DEFAULT NULL,
  `mother_name` varchar(255) DEFAULT NULL,
  `spouse_name` varchar(255) DEFAULT NULL,
  `nationality` varchar(255) DEFAULT NULL,
  `aadhaar_number` text DEFAULT NULL,
  `pan_number` text DEFAULT NULL,
  `passport_number` varchar(255) DEFAULT NULL,
  `emergency_contact_name` varchar(255) DEFAULT NULL,
  `emergency_contact_phone` varchar(255) DEFAULT NULL,
  `emergency_contact_relation` varchar(255) DEFAULT NULL,
  `middle_name` varchar(255) DEFAULT NULL,
  `religion` varchar(255) DEFAULT NULL,
  `caste` varchar(255) DEFAULT NULL,
  `identification_mark` varchar(255) DEFAULT NULL,
  `physically_challenged` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `hrms_employee_personal_details_employee_id_foreign` (`employee_id`),
  KEY `hrms_employee_personal_details_is_deleted_index` (`is_deleted`),
  KEY `hrms_employee_personal_details_admin_user_id_index` (`admin_user_id`),
  KEY `hrms_employee_personal_details_branch_id_index` (`branch_id`),
  CONSTRAINT `hrms_employee_personal_details_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `hrms_employees` (`employee_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hrms_employees` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `user_id` varchar(50) DEFAULT NULL,
  `employee_id` varchar(255) NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `requires_password_change` tinyint(1) NOT NULL DEFAULT 1,
  `phone` varchar(255) DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `designation_id` varchar(255) NOT NULL,
  `reporting_manager_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` varchar(255) NOT NULL,
  `branch_id` varchar(255) NOT NULL,
  `joining_date` date NOT NULL,
  `probation_end_date` date DEFAULT NULL,
  `gender` enum('Male','Female','Other') DEFAULT NULL,
  `marital_status` enum('single','married','divorced','widowed','other') DEFAULT NULL,
  `blood_group` varchar(255) DEFAULT NULL,
  `profile_photo` varchar(255) DEFAULT NULL,
  `employment_type` enum('Full-time','Part-time','Contractual','Intern') NOT NULL DEFAULT 'Full-time',
  `paid_leave_days` int(11) NOT NULL DEFAULT 0,
  `basic_salary` decimal(15,2) DEFAULT NULL,
  `status` enum('active','inactive','terminated','resigned') NOT NULL DEFAULT 'active',
  `role` varchar(255) NOT NULL DEFAULT 'employee',
  `remember_token` varchar(100) DEFAULT NULL,
  `annual_leave_quota` int(10) unsigned NOT NULL DEFAULT 0,
  `annual_leave_used` int(10) unsigned NOT NULL DEFAULT 0,
  `annual_leave_balance` int(10) unsigned NOT NULL DEFAULT 0,
  `leave_cycle_year` smallint(5) unsigned DEFAULT NULL,
  `sick_leave_days` int(10) unsigned NOT NULL DEFAULT 0,
  `casual_leave_days` int(10) unsigned NOT NULL DEFAULT 0,
  `maternity_leave_days` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hrms_employees_employee_id_unique` (`employee_id`),
  KEY `hrms_employees_designation_id_foreign` (`designation_id`),
  KEY `hrms_employees_user_id_foreign` (`user_id`),
  KEY `hrms_employees_department_id_foreign` (`department_id`),
  KEY `hrms_employees_reporting_manager_id_foreign` (`reporting_manager_id`),
  KEY `hrms_employees_is_deleted_index` (`is_deleted`),
  KEY `hrms_employees_branch_id_index` (`branch_id`),
  KEY `hrms_employees_admin_user_id_index` (`cms_admin_id`),
  CONSTRAINT `hrms_employees_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`code`) ON DELETE CASCADE,
  CONSTRAINT `hrms_employees_reporting_manager_id_foreign` FOREIGN KEY (`reporting_manager_id`) REFERENCES `hrms_employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hrms_holidays` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `holiday_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) NOT NULL,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `name` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `description` text DEFAULT NULL,
  `recurring` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hrms_holidays_holiday_id_unique` (`holiday_id`),
  KEY `hrms_holidays_is_deleted_index` (`is_deleted`),
  KEY `hrms_holidays_admin_user_id_index` (`cms_admin_id`),
  KEY `hrms_holidays_branch_id_index` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hrms_leave_requests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) NOT NULL,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `request_id` varchar(255) DEFAULT NULL,
  `employee_id` varchar(255) NOT NULL,
  `leave_type_id` varchar(255) NOT NULL,
  `leave_category` enum('sick','casual','maternity','paid') NOT NULL DEFAULT 'casual',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `total_days` int(11) NOT NULL,
  `is_paid_leave` tinyint(1) NOT NULL DEFAULT 0,
  `reason` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hrms_leave_requests_request_id_unique` (`request_id`),
  KEY `hrms_leave_requests_employee_id_foreign` (`employee_id`),
  KEY `hrms_leave_requests_leave_type_id_foreign` (`leave_type_id`),
  KEY `hrms_leave_requests_approved_by_foreign` (`approved_by`),
  KEY `hrms_leave_requests_is_deleted_index` (`is_deleted`),
  KEY `hrms_leave_requests_admin_user_id_index` (`cms_admin_id`),
  KEY `hrms_leave_requests_branch_id_index` (`branch_id`),
  CONSTRAINT `hrms_leave_requests_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hrms_leave_types` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `leave_type_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) NOT NULL,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `limit_days` int(11) NOT NULL DEFAULT 0,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hrms_leave_types_leave_type_id_unique` (`leave_type_id`),
  KEY `hrms_leave_types_is_deleted_index` (`is_deleted`),
  KEY `hrms_leave_types_admin_user_id_index` (`cms_admin_id`),
  KEY `hrms_leave_types_branch_id_index` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hrms_salaries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) NOT NULL,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `payout_id` varchar(255) DEFAULT NULL,
  `salary_id` varchar(255) DEFAULT NULL,
  `employee_id` varchar(255) NOT NULL,
  `month` varchar(255) NOT NULL,
  `payment_date` date DEFAULT NULL,
  `total_working_days` decimal(4,1) NOT NULL DEFAULT 0.0,
  `present_days` decimal(4,1) NOT NULL DEFAULT 0.0,
  `absent_days` decimal(4,1) NOT NULL DEFAULT 0.0,
  `leave_days` decimal(4,1) NOT NULL DEFAULT 0.0,
  `basic_pay` decimal(15,2) NOT NULL,
  `allowances` decimal(15,2) NOT NULL DEFAULT 0.00,
  `deductions` decimal(15,2) NOT NULL DEFAULT 0.00,
  `net_pay` decimal(15,2) NOT NULL,
  `status` enum('pending','paid','cancelled') NOT NULL DEFAULT 'pending',
  `payment_method` varchar(255) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hrms_salaries_payout_id_unique` (`payout_id`),
  UNIQUE KEY `hrms_salaries_salary_id_unique` (`salary_id`),
  KEY `hrms_salaries_employee_id_foreign` (`employee_id`),
  KEY `hrms_salaries_is_deleted_index` (`is_deleted`),
  KEY `hrms_salaries_admin_user_id_index` (`cms_admin_id`),
  KEY `hrms_salaries_branch_id_index` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hrms_salary_structures` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) NOT NULL,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `employee_id` varchar(255) NOT NULL,
  `basic_salary` decimal(15,2) NOT NULL,
  `house_rent_allowance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `medical_allowance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `transport_allowance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `other_allowance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `provident_fund` decimal(15,2) NOT NULL DEFAULT 0.00,
  `esi_deduction` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tax_deduction` decimal(15,2) NOT NULL DEFAULT 0.00,
  `other_deduction` decimal(15,2) NOT NULL DEFAULT 0.00,
  `net_salary` decimal(15,2) NOT NULL,
  `effective_from` date DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `hrms_salary_structures_employee_id_foreign` (`employee_id`),
  KEY `hrms_salary_structures_is_deleted_index` (`is_deleted`),
  KEY `hrms_salary_structures_admin_user_id_index` (`admin_user_id`),
  KEY `hrms_salary_structures_branch_id_index` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_attributes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `branch` varchar(255) NOT NULL DEFAULT 'default',
  `cms_admin` varchar(255) DEFAULT NULL,
  `category_id` varchar(50) DEFAULT NULL,
  `unique_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `values` text DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_attributes_unique_id_unique` (`unique_id`),
  KEY `inventory_attributes_branch_index` (`branch`),
  KEY `category_id` (`category_id`),
  KEY `inventory_attributes_admin_user_id_index` (`admin_user_id`),
  KEY `inventory_attributes_branch_id_index` (`branch_id`),
  KEY `inventory_attributes_is_deleted_index` (`is_deleted`),
  KEY `inventory_attributes_cms_admin_index` (`cms_admin`),
  KEY `inventory_attributes_category_id_index` (`category_id`),
  KEY `inventory_attributes_cms_admin_id_index` (`cms_admin_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_brands` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `branch` varchar(255) NOT NULL DEFAULT 'default',
  `unique_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `cms_admin` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_brands_unique_id_unique` (`unique_id`),
  KEY `inventory_brands_branch_index` (`branch`),
  KEY `inventory_brands_admin_user_id_index` (`admin_user_id`),
  KEY `inventory_brands_branch_id_index` (`branch_id`),
  KEY `inventory_brands_is_deleted_index` (`is_deleted`),
  KEY `inventory_brands_cms_admin_id_index` (`cms_admin_id`),
  KEY `inventory_brands_cms_admin_index` (`cms_admin`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_categories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `branch` varchar(255) NOT NULL DEFAULT 'default',
  `unique_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `cms_admin` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_categories_unique_id_unique` (`unique_id`),
  UNIQUE KEY `inventory_categories_branch_name_unique` (`branch`,`name`),
  KEY `inventory_categories_branch_index` (`branch`),
  KEY `inventory_categories_admin_user_id_index` (`admin_user_id`),
  KEY `inventory_categories_branch_id_index` (`branch_id`),
  KEY `inventory_categories_is_deleted_index` (`is_deleted`),
  KEY `inventory_categories_cms_admin_id_index` (`cms_admin_id`),
  KEY `inventory_categories_cms_admin_index` (`cms_admin`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_direct_sales` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(50) DEFAULT NULL,
  `purchase_item_id` varchar(50) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `attribute_summary` varchar(255) DEFAULT NULL,
  `quantity` decimal(15,2) NOT NULL DEFAULT 0.00,
  `selling_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `sale_source` varchar(100) DEFAULT NULL,
  `customer_reference` varchar(255) DEFAULT NULL,
  `sale_date` timestamp NULL DEFAULT NULL,
  `branch` varchar(50) DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `cms_admin` varchar(50) DEFAULT NULL,
  `cms_admin_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_loan_product_orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `loan_application_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_unique_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_cost` decimal(15,2) NOT NULL DEFAULT 0.00,
  `loan_detail` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `products` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'All products in this order for multi-product support',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'loan_booked',
  `branch` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_loan_product_orders_order_code_unique` (`order_code`),
  KEY `inventory_loan_product_orders_branch_index` (`branch`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch` varchar(255) DEFAULT NULL,
  `invoice_id` varchar(100) DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` varchar(255) NOT NULL DEFAULT 'Cash',
  `transaction_id` varchar(255) DEFAULT NULL,
  `payment_screenshot` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `cms_admin` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_payments_invoice_id_foreign` (`invoice_id`),
  KEY `inventory_payments_branch_index` (`branch`),
  KEY `inventory_payments_invoice_id_idx` (`invoice_id`),
  KEY `inventory_payments_branch_id_index` (`branch_id`),
  KEY `inventory_payments_cms_admin_id_index` (`cms_admin_id`),
  KEY `inventory_payments_cms_admin_index` (`cms_admin`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_product_cart` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(255) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_phone` varchar(255) NOT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `product_id` varchar(255) NOT NULL,
  `branch_id` varchar(255) NOT NULL,
  `cms_admin_id` varchar(255) NOT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `selling_price` decimal(12,2) DEFAULT NULL,
  `buying_price` decimal(12,2) DEFAULT NULL,
  `selected_variant` varchar(255) DEFAULT NULL,
  `verified_by_fe` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_product_cart_unique_id_unique` (`unique_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_product_masters` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `sku_code` varchar(255) NOT NULL,
  `category_id` varchar(100) DEFAULT NULL,
  `brand_id` varchar(100) DEFAULT NULL,
  `unit_id` varchar(100) DEFAULT NULL,
  `gst_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `selling_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `stock` int(11) NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL,
  `product_images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`product_images`)),
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `branch` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `cms_admin` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_product_masters_unique_id_unique` (`unique_id`),
  UNIQUE KEY `inventory_product_masters_branch_sku_unique` (`branch`,`sku_code`),
  KEY `inventory_product_masters_category_id_foreign` (`category_id`),
  KEY `inventory_product_masters_brand_id_foreign` (`brand_id`),
  KEY `inventory_product_masters_unit_id_foreign` (`unit_id`),
  KEY `inventory_product_masters_branch_id_index` (`branch_id`),
  KEY `inventory_product_masters_cms_admin_id_index` (`cms_admin_id`),
  KEY `inventory_product_masters_cms_admin_index` (`cms_admin`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_products` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `unique_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `sku_code` varchar(255) NOT NULL,
  `brand_id` bigint(20) unsigned DEFAULT NULL,
  `category_id` bigint(20) unsigned DEFAULT NULL,
  `attribute_id` bigint(20) unsigned DEFAULT NULL,
  `attribute_value` varchar(255) DEFAULT NULL,
  `unit_id` bigint(20) unsigned DEFAULT NULL,
  `tax_id` bigint(20) unsigned DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `purchase_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `selling_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `opening_stock` int(11) NOT NULL DEFAULT 0,
  `low_stock_quantity` int(11) NOT NULL DEFAULT 5,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_products_brand_id_foreign` (`brand_id`),
  KEY `inventory_products_category_id_foreign` (`category_id`),
  KEY `inventory_products_attribute_id_foreign` (`attribute_id`),
  KEY `inventory_products_admin_user_id_index` (`admin_user_id`),
  KEY `inventory_products_branch_id_index` (`branch_id`),
  KEY `inventory_products_is_deleted_index` (`is_deleted`),
  CONSTRAINT `inventory_products_attribute_id_foreign` FOREIGN KEY (`attribute_id`) REFERENCES `inventory_attributes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `inventory_products_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `inventory_brands` (`id`) ON DELETE SET NULL,
  CONSTRAINT `inventory_products_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `inventory_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_purchase_line_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) DEFAULT NULL,
  `purchase_id` varchar(100) NOT NULL,
  `product_master_id` varchar(100) NOT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `tax_id` bigint(20) unsigned DEFAULT NULL,
  `tax_percent` decimal(5,2) DEFAULT NULL,
  `tax_amount` decimal(15,2) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `purchase_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `selling_price` decimal(12,2) DEFAULT NULL,
  `line_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `branch` varchar(255) DEFAULT NULL,
  `cms_admin` varchar(255) DEFAULT NULL,
  `attribute_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_purchase_items_purchase_id_foreign` (`purchase_id`),
  KEY `inventory_purchase_items_product_master_id_foreign` (`product_master_id`),
  KEY `inventory_purchase_items_tax_id_foreign` (`tax_id`),
  KEY `inv_purchase_items_purchase_uid_idx` (`purchase_id`),
  KEY `inv_purchase_items_product_uid_idx` (`product_master_id`),
  KEY `inv_purchase_items_branch_idx` (`branch`),
  KEY `inv_purchase_items_cms_admin_idx` (`cms_admin`),
  KEY `inventory_purchase_items_branch_id_index` (`branch_id`),
  KEY `inventory_purchase_items_cms_admin_id_index` (`cms_admin_id`),
  KEY `idx_pli_purchase_id` (`purchase_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_purchase_orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(255) NOT NULL,
  `invoice_no` varchar(100) DEFAULT NULL,
  `vendor_id` varchar(100) NOT NULL,
  `vendor_name` varchar(255) DEFAULT NULL,
  `vendor_phone` varchar(20) DEFAULT NULL,
  `vendor_address` text DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `total_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_type` enum('percentage','fixed') NOT NULL DEFAULT 'percentage',
  `discount_value` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `paid_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `due_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `payment_status` enum('unpaid','partial','paid') NOT NULL DEFAULT 'unpaid',
  `payment_method` varchar(255) NOT NULL DEFAULT 'Cash',
  `upi_reference_no` varchar(255) DEFAULT NULL,
  `payment_screenshot` varchar(255) DEFAULT NULL,
  `payment_note` text DEFAULT NULL,
  `status` enum('completed','draft') NOT NULL DEFAULT 'completed',
  `branch` varchar(255) DEFAULT NULL,
  `cms_admin` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `investor_investment_id` varchar(255) DEFAULT NULL,
  `investor_unique_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_purchases_unique_id_unique` (`unique_id`),
  KEY `inventory_purchases_vendor_id_foreign` (`vendor_id`),
  KEY `inv_purchases_vendor_uid_idx` (`vendor_id`),
  KEY `inv_purchases_cms_admin_idx` (`cms_admin`),
  KEY `inventory_purchases_branch_id_index` (`branch_id`),
  KEY `inventory_purchases_cms_admin_id_index` (`cms_admin_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_sales` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(100) NOT NULL,
  `purchase_item_id` varchar(100) DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `attribute_summary` varchar(255) DEFAULT NULL,
  `quantity` decimal(15,2) NOT NULL,
  `selling_price` decimal(15,2) NOT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `sale_source` varchar(255) NOT NULL DEFAULT 'inventory',
  `customer_reference` varchar(255) DEFAULT NULL,
  `sale_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `branch` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `cms_admin` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_sales_branch_id_index` (`branch_id`),
  KEY `inventory_sales_cms_admin_id_index` (`cms_admin_id`),
  KEY `inventory_sales_cms_admin_index` (`cms_admin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_sales_order_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(255) DEFAULT NULL,
  `invoice_id` varchar(100) DEFAULT NULL,
  `invoice_unique_id` varchar(255) DEFAULT NULL,
  `product_id` varchar(100) DEFAULT NULL,
  `product_unique_id` varchar(255) DEFAULT NULL,
  `purchase_item_id` varchar(100) DEFAULT NULL,
  `purchase_item_unique_id` varchar(255) DEFAULT NULL,
  `cms_admin` varchar(255) DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `attribute_summary` varchar(500) DEFAULT NULL,
  `quantity` decimal(15,2) NOT NULL DEFAULT 1.00,
  `price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_type` enum('percentage','fixed') NOT NULL DEFAULT 'percentage',
  `discount_value` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_type` enum('percentage','fixed') NOT NULL DEFAULT 'percentage',
  `tax_value` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_invoice_items_unique_id_unique` (`unique_id`),
  KEY `inventory_invoice_items_invoice_id_foreign` (`invoice_id`),
  KEY `inventory_invoice_items_product_id_foreign` (`product_id`),
  KEY `inv_invoice_items_purchase_item_idx` (`purchase_item_id`),
  KEY `inv_invoice_items_invoice_uid_idx` (`invoice_unique_id`),
  KEY `inv_invoice_items_product_uid_idx` (`product_unique_id`),
  KEY `inv_invoice_items_purchase_uid_idx` (`purchase_item_unique_id`),
  KEY `inv_invoice_items_cms_admin_idx` (`cms_admin`),
  KEY `inventory_invoice_items_branch_id_index` (`branch_id`),
  KEY `inventory_invoice_items_cms_admin_id_index` (`cms_admin_id`),
  KEY `inventory_sales_order_items_is_deleted_index` (`is_deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_sales_orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `branch` varchar(255) DEFAULT NULL,
  `invoice_no` varchar(255) NOT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(255) DEFAULT NULL,
  `customer_address` text DEFAULT NULL,
  `invoice_date` date NOT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_type` enum('percentage','fixed') NOT NULL DEFAULT 'percentage',
  `tax_value` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_type` enum('percentage','fixed') NOT NULL DEFAULT 'percentage',
  `discount_value` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `grand_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `paid_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `balance_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `payment_status` varchar(255) NOT NULL DEFAULT 'Pending',
  `payment_method` varchar(255) DEFAULT NULL,
  `upi_reference_no` varchar(255) DEFAULT NULL,
  `payment_screenshot` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `cms_admin` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_invoices_invoice_no_unique` (`invoice_no`),
  KEY `inventory_invoices_branch_index` (`branch`),
  KEY `inventory_invoices_branch_id_index` (`branch_id`),
  KEY `inventory_invoices_cms_admin_id_index` (`cms_admin_id`),
  KEY `inventory_invoices_cms_admin_index` (`cms_admin`),
  KEY `inventory_sales_orders_is_deleted_index` (`is_deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_taxes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `branch` varchar(255) NOT NULL DEFAULT 'default',
  `unique_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `rate` decimal(8,2) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_taxes_unique_id_unique` (`unique_id`),
  UNIQUE KEY `inventory_taxes_branch_name_unique` (`branch`,`name`),
  KEY `inventory_taxes_branch_index` (`branch`),
  KEY `inventory_taxes_admin_user_id_index` (`admin_user_id`),
  KEY `inventory_taxes_branch_id_index` (`branch_id`),
  KEY `inventory_taxes_is_deleted_index` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_units` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `branch` varchar(255) DEFAULT NULL,
  `unique_id` varchar(255) NOT NULL,
  `unit_name` varchar(255) NOT NULL,
  `short_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `cms_admin` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_units_unique_id_unique` (`unique_id`),
  UNIQUE KEY `inventory_units_branch_unit_name_unique` (`branch`,`unit_name`),
  UNIQUE KEY `inventory_units_branch_short_name_unique` (`branch`,`short_name`),
  KEY `inventory_units_branch_index` (`branch`),
  KEY `inventory_units_admin_user_id_index` (`admin_user_id`),
  KEY `inventory_units_branch_id_index` (`branch_id`),
  KEY `inventory_units_is_deleted_index` (`is_deleted`),
  KEY `inventory_units_cms_admin_id_index` (`cms_admin_id`),
  KEY `inventory_units_cms_admin_index` (`cms_admin`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_vendors` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `branch` varchar(255) NOT NULL DEFAULT 'default',
  `unique_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `business_name` varchar(255) DEFAULT NULL,
  `profile_photo` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) NOT NULL,
  `address` text DEFAULT NULL,
  `gst_number` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `cms_admin` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_vendors_unique_id_unique` (`unique_id`),
  UNIQUE KEY `inventory_vendors_branch_phone_unique` (`branch`,`phone`),
  KEY `inventory_vendors_branch_index` (`branch`),
  KEY `inventory_vendors_admin_user_id_index` (`admin_user_id`),
  KEY `inventory_vendors_branch_id_index` (`branch_id`),
  KEY `inventory_vendors_is_deleted_index` (`is_deleted`),
  KEY `inventory_vendors_cms_admin_id_index` (`cms_admin_id`),
  KEY `inventory_vendors_cms_admin_index` (`cms_admin`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `investment_weekly_redemptions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(255) NOT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `investment_unique_id` varchar(255) NOT NULL,
  `weekly_schedule_id` bigint(20) unsigned NOT NULL,
  `week_number` int(11) NOT NULL,
  `redemption_amount` decimal(15,2) NOT NULL,
  `self_bonus_redeemed` decimal(15,2) NOT NULL DEFAULT 0.00,
  `referral_bonus_redeemed` decimal(15,2) NOT NULL DEFAULT 0.00,
  `redemption_type` enum('partial','full') NOT NULL DEFAULT 'partial',
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `transaction_id` varchar(255) DEFAULT NULL,
  `payment_document` varchar(255) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `redemption_date` date NOT NULL,
  `requested_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `investment_weekly_redemptions_weekly_schedule_id_foreign` (`weekly_schedule_id`),
  CONSTRAINT `investment_weekly_redemptions_weekly_schedule_id_foreign` FOREIGN KEY (`weekly_schedule_id`) REFERENCES `investment_weekly_schedules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `investment_weekly_schedules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(255) NOT NULL,
  `investment_unique_id` varchar(255) NOT NULL,
  `week_number` int(11) NOT NULL,
  `date` date NOT NULL,
  `self_bonus` decimal(15,2) NOT NULL,
  `referral_bonus` decimal(15,2) NOT NULL,
  `total_earning` decimal(15,2) NOT NULL,
  `redemption_value` decimal(15,2) NOT NULL,
  `redeem` decimal(15,2) NOT NULL DEFAULT 0.00,
  `closing_balance` decimal(15,2) NOT NULL,
  `redemption_status` enum('not_redeemed','at_admin','partially_redeemed','fully_redeemed') NOT NULL DEFAULT 'not_redeemed',
  `total_redeemed` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `investment_weekly_schedules_unique_id_unique` (`unique_id`),
  KEY `iws_unique_id_week_idx` (`investment_unique_id`,`week_number`),
  KEY `iws_unique_id_date_idx` (`investment_unique_id`,`date`)
) ENGINE=InnoDB AUTO_INCREMENT=313 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `investments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(255) NOT NULL,
  `investor_id` varchar(255) NOT NULL,
  `investor_unique_id` varchar(255) NOT NULL,
  `self_amount` decimal(15,2) NOT NULL,
  `referral_amount` decimal(15,2) NOT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `investment_start_date` date NOT NULL,
  `lockin_years` int(11) NOT NULL DEFAULT 3,
  `annual_roi` decimal(5,2) NOT NULL,
  `allocation_charges` decimal(5,2) NOT NULL,
  `total_earnings` decimal(15,2) NOT NULL DEFAULT 0.00,
  `maturity_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `investments_investor_unique_id_unique` (`investor_unique_id`),
  UNIQUE KEY `investments_unique_id_unique` (`unique_id`),
  KEY `investments_investor_id_investment_start_date_index` (`investor_id`,`investment_start_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `investor_basic_information` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cms_admin_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referral_type` enum('Self','Referral') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Self',
  `referral_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `investor_id` bigint(20) unsigned DEFAULT NULL,
  `first_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `middle_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mobile` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `emergency_contact` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` date NOT NULL,
  `enrollment_date` date DEFAULT NULL,
  `gender` enum('male','female','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pan_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `aadhaar_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `permanent_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nominee_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `total_referral_bonus` decimal(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Total referral bonus earned by this investor',
  `profile_photo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pan_card_doc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aadhaar_card_doc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passbook_doc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voter_id_doc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `investor_basic_information_email_unique` (`email`),
  UNIQUE KEY `investor_basic_information_pan_number_unique` (`pan_number`),
  UNIQUE KEY `investor_basic_information_unique_id_unique` (`unique_id`),
  KEY `investor_basic_information_mobile_index` (`mobile`),
  KEY `investor_basic_information_branch_id_index` (`branch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `investor_disbursements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `disbursement_unique_id` varchar(255) NOT NULL,
  `investor_unique_id` varchar(255) NOT NULL,
  `investor_name` varchar(255) DEFAULT NULL,
  `pool_name` varchar(255) DEFAULT NULL,
  `pool_label` varchar(255) DEFAULT NULL,
  `investor_type` varchar(255) DEFAULT NULL,
  `loan_application_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `branch_code` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `financial_year` varchar(255) DEFAULT NULL,
  `running_number` int(10) unsigned NOT NULL DEFAULT 1,
  `status` varchar(255) NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `investor_disbursements_disbursement_unique_id_unique` (`disbursement_unique_id`),
  KEY `idx_dis_counter` (`branch_code`,`financial_year`,`pool_label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `investor_investments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cms_admin_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `investor_id` bigint(20) unsigned NOT NULL,
  `investor_unique_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `investor_type_unique_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pool_unique_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pool_id` varchar(255) DEFAULT NULL,
  `investor_type_id` varchar(255) DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `remaining_pool_balance` decimal(15,2) DEFAULT NULL,
  `payment_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `self_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `referral_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(15,2) NOT NULL,
  `date` date NOT NULL,
  `rate` decimal(5,2) NOT NULL,
  `referral_commission` decimal(5,2) NOT NULL DEFAULT 1.20,
  `allocation_charges` decimal(5,2) NOT NULL DEFAULT 0.00,
  `yearly` decimal(15,2) NOT NULL,
  `maturity` decimal(15,2) NOT NULL,
  `referral_amount_earned` decimal(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Total referral amount earned from this investor',
  `referral_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'History of referral amounts received',
  `used_referral_bonus` decimal(15,2) NOT NULL DEFAULT 0.00,
  `declaration_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `declaration_accepted` tinyint(1) NOT NULL DEFAULT 0,
  `lockin` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `investor_investments_unique_id_unique` (`unique_id`),
  KEY `investor_investments_investor_id_foreign` (`investor_id`),
  CONSTRAINT `investor_investments_investor_id_foreign` FOREIGN KEY (`investor_id`) REFERENCES `investor_basic_information` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `investor_referral_transactions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(255) NOT NULL,
  `referrer_unique_id` varchar(255) NOT NULL COMMENT 'Who received the referral bonus',
  `referee_unique_id` varchar(255) NOT NULL COMMENT 'Who made the investment (referred person)',
  `investment_unique_id` varchar(255) NOT NULL COMMENT 'Investment that triggered this referral',
  `investment_amount` decimal(15,2) NOT NULL COMMENT 'Original investment amount',
  `referral_percentage` decimal(5,2) NOT NULL DEFAULT 1.20 COMMENT 'Referral percentage applied',
  `referral_amount` decimal(15,2) NOT NULL COMMENT 'Calculated referral bonus amount',
  `status` enum('pending','credited','failed') NOT NULL DEFAULT 'credited',
  `credited_at` timestamp NULL DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `referral_transactions_unique_id_unique` (`unique_id`),
  KEY `referral_transactions_referrer_unique_id_created_at_index` (`referrer_unique_id`,`created_at`),
  KEY `referral_transactions_referee_unique_id_index` (`referee_unique_id`),
  KEY `referral_transactions_investment_unique_id_index` (`investment_unique_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loan_agents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `agent_unique_id` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `unhashed_password` varchar(255) DEFAULT NULL,
  `phone_no` varchar(255) NOT NULL,
  `gender` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `adhaar_image` varchar(255) DEFAULT NULL,
  `aadhaar_image_back` varchar(255) DEFAULT NULL,
  `pan_image` varchar(255) DEFAULT NULL,
  `voter_id_image` varchar(255) DEFAULT NULL,
  `voter_id_image_back` varchar(255) DEFAULT NULL,
  `driving_license_image` varchar(255) DEFAULT NULL,
  `passbook_image` varchar(255) DEFAULT NULL,
  `police_verification_image` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `is_deleted` tinyint(4) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `user_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `loan_agents_email_unique` (`email`),
  UNIQUE KEY `loan_agents_phone_no_unique` (`phone_no`),
  UNIQUE KEY `loan_agents_agent_unique_id_unique` (`agent_unique_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loan_applications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `admin_user_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `loan_application_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_unique_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cms_admin_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `loan_amount` decimal(15,2) NOT NULL,
  `loan_purpose` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `loan_tenure_months` int(11) NOT NULL,
  `interest_rate` decimal(5,2) NOT NULL,
  `monthly_income` decimal(15,2) NOT NULL,
  `employment_type` enum('salaried','self_employed','business') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `work_experience_years` int(11) NOT NULL,
  `existing_loans` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collateral_details` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salary_slip_document` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_statement_document` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `identity_proof_document` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_proof_document` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `other_document_1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `other_document_2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `application_status` enum('pending','approved','rejected','under_review','back_for_revision') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `rejection_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `revision_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `loan_started` tinyint(1) NOT NULL DEFAULT 0,
  `is_disbursed` tinyint(1) NOT NULL DEFAULT 0,
  `apply_processing_fee` tinyint(1) NOT NULL DEFAULT 0,
  `apply_gst` tinyint(1) NOT NULL DEFAULT 0,
  `processing_fee_type` enum('percentage','fixed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'percentage',
  `processing_fee_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `processing_fee_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `gst_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `gst_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `loan_applications_loan_application_id_unique` (`loan_application_id`),
  KEY `loan_applications_admin_user_id_index` (`admin_user_id`),
  KEY `loan_applications_is_deleted_index` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loan_cam` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `loan_application_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pd_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'from loan_pd_information table',
  `cam_unique_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('branch_manager','credit_manager','reverted_to_pd') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'branch_manager',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `status_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `is_disbursement_created` tinyint(1) NOT NULL DEFAULT 0,
  `branch_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_unique_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cms_admin_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `income_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `expenditure_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `net_surplus` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `credit_decision` enum('approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pd_checked` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `cam_checked` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `tvr_applicant_contacts` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tvr_observation` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deviation_if_any` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deviation_approved_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deviation_status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason_for_rejected` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `credit_sanction_status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sanction_remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verification_documents` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `loan_cam_loan_application_id_unique` (`loan_application_id`),
  UNIQUE KEY `loan_cam_cam_unique_id_unique` (`cam_unique_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loan_credit_application_forms` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `loan_application_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_unique_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `enrollment_number` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cms_admin_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `agent_unique_id` varchar(255) DEFAULT NULL,
  `credit_mode` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `credit_applied_for` decimal(15,2) DEFAULT NULL,
  `down_payment` decimal(15,2) DEFAULT NULL,
  `discount` decimal(15,2) DEFAULT NULL,
  `products` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of products for multi-product CAF',
  `frequency` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenure_option` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `repayment_day` varchar(255) DEFAULT NULL,
  `applicant_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `applicant_income` decimal(15,2) DEFAULT NULL,
  `income_sources` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `other_sources_income` decimal(15,2) DEFAULT NULL,
  `income_proof_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `family_dependents` int(11) DEFAULT NULL,
  `total_income_yearly` decimal(15,2) DEFAULT NULL,
  `expense_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `travel_expense_monthly` decimal(15,2) DEFAULT NULL,
  `other_obligations_monthly` decimal(15,2) DEFAULT NULL,
  `total_monthly_expenses` decimal(15,2) DEFAULT NULL,
  `total_yearly_expenses` decimal(15,2) DEFAULT NULL,
  `obligation_rows` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `total_obligation_amount` decimal(15,2) DEFAULT NULL,
  `total_installment_amount` decimal(15,2) DEFAULT NULL,
  `net_surplus` decimal(15,2) DEFAULT NULL,
  `business_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_nature` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entitled` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_ownership` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_vintage` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_photo_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_proof_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference1_name` varchar(255) DEFAULT NULL,
  `reference1_contact` varchar(255) DEFAULT NULL,
  `reference1_address` text DEFAULT NULL,
  `reference2_name` varchar(255) DEFAULT NULL,
  `reference2_contact` varchar(255) DEFAULT NULL,
  `reference2_address` text DEFAULT NULL,
  `partners` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `bank_first_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_middle_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_last_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ifsc_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passbook_image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('field_executive','branch_manager','branch_support_executive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'field_executive',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `is_pd_created` tinyint(1) NOT NULL DEFAULT 0,
  `is_disbursement_created` tinyint(1) NOT NULL DEFAULT 0,
  `is_cam_created` tinyint(1) NOT NULL DEFAULT 0,
  `status_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `is_deleted` tinyint(4) NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `loan_credit_application_forms_loan_application_id_unique` (`loan_application_id`),
  KEY `loan_caf_enrollment_number_index` (`enrollment_number`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loan_customer_verification_history` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_unique_id` varchar(255) DEFAULT NULL,
  `enrollment_number` varchar(255) DEFAULT NULL,
  `action` enum('verified','rejected') NOT NULL,
  `reason` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `occupation_details_applicant` tinyint(1) NOT NULL DEFAULT 0,
  `occupation_details_nominee` tinyint(1) NOT NULL DEFAULT 0,
  `house_details` tinyint(1) NOT NULL DEFAULT 0,
  `assets_details` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('verified','rejected','pending') NOT NULL DEFAULT 'pending',
  `admin_id` varchar(255) DEFAULT NULL,
  `admin_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `loan_customer_verification_history_customer_id_action_index` (`customer_unique_id`),
  KEY `loan_cvh_enrollment_number_index` (`enrollment_number`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loan_customers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `admin_user_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_unique_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `enrollment_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `enrollment_date` datetime DEFAULT NULL,
  `agent_unique_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `middle_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` enum('male','female','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `unhashed_password` varchar(255) DEFAULT NULL,
  `phone_no` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_number_1` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_number_2` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cms_admin_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'customer',
  `status` enum('field_executive','branch_manager','branch_support_executive','deletion_request') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'field_executive',
  `status_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `customer_consent` tinyint(1) NOT NULL DEFAULT 0,
  `verification_status` enum('pending','verified','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `verified_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `verification_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `father_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `service_area_pin` varchar(6) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `religion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `caste` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_1` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_2` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permanent_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `correspondence_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nominee_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nominee_relationship` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nominee_relationship_other` varchar(255) DEFAULT NULL,
  `nominee_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occupation` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salaried_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_nature` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `spouse_occupation` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `spouse_salaried_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `spouse_business_nature` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `residence_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `years_of_staying` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `house_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `number_of_rooms` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assets` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `is_disabled` tinyint(1) NOT NULL DEFAULT 0,
  `disability_type` varchar(255) DEFAULT NULL,
  `customer_photo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adhaar_number` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adhaar_image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adhaar_image_back` varchar(255) DEFAULT NULL,
  `pan_number` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pan_image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `driving_license_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `driving_license_image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voter_id_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ration_card_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voter_id_image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voter_id_image_back` varchar(255) DEFAULT NULL,
  `ration_card_image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ifsc_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passbook_image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `other_name` varchar(255) DEFAULT NULL,
  `other_document` varchar(255) DEFAULT NULL,
  `remember_token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `sourcing_type` enum('self','referral') NOT NULL DEFAULT 'self',
  `referral_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `loan_customers_user_unique_id_unique` (`customer_unique_id`),
  UNIQUE KEY `loan_customers_email_is_deleted_unique` (`email`,`is_deleted`),
  KEY `loan_customers_user_id_foreign` (`user_id`),
  KEY `loan_customers_branch_id_foreign` (`branch_id`),
  KEY `loan_customers_cms_admin_id_foreign` (`cms_admin_id`),
  KEY `loan_customers_admin_user_id_index` (`admin_user_id`),
  KEY `loan_customers_is_deleted_index` (`is_deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loan_disbursements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `payment_id` varchar(255) DEFAULT NULL,
  `disbursement_id` varchar(255) DEFAULT NULL,
  `investor_unique_id` varchar(255) DEFAULT NULL,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `loan_application_id` varchar(255) NOT NULL,
  `pd_application_id` varchar(255) DEFAULT NULL,
  `cam_unique_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `customer_unique_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `date_of_disbursement` date DEFAULT NULL,
  `booking_date` date DEFAULT NULL,
  `disbursement_status` enum('pending','Disbursed') NOT NULL DEFAULT 'pending',
  `dfa_document` varchar(255) DEFAULT NULL COMMENT 'DFA document',
  `cfa_document` varchar(255) DEFAULT NULL COMMENT 'CFA document',
  `dpn_document` varchar(255) DEFAULT NULL COMMENT 'DPN document',
  `vernacular_document` varchar(255) DEFAULT NULL COMMENT 'Vernacular document',
  `disbursement_video` varchar(255) DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `payment_status` enum('on_process','NEFT_done','NEFT_failed') NOT NULL DEFAULT 'on_process',
  `payment_method` varchar(255) NOT NULL DEFAULT 'Cash',
  `upi_reference_no` varchar(255) DEFAULT NULL,
  `payment_screenshot` varchar(255) DEFAULT NULL,
  `is_disbursed` tinyint(1) NOT NULL DEFAULT 0,
  `is_loan_started` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `loan_disbursements_payment_id_unique` (`payment_id`),
  KEY `loan_disbursements_is_deleted_index` (`is_deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loan_emi_payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `emi_schedule_id` varchar(255) NOT NULL,
  `loan_id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `payment_amount` decimal(15,2) NOT NULL,
  `payment_date` datetime NOT NULL,
  `payment_method` enum('online','cash','cheque','bank_transfer','bank','upi') NOT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `payment_image` varchar(255) DEFAULT NULL,
  `payment_status` enum('pending','success','failed') NOT NULL DEFAULT 'pending',
  `approval_status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `receipt_number` varchar(255) DEFAULT NULL,
  `approved_by` varchar(255) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `is_pre_close` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `loan_emi_payments_admin_user_id_index` (`admin_user_id`),
  KEY `loan_emi_payments_is_deleted_index` (`is_deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loan_emi_schedules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `emi_id` varchar(255) DEFAULT NULL,
  `loan_id` varchar(255) NOT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `installment_no` int(11) NOT NULL,
  `installment_date` date NOT NULL,
  `frequency` enum('weekly','biweekly','monthly') NOT NULL DEFAULT 'monthly',
  `principal_due` decimal(15,2) NOT NULL,
  `interest_due` decimal(15,2) NOT NULL,
  `installment_amount` decimal(15,2) NOT NULL,
  `outstanding_balance` decimal(15,2) NOT NULL,
  `status` enum('pending','paid','overdue','partial','pending_at_admin','closed','pre_closed') NOT NULL DEFAULT 'pending',
  `is_deleted` tinyint(4) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `loan_emi_schedules_emi_id_unique` (`emi_id`),
  KEY `emi_schedules_loan_id_installment_no_index` (`loan_id`,`installment_no`)
) ENGINE=InnoDB AUTO_INCREMENT=111 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loan_fee_masters` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `processing_fee` decimal(10,2) NOT NULL,
  `gst_percentage` decimal(5,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `user_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `loan_fee_masters_admin_user_id_index` (`admin_user_id`),
  KEY `loan_fee_masters_is_deleted_index` (`is_deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loan_interest_masters` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `loan_type` varchar(255) NOT NULL,
  `interest_rate` decimal(5,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `user_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `loan_interest_masters_admin_user_id_index` (`admin_user_id`),
  KEY `loan_interest_masters_is_deleted_index` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loan_investor_types` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(255) NOT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `loan_investor_types_unique_id_unique` (`unique_id`),
  UNIQUE KEY `loan_investor_types_name_branch_unique` (`name`,`branch_id`),
  KEY `loan_investor_types_status_index` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loan_loans` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `loan_number` varchar(255) NOT NULL,
  `loan_application_id` varchar(255) NOT NULL,
  `customer_unique_id` varchar(255) NOT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `agent_unique_id` varchar(255) DEFAULT NULL,
  `disbursement_id` varchar(255) DEFAULT NULL,
  `loan_amount` decimal(15,2) NOT NULL,
  `interest_rate` decimal(5,2) NOT NULL,
  `tenure_months` int(11) NOT NULL,
  `frequency` enum('weekly','biweekly','monthly') NOT NULL DEFAULT 'monthly',
  `emi_amount` decimal(15,2) NOT NULL,
  `processing_fee` decimal(15,2) NOT NULL DEFAULT 0.00,
  `gst_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `insurance_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `disbursement_amount` decimal(15,2) NOT NULL,
  `loan_start_date` date NOT NULL,
  `installment_start_date` date NOT NULL,
  `is_deleted` tinyint(4) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `loans_loan_number_unique` (`loan_number`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loan_pd_information` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `pd_application_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `loan_application_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_unique_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cms_admin_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `house_verification_photo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_verification_photo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pd_information` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `obligation_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `verification_status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verification_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('field_executive','branch_manager','approved','rejected','pending') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'field_executive',
  `status_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `is_cam_created` tinyint(1) NOT NULL DEFAULT 0,
  `is_disbursement_created` tinyint(1) NOT NULL DEFAULT 0,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `loan_credit_application_verifications_pd_application_id_unique` (`pd_application_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=314 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `modules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `module_id` varchar(255) NOT NULL,
  `module_name` varchar(255) NOT NULL,
  `key` varchar(255) NOT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `modules_module_id_unique` (`module_id`),
  UNIQUE KEY `modules_module_name_branch_id_unique` (`module_name`,`branch_id`),
  KEY `modules_branch_id_foreign` (`branch_id`),
  CONSTRAINT `modules_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`code`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `money_pools` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `limit_from` decimal(15,2) NOT NULL,
  `limit_to` decimal(15,2) NOT NULL,
  `notes` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `money_pools_unique_id_unique` (`unique_id`),
  UNIQUE KEY `money_pools_name_branch_unique` (`name`,`branch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `otp_verifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `otp` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `otp_verifications_email_index` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1024 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `admin_user_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `branch_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_role_id_unique` (`role_id`),
  KEY `roles_admin_user_id_index` (`admin_user_id`),
  KEY `roles_is_deleted_index` (`is_deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=114 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subscriptions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `plan_name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `subscriptions_admin_user_id_index` (`admin_user_id`),
  KEY `subscriptions_branch_id_index` (`branch_id`),
  KEY `subscriptions_is_deleted_index` (`is_deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `units` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `short_name` varchar(255) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `is_deleted` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_delete_requested` tinyint(1) NOT NULL DEFAULT 0,
  `admin_user_id` varchar(255) DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `unhashed_password` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `role` varchar(100) NOT NULL,
  `department` varchar(255) DEFAULT NULL,
  `branch` varchar(255) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_user_id_unique` (`user_id`),
  KEY `users_admin_user_id_index` (`admin_user_id`),
  KEY `users_branch_id_index` (`branch_id`),
  KEY `users_is_deleted_index` (`is_deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=151 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_advance_bookings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `booking_no` varchar(255) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_phone` varchar(20) NOT NULL,
  `customer_address` varchar(1000) NOT NULL,
  `booking_date` date NOT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_type` varchar(20) DEFAULT NULL,
  `tax_value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_type` varchar(20) DEFAULT NULL,
  `discount_value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `grand_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `paid_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `balance_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `payment_status` varchar(50) NOT NULL DEFAULT 'Pending',
  `payment_method` varchar(50) DEFAULT NULL,
  `upi_reference_no` varchar(100) DEFAULT NULL,
  `payment_screenshot` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `is_deleted` tinyint(4) NOT NULL DEFAULT 0,
  `branch` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `cms_admin` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_advance_bookings_booking_no_unique` (`booking_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_advance_booking_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(255) DEFAULT NULL,
  `booking_id` varchar(255) NOT NULL,
  `booking_unique_id` varchar(255) DEFAULT NULL,
  `product_id` varchar(255) DEFAULT NULL,
  `product_unique_id` varchar(255) DEFAULT NULL,
  `purchase_item_id` varchar(255) DEFAULT NULL,
  `purchase_item_unique_id` varchar(255) DEFAULT NULL,
  `cms_admin` varchar(255) DEFAULT NULL,
  `cms_admin_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `attribute_summary` varchar(500) DEFAULT NULL,
  `quantity` decimal(15,4) NOT NULL,
  `price` decimal(15,2) NOT NULL,
  `discount_type` varchar(20) DEFAULT NULL,
  `discount_value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_type` varchar(20) DEFAULT NULL,
  `tax_value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `is_deleted` tinyint(4) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
