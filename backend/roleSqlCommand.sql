SET @branch_id = 'GRD-1101';

DELETE FROM roles WHERE branch_id = @branch_id;

INSERT INTO roles (role_id, name, description, permissions, branch_id, created_at, updated_at)
VALUES

-- Investor Panel
(CONCAT('role_', UUID()), 'Investor Panel', 'Investor Panel',
JSON_ARRAY(
"read_loan_investor_pool_master",
"read_pool_type_master",
"read_loan_investors",
"read_loan_investor_basic_info",
"read_loan_investor_dashboard",
"read_investor_redemption_requests"
), @branch_id, NOW(), NOW()),

-- Hrms Management
(CONCAT('role_', UUID()), 'Hrms Management', 'Hrms Management',
JSON_ARRAY(
"read_hrms_dashboard",
"read_hrms_master_setup",
"read_hrms_staff_management",
"read_hrms_leave_management",
"read_hrms_payroll_salary"
), @branch_id, NOW(), NOW()),

-- Credit Manager
(CONCAT('role_', UUID()), 'Credit Manager', 'Credit Manager',
JSON_ARRAY(
"read_loan_cam_verification"
), @branch_id, NOW(), NOW()),

-- Branch Support Executive
(CONCAT('role_', UUID()), 'Branch Support Executive', 'Branch Support Executive',
JSON_ARRAY(
"read_loan_customer_verification",
"read_loan_emi_payments"
), @branch_id, NOW(), NOW()),

-- Branch Manager
(CONCAT('role_', UUID()), 'Branch Manager', 'Branch Manager',
JSON_ARRAY(
"read_loan_dashboard",
"read_loan_intrest_master",
"read_loan_fee_master",
"read_loan_field_executives",
"read_loan_caf_verification",
"read_loan_pd_information",
"read_loan_cam",
"read_loan_disbursement",
"read_loan_start_loan",
"read_loan_agreement_docs"
), @branch_id, NOW(), NOW()),

-- Field Executive
(CONCAT('role_', UUID()), 'Field Executive', 'Field Executive',
JSON_ARRAY(
"read_loan_customers",
"read_loan_caf_details",
"read_loan_start_loan",
"read_loan_products",
"read_loan_product_inquiries"
), @branch_id, NOW(), NOW()),

-- Inventory Manager
(CONCAT('role_', UUID()), 'Inventory Manager', 'Inventory Manager',
JSON_ARRAY(
"read_inventory_dashboard",
"read_inventory_master",
"read_inventory_purchase",
"read_inventory_sell",
"read_inventory_reports"
), @branch_id, NOW(), NOW()),

-- Accountant
(CONCAT('role_', UUID()), 'Accountant', 'Accountant',
JSON_ARRAY(
"read_finance_dashboard",
"read_finance_transactions"
), @branch_id, NOW(), NOW());