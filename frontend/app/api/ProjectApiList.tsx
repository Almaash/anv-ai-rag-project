import BASE_URL from "./BaseUrl";

const ProjectApiList = {

  // AUTH
  unified_login: "/unified-login",
  register: "/register",
  login: "/login",
  loan_login: "/loan/login",
  loan_customer_login: "/loan-customer/login",
  loan_investor_login: "/loan-investor/login",
  inventory_login: "/inventory/login",
  hrms_login: "/hrms/login",
  hrms_employee_login: "/hrms/employee-login",
  changePassword: "/change-password",

  // AUTH
  api_postSubscription: "/subscription",
  api_getSubscription: "/subscription",
  
  
  // Forgot Password
  forgot_password: "/forgot-password",
  verify_forgot_password_otp: "/verify-forgot-password-otp",
  reset_password: "/reset-password",
  update_user_password: "/users/update-password",

  // Modules
  api_createModule: "/modules",
  api_getModules: "/modules",
  api_getAllModules: "/modules/all",
  api_getModuleById: "/modules",
  api_updateModule: "/modules",
  api_deleteModule: "/modules",


  // Role
  GET_ALL_ROLES: "/roles",
  GET_SINGLE_ROLE: "/roles",
  CREATE_ROLE: "/roles",
  UPDATE_ROLE: "/roles",
  DELETE_ROLE: "/roles",

  // Departments
  api_postDepartments: "/departments",
  api_getDepartments: "/departments",
  api_deleteDepartments: "/departments",

  // Branches
  api_getBranches: "/branches",
  GET_PUBLIC_BRANCHES: "/branches/public",

  // Branch Cities
  api_getBranchCities: "/branch-cities",
  api_createBranchCity: "/branch-cities",
  api_updateBranchCity: "/branch-cities",
  api_deleteBranchCity: "/branch-cities",

  // OTP
  api_sendOtp: "/loan/send-otp",
  api_verifyOtp: "/loan/verify-otp",

  // Users
  api_getUsers: "/users",
  api_getUsersByBranch: "/users/by-branch", // + /{branch}


  // Dashboard 
  GET_DASHBOARD_OVERVIEW: "/super-admin/dashboard/overview",
  GET_ALL_DASHBOARD_BRANCHES: "/super-admin/dashboard/all-branches",
  GET_ALL_DASHBOARD_BRANCHES_WISE: "/super-admin/dashboard/branch-wise",

  // Loan Intrest Rate
  api_getInterestRates: "/get-all-interest-rates",
  api_createInterestRates: "/create-interest-rate",
  api_getInterestRatesById: "/get-interest-rate-by-id",
  api_updateInterestRatesById: "/update-interest-rate",
  api_deleteInterestRates: "/delete-interest-rate",


  // Loan Customer
  api_getFeeMaster: "/get-all-fee-masters",
  api_createFeeMaster: "/create-fee-master",
  api_updateFeeMaster: "/update-fee-master",
  api_deteteFeeMaster: "/delete-fee-master",
  api_getDeletedCustomers: "/get-all-deleted-loan-customer",
  api_restoreDeletedLoanCustomer: "/restore-deleted-loan-customer",



  // Customer Enrollments (Existing Customer Flow)
  api_createEnrollment: "/customer-enrollments",
  api_getPendingEnrollments: "/get-pending-enrollments",
  api_getVerifiedEnrollments: "/get-verified-enrollments",
  api_getRevertedEnrollments: "/get-reverted-enrollments",
  api_verifyEnrollment: "/verify-enrollment",
  api_getVerifiedEnrollmentsForCaf: "/get-verified-enrollments-for-caf",
  api_deleteEnrollment: "/delete-enrollment",

  // Loan Customer
  api_createLonaCustomers: "/create-loan-customer",
  api_getAllLonaCustomers: "/get-all-loan-customer",
  api_getAllLonaCustomersWithoutPagination: "/get-all-loan-customer-without-pagination",
  api_getLonaCustomerById: "/get-loan-customer-by-id",
  // api_getCustomerEnrollmentById: "/customer-enrollment-details",
  api_updateLoanCustomer: "/update-loan-customer",
  api_deleteLoanCustomers: "/delete-loan-customer",
  api_cancelCustomerDeletionRequest:"/cancel-customer-deletion-request",
  api_customerDeletionRequest: "/customer-deletion-request",
  api_promoteLoanCustomer: "/promote-loan-customer",
  api_revertLoanCustomer: "/revert-enrollment/{enrollment_number}",
  api_resubmitEnrollment: "/resubmit-enrollment",
  api_verifyCustomer: "/verify-loan-customer",
  api_getVerifiedCAF: "/get-verified-caf",
  api_getAllBranchManagers: "/get-all-branch-managers",
api_getEligibleCustomersForCAF: "/caf/eligible-customers",
  // PD APis
  api_storePD: "/store-pd",
  api_updatePD: "/update-pd",
  api_getAllPD: "/get-all-pd",
  api_getAllCashPD: "/get-all-cash-pd",
  api_getPDById: "/get-pd-by-id",

  // Loan CAM
  api_createCAM: "/create-cam",
  api_getAllCAM: "/get-all-cam",
  api_getCAMById: "/get-cam-by-id",
  api_verifyCAM: "/verify-cam",
  api_revertCAMToPD: "/revert-cam-to-pd",
  api_revertCAMToUnverifiedPD: "/revert-cam-to-unverified-pd",
  api_updateCAMSanction: "/update-cam-sanction",
  api_getVerifiedCams: "/get-verified-cams",
  api_getVProductPd: "/get-all-product-pd",
  api_saveDisbursement: "/save-disbursement",
  api_saveFinalDisbursement: "/save-final-disbursement",
  api_getInitializedDisbursements: "/get-initialized-disbursements",
  api_getDisbursementCompleteDetails: "/admin/get-disbursement-complete-details", // + /{id}

  // Loan Agents
  api_createAgents: "/create-loan-agent",
  api_getAllAgents: "/get-all-loan-agents",
  api_getAgentById: "/get-loan-agent-by-id",
  api_updateAgent: "/update-loan-agent",
  api_deleteAgent: "/delete-loan-agent",

  // Investor Disbursements
  api_getInvestorDisbursements: "/loan/investor-disbursements",
  api_createInvestorDisbursement: "/loan/investor-disbursements",
  api_previewInvestorDisbursementId: "/loan/investor-disbursements/preview-id",
  api_deductInvestorPoolBalance: "/loan/investor-investments", // + /deduct-balance/{id}

  // Loan Reports (Consolidated)
  api_getCAFReport: "/report/loan/caf",
  api_getPDReport: "/report/loan/pd",
  api_getCAMReport: "/report/loan/cam",
  api_getDisbursementReport: "/admin/get-all-disbursements",
  api_getMasterLoanReport: "/report/loan/caf",

  // Loan Reports (new section)
  GET_REPORT_CUSTOMER: "/report/customers",
  EXPORT_ALL_CUSTOMER_HISTORY: "/export-caf-csv",
  GET_REPORT_HISTORY_CUSTOMER: "/get-customer-history",
  EXPORT_REPORT_HISTORY_CUSTOMER: "/export-customer-history",
  GET_REPORT_CAF: "/report/caf",
  GET_REPORT_PD: "/report/pd",
  GET_REPORT_CAM: "/report/cam",
  GET_REPORT_DISBURSEMENT: "/report/disbursement",
  GET_REPORT_LOANS: "/report/loans",
  GET_REPORT_EMI: "/report/emis",
  GET_REPORT_EMI_COLLECTION: "/report/emis/collection",

  // Loan Applications
  api_createLoanApplication: `${BASE_URL}/create-loan-application`,
  api_editLoanApplication: `${BASE_URL}/edit-loan-application`,
  api_getMyLoanApplication: `${BASE_URL}/get-my-loan-applications`,
  api_getLoanDashboard: "/loan/dashboard",
  api_getLoanApplicationById: `${BASE_URL}/get-loan-application-by-id`,
  api_updatedLoanApplicationStatusById: `${BASE_URL}/update-loan-application-status`,
  api_deleteLoanApplication: "/delete-loan-application",

  // Loan Disbursements
  DISBURSE_LOAN: "/admin/disburse-loan",
  GET_ALL_DISBURSEMENTS: "/admin/get-all-disbursements",
  GET_ALL_DISBURSEMENTS_ID: "/admin/get-all-disbursements",
  UPDATE_DISBURSEMENTS_ID: "/admin/update-disbursement-dates",
  GET_ALL_DISBURSEMENTS_WITH_DATES: "/admin/get-all-disbursements-with-dates",
  GET_FINAL_DISBURSEMENTS: "/admin/get-final-disbursements",
  GET_ALL_RAW_DISBURSEMENTS: "/admin/get-all-raw-disbursements",
  GET_FINAL_DISBURSEMENTS_FOR_INVENTORY: "/admin/get-final-disbursements-for-inventory",
  GET_COMPLETED_INVENTORY_PAYMENTS: "/admin/get-completed-inventory-payments",
  GET_DISBURSEMENT_INVENTORY_DETAILS: "/admin/get-disbursement-inventory-details", // + /{id}
  UPDATE_INVENTORY_PAYMENT: "/admin/update-inventory-payment", // + /{id}
  api_clearDisbursementDocuments: "/clear-disbursement-documents", // + /{id}
  api_imageBaseUrl: process.env.NEXT_PUBLIC_IMAGE_BASE_URL || "http://127.0.0.1:8000",

  // Loans (ACTUAL LOANS)
  START_LOAN: "/start-loan",
  api_getAllLOANS: "/get-all-loans",
  api_getLOANSDetails: "/get-loan-details",
  api_getEMIShedules: "/get-emi-schedule",
  GET_MY_LOANS: "/get-my-loans",
  GET_LOAN_BY_ID: "/get-loan-by-id",
  api_getLoanCard: "/loan-card",

  // Loan Reports
  GET_LOAN_REPORT: "/loan/reports/loans",
  GET_APPLICATION_REPORT: "/loan/reports/applications",
  GET_DISBURSEMENT_REPORT: "/loan/reports/disbursements",
  VIEW_LOAN_REPORT: "/loan/reports/loans/view",
  VIEW_APPLICATION_REPORT: "/loan/reports/applications/view",
  VIEW_DISBURSEMENT_REPORT: "/loan/reports/disbursements/view",
  GET_CUSTOMER_REPORT: "/loan/reports/customers",
  VIEW_CUSTOMER_REPORT: "/loan/reports/customers",

  // Loan - Investor Type Master
  CREATE_INVESTOR_TYPE: "/loan/investor-types",
  GET_INVESTOR_TYPES: "/loan/investor-types",
  GET_SINGLE_INVESTOR_TYPE: "/loan/investor-types",
  UPDATE_INVESTOR_TYPE: "/loan/investor-types",
  DELETE_INVESTOR_TYPE: "/loan/investor-types",

  // Loan - Investor Basic Information
  CHECK_REFERRAL: "/loan/investor-basic-info/check",
  CREATE_INVESTOR_BASIC_INFO: "/loan/investor-basic-info",
  GET_INVESTOR_BASIC_INFO: "/loan/investor-basic-info",
  GET_INVESTOR_DASHBOARD: "/loan/investor-investments/dashboard",
  INVESTOR_DASHBOARD: "/loan/investor-investments/investor-dashboard",
  GET_SINGLE_INVESTOR_BASIC_INFO: "/loan/investor-basic-info",
  UPDATE_INVESTOR_BASIC_INFO: "/loan/investor-basic-info",
  DELETE_INVESTOR_BASIC_INFO: "/loan/investor-basic-info",

  // Loan - Money Pools
  CREATE_MONEY_POOL: "/loan/money-pools",
  GET_MONEY_POOLS: "/loan/money-pools",
  GET_SINGLE_MONEY_POOL: "/loan/money-pools",
  UPDATE_MONEY_POOL: "/loan/money-pools",
  DELETE_MONEY_POOL: "/loan/money-pools",

  // EMIs
  api_makeEmiPayment: "/make-emi-payment",
  api_getAllEmiPayment: "/get-all-emi-payments",
  // GET_EMI_SCHEDULE_BY_LOAN_ID: "/get-emi-schedule-by-loan-id",
  // MAKE_EMI_PAYMENT: "/make-emi-payment",
  api_getEmiPaymentById: "/get-emi-payment-by-emi-id",
  // GET_ALL_EMI_PAYMENTS: "/get-all-emi-payments",
  api_approveEmiPayment: "/admin/approve-emi-payment",
  api_rejectEmiPayment: "/admin/reject-emi-payment",
  api_revertEmiPayment: "/admin/revert-emi-payment",
  api_loanPreClose: "/loan-pre-close",
  api_approvePreClose: "/admin/approve-pre-close",
  // GET_ALL_EMI_PAYMENTS_BY_ID: "/get-all-emi-payments-by-id",


  // Inventory - Unit Master
  CREATE_UNIT: "/inventory/units",
  GET_UNITS: "/inventory/units",
  GET_SINGLE_UNIT: "/inventory/units",
  UPDATE_UNIT: "/inventory/units",
  DELETE_UNIT: "/inventory/units",

  // Inventory - Vendor Master
  CREATE_VENDOR: "/inventory/vendors",
  GET_VENDORS: "/inventory/vendors",
  GET_SINGLE_VENDOR: "/inventory/vendors",
  UPDATE_VENDOR: "/inventory/vendors",
  DELETE_VENDOR: "/inventory/vendors",

  // Inventory - Category Master
  CREATE_CATEGORY: "/inventory/categories",
  GET_CATEGORIES: "/inventory/categories",
  GET_SINGLE_CATEGORY: "/inventory/categories",
  UPDATE_CATEGORY: "/inventory/categories",
  DELETE_CATEGORY: "/inventory/categories",

  // Inventory - Tax Master
  CREATE_TAX: "/inventory/taxes",
  GET_TAXES: "/inventory/taxes",
  GET_SINGLE_TAX: "/inventory/taxes",
  UPDATE_TAX: "/inventory/taxes",
  DELETE_TAX: "/inventory/taxes",

  // Inventory - Attribute Master
  CREATE_ATTRIBUTE: "/inventory/attributes",
  GET_ATTRIBUTES: "/inventory/attributes",
  GET_SINGLE_ATTRIBUTE: "/inventory/attributes",
  UPDATE_ATTRIBUTE: "/inventory/attributes",
  DELETE_ATTRIBUTE: "/inventory/attributes",

  // Inventory - Brand Master
  CREATE_BRAND: "/inventory/brands",
  GET_BRANDS: "/inventory/brands",
  GET_SINGLE_BRAND: "/inventory/brands",
  UPDATE_BRAND: "/inventory/brands",
  DELETE_BRAND: "/inventory/brands",

  // Inventory - Products API
  GET_INVENTORY_PRODUCTS: "/inventory/inventory-products-viewer",

  // Inventory - Simple Product Master (separate table)
  LOAN_READY_PRODUCT_CATALOG: "/inventory/product-masters/loan-ready-catalog",
  LOAN_PRODUCT_ORDER_CATALOG: "/inventory/loan-product-orders/catalog",
  LOAN_PRODUCT_ORDERS: "/inventory/loan-product-orders",
  RESTORE_LOAN_PRODUCT_ORDER:`/inventory/loan-product-orders`,
  PRODUCT_INQUIRY: "/inventory/inventory-product-cart",
  GET_PRODUCT_INQUIRIES: "/inventory/inventory-product-cart",
  GET_PRODUCT_INQUIRY_DETAIL: "/inventory/inventory-product-cart", // + /{inquiryId}
  VERIFY_PRODUCT_INQUIRY_FE: "/inventory/inventory-product-cart", // + /{inquiryId}/verify-fe
  GET_PRODUCT_EDIT_DATA: "/inventory/product-masters/edit-data", // + /{id}
  CREATE_PRODUCT_MASTER: "/inventory/product-masters",
  GET_PRODUCT_MASTERS: "/inventory/product-masters",
  GET_PRODUCT_STOCK_SUMMARY: "/inventory/product-masters/stock-summary",
  GET_PRODUCT_PURCHASE_HISTORY: "/inventory/product-masters", // + /{id}/purchase-history
  GET_SINGLE_PRODUCT_MASTER: "/inventory/product-masters",
  UPDATE_PRODUCT_MASTER: "/inventory/product-masters",
  DELETE_PRODUCT_MASTER: "/inventory/product-masters",

  // Inventory - Orders / Invoices
  GET_AVAILABLE_PRODUCTS: "/inventory/products/available-for-sale",
  PRODUCT_SEARCH: "/inventory/products-search",
  CREATE_INVOICE: "/inventory/invoices",
  GET_INVOICES: "/inventory/invoices",
  DELETE_INVOICE: "/inventory/invoices",

  // Inventory - Advance booking
  CREATE_ADVANCE_BOOKING: "/inventory/advance-bookings",
  GET_ADVANCE_BOOKINGS: "/inventory/advance-bookings",
  DELETE_ADVANCE_BOOKING: "/inventory/advance-bookings",

  // Inventory - Purchases
  GET_PURCHASE_MASTER_DATA: "/inventory/purchases/master-data", // + /{id?}
  GET_PURCHASE_BY_ID: "/inventory/purchases", // + /{id}
  CREATE_PURCHASE: "/inventory/purchases",
  GET_PURCHASES: "/inventory/purchases",
  GET_PURCHASE_DETAIL: "/inventory/purchases", // + /{id}
  UPDATE_PURCHASE: "/inventory/purchases", // + /{id}
  DELETE_PURCHASE: "/inventory/purchases", // + /{id}
  GET_PURCHASE_INVOICE: "/inventory/purchase-invoices", // + /{id}
  GET_PURCHASE_INVOICE_HISTORY: "/inventory/purchases", // + /{id}/invoices
  GENERATE_PURCHASE_INVOICE: "/inventory/purchases", // + /{id}/invoices/generate

  // Inventory - Reports / Analytics
  GET_VENDOR_PURCHASE_REPORT: "/inventory/reports/vendor-purchases",
  GET_SALES_REPORT: "/inventory/reports/sales",
  GET_STOCK_REPORT: "/inventory/reports/stock",
  GET_PRODUCTS_LIST: "/inventory/product-masters",

  // Inventory - Direct Sale
  DIRECT_SALE: "/inventory/direct-sale",
  SALES_LIST: "/inventory/sales-list",

  // HRMS
  HRMS_DASHBOARD: "/hrms/dashboard",

  // HRMS - Designations
  GET_DESIGNATIONS: "/hrms/designations",
  CREATE_DESIGNATION: "/hrms/designations",
  UPDATE_DESIGNATION: "/hrms/designations",
  DELETE_DESIGNATION: "/hrms/designations",

  // HRMS - Departments
  GET_HRMS_DEPARTMENTS: "/hrms/departments",
  CREATE_HRMS_DEPARTMENT: "/hrms/departments",
  UPDATE_HRMS_DEPARTMENT: "/hrms/departments",
  DELETE_HRMS_DEPARTMENT: "/hrms/departments",

  // HRMS - Employees
  GET_EMPLOYEES: "/hrms/employees",
  CREATE_EMPLOYEE: "/hrms/employees",
  UPDATE_EMPLOYEE: "/hrms/employees",
  DELETE_EMPLOYEE: "/hrms/employees",
  GET_SINGLE_EMPLOYEE: "/hrms/employees",

  // HRMS - Attendance
  GET_ATTENDANCE: "/hrms/attendance",
  MARK_ATTENDANCE: "/hrms/attendance",
  MARK_BULK_ATTENDANCE: "/hrms/attendance/mark-bulk",
  MARK_MULTIPLE_ATTENDANCE: "/hrms/attendance/mark-multiple",
  GET_ATTENDANCE_REPORT: "/hrms/attendance/report",
  UPDATE_ATTENDANCE: "/hrms/attendance",

  // HRMS - Leaves
  GET_LEAVE_TYPES: "/hrms/leave-types",
  CREATE_LEAVE_TYPE: "/hrms/leave-types",
  UPDATE_LEAVE_TYPE: "/hrms/leave-types",
  DELETE_LEAVE_TYPE: "/hrms/leave-types",
  GET_LEAVE_REQUESTS: "/hrms/leave-requests",
  CREATE_LEAVE_REQUEST: "/hrms/leave-requests",
  GET_LEAVE_REQUEST: "/hrms/leave-requests",
  APPROVE_LEAVE_REQUEST: "/hrms/leave-requests",
  REJECT_LEAVE_REQUEST: "/hrms/leave-requests",
  CANCEL_LEAVE_REQUEST: "/hrms/leave-requests",
  GET_ATTENDANCE_CALENDAR: "/hrms/employees",

  // HRMS - Salary
  GET_SALARY_STRUCTURES: "/hrms/salary-structures",
  UPSERT_SALARY_STRUCTURE: "/hrms/salary-structures",
  GET_SALARIES: "/hrms/salaries",
  GET_SALARY: "/hrms/salaries",
  GENERATE_SALARY: "/hrms/generate-salary",
  CALCULATE_PAYROLL: "/hrms/payroll/calculate",
  UPDATE_PAYOUT_STATUS: "/hrms/salaries",

  // HRMS - Holidays
  GET_HOLIDAYS: "/hrms/holidays",
  CREATE_HOLIDAY: "/hrms/holidays",
  UPDATE_HOLIDAY: "/hrms/holidays",
  DELETE_HOLIDAY: "/hrms/holidays",

  // Loan CAF
  api_createCAF: "/create-caf",
  api_getAllCAF: "/get-all-caf",
  // api_getVerifiedCAF: "/get-verified-caf",
  api_getCAFById: "/get-caf-by-id",
  api_updateCAF: "/update-caf",
  api_updateCAFStatus: "/update-caf-status",
  api_revertCAF: "/revert-caf-to-field-executive",
  api_verifyCAF: "/verify-caf",
  api_deleteCAF: "/delete-caf",
  api_cafDeletionRequest: "/caf-deletion-request",
  api_cancelCAFDeletionRequest:"/cancel-caf-deletion-request",
  api_getPdCreatedCAF: "/get-pd-created-caf",

  // Disbursement
  // api_saveDisbursement: "/save-disbursement",
  // api_saveFinalDisbursement: "/save-final-disbursement",
  // api_getInitializedDisbursements: "/get-initialized-disbursements",
  api_getDisbursementById: "/get-disbursement-by-id",

  // Loan - Investor Investments
  CREATE_INVESTOR_INVESTMENT: "/loan/investor-investments",
  GET_INVESTOR_INVESTMENTS: "/loan/investor-investments",
  GET_INVESTOR_INVESTMENT_BY_ID: "/loan/investor-investments/get-by-id",
  GET_INVESTOR_WEEKLY_SCHEDULE: "/loan/investor-investments",
  UPDATE_INVESTOR_INVESTMENT: "/loan/investor-investments",
  DELETE_INVESTOR_INVESTMENT: "/loan/investor-investments",
  REQUEST_WEEKLY_REDEMPTION: "/request-weekly-redemption",
  GET_ALL_WEEKLY_REDEMPTIONS: "/get-all-weekly-redemptions",
  GET_WEEKLY_REDEMPTION_BY_ID: "/get-weekly-redemption-by-id",
  APPROVE_WEEKLY_REDEMPTION: "admin/approve-weekly-redemption",
  REJECT_WEEKLY_REDEMPTION: "admin/reject-weekly-redemption",

  // Finance & Accountant
  FINANCE_DASHBOARD: "/finance/dashboard",
  FINANCE_TRANSACTIONS: "/finance/transactions",
  FINANCE_CASH_BOOK: "/finance/cash-book",
  FINANCE_CASH_BOOK_TODAY: "/finance/cash-book/today",
};


export default ProjectApiList;
