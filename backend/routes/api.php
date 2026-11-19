<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\Investor\BasicInformationController;
use App\Http\Controllers\Api\InvestorInvestmentController;
use App\Http\Controllers\Api\InvestorDisbursementController;
use App\Http\Controllers\Api\Inventory\UnitController;
use App\Http\Controllers\Api\Inventory\VendorController;
use App\Http\Controllers\Api\Inventory\CategoryController;
use App\Http\Controllers\Api\Inventory\TaxController;
use App\Http\Controllers\Api\Inventory\AttributeController;
use App\Http\Controllers\Api\Inventory\BrandController;
use App\Http\Controllers\Api\Inventory\ProductController;
use App\Http\Controllers\Api\Inventory\ProductMasterController;
use App\Http\Controllers\Api\Inventory\PurchaseController;
use App\Http\Controllers\Api\Inventory\PurchaseMasterDataController;
use App\Http\Controllers\Api\Inventory\PurchaseInvoiceController;
use App\Http\Controllers\Api\Inventory\InvoiceController;
use App\Http\Controllers\Api\Inventory\InventoryReportController;
use App\Http\Controllers\Api\Inventory\LoanProductOrderController;
use App\Http\Controllers\Api\InventoryProductCartController;
use App\Http\Controllers\Api\Loan\EmiController;
use App\Http\Controllers\Api\Loan\FeeMasterController;
use App\Http\Controllers\Api\Loan\InterestMasterController;
use App\Http\Controllers\Api\Loan\LoanAgentController;
use App\Http\Controllers\Api\Loan\LoanApplicationController;
use App\Http\Controllers\Api\LoanController;
use App\Http\Controllers\Api\Loan\LoanCustomerController;
use App\Http\Controllers\Api\Loan\InvestorTypeController;
use App\Http\Controllers\Api\Loan\OtpController;
use App\Http\Controllers\Api\Loan\CustomerEnrollmentController;
use App\Http\Controllers\Api\Loan\LoanDisbursementController;
use App\Http\Controllers\Api\Loan\CAMController;
use App\Http\Controllers\Api\Loan\CreditApplicationFormController;
use App\Http\Controllers\Api\Loan\DisbursementController;
use App\Http\Controllers\Api\Loan\LoanDashboardController;
use App\Http\Controllers\Api\Loan\LoanReportController;
use App\Http\Controllers\Api\Loan\LoanConsolidatedReportController;
use App\Http\Controllers\Api\Loan\CustomerReportController;
use App\Http\Controllers\Api\Loan\CafExportController;
use App\Http\Controllers\Api\MoneyPoolController;
use App\Http\Controllers\CustomerProcessController;
use App\Http\Controllers\CustomerDashboardController;
use App\Http\Controllers\Api\hrms\DashboardController;
use App\Http\Controllers\Api\hrms\AttendanceController;
use App\Http\Controllers\Api\hrms\DesignationController;
use App\Http\Controllers\Api\hrms\EmployeeController;
use App\Http\Controllers\Api\hrms\HolidayController;
use App\Http\Controllers\Api\hrms\LeaveController;
use App\Http\Controllers\Api\hrms\LeaveRequestController;
use App\Http\Controllers\Api\hrms\SalaryController;
use App\Http\Controllers\Api\hrms\DepartmentController as HrmsDepartmentController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ModuleController;
use App\Http\Controllers\Api\Inventory\DirectSaleController;
use App\Http\Controllers\Api\Inventory\AdvanceBookingController;
use App\Http\Controllers\Api\Finance\FinanceDashboardController;
use App\Http\Controllers\Api\Finance\FinanceTransactionController;
use App\Http\Controllers\Api\SuperAdmin\DashboardController as SuperAdminDashboardController;
use App\Http\Controllers\Api\Finance\CashBookController;
use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AiLoanController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('unified-login', [AuthController::class, 'unifiedLogin']);
Route::post('register', [AuthController::class, 'register']);
Route::post('login', [AuthController::class, 'login'])->name('login');
Route::post('hrms/employee-login', [AuthController::class, 'employeeLogin']);
Route::post('loan/login', [AuthController::class, 'loanLogin']);
Route::post('loan-customer/login', [AuthController::class, 'loanCustomerLogin']);
Route::post('loan-investor/login', [AuthController::class, 'investorLogin']);
Route::post('inventory/login', [AuthController::class, 'inventoryLogin']);

// OTP Routes
Route::post('loan/send-otp', [OtpController::class, 'sendOtp']);
Route::post('loan/verify-otp', [OtpController::class, 'verifyOtp']);
Route::post('hrms/login', [AuthController::class, 'hrmsLogin']);

// Forgot Password Routes (public)
Route::post('forgot-password', [\App\Http\Controllers\Api\ForgotPasswordController::class, 'sendOtp']);
Route::post('verify-forgot-password-otp', [\App\Http\Controllers\Api\ForgotPasswordController::class, 'verifyOtp']);
Route::post('reset-password', [\App\Http\Controllers\Api\ForgotPasswordController::class, 'resetPassword']);

// Public inventory loan-buy APIs.
// These are intentionally left without authentication for external loan-buy flows.
Route::prefix('inventory')->group(function () {
    Route::get('loan-product-orders/catalog', [LoanProductOrderController::class, 'catalog']);
    Route::get('loan-product-orders/catalog/{uniqueId}', [LoanProductOrderController::class, 'showCatalog']);
    Route::get('loan-product-orders', [LoanProductOrderController::class, 'index']);
    Route::post('loan-product-orders', [LoanProductOrderController::class, 'store']);
    Route::post('loan-product-orders/{id}/restore', [LoanProductOrderController::class, 'restore']);
    Route::post('inventory-product-cart', [InventoryProductCartController::class, 'store']);
});

// Public branches list (needed for inventory/login screen branch selection)
Route::get('branches/public', [BranchController::class, 'index']);

// Protected routes
Route::middleware('auth:sanctum,employee')->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);
    Route::post('change-password', [AuthController::class, 'changePassword']);

    // User management
    Route::get('users', [UserController::class, 'index']);
    Route::post('users', [UserController::class, 'store']);
    Route::get('users/by-branch/{branch}', [UserController::class, 'byBranch']);
    Route::get('users/{id}', [UserController::class, 'show']);
    Route::post('users/{id}', [UserController::class, 'update']);
    Route::post('users/update-password/{id}', [UserController::class, 'updatePassword']);
    Route::delete('users/{id}', [UserController::class, 'destroy']);

    // Subscription management
    Route::get('subscription', [SubscriptionController::class, 'get']);
    Route::post('subscription', [SubscriptionController::class, 'upsert']);

    // Role management
    Route::get('roles', [RoleController::class, 'index']); // Supports query filter: branch_id (empty branch_id shows only null branches)
    Route::post('roles', [RoleController::class, 'store']); // Requires branch_id
    Route::get('roles/{id}', [RoleController::class, 'show']);
    Route::post('roles/{id}', [RoleController::class, 'update']); // Can update branch_id
    Route::delete('roles/{id}', [RoleController::class, 'destroy']);

    // Module management
    Route::get('modules', [ModuleController::class, 'index']); // Supports query filters: branch_id, is_active, per_page
    Route::get('modules/all', [ModuleController::class, 'all']); // Get all modules without pagination
    Route::post('modules', [ModuleController::class, 'store']); // Requires module_name, key
    Route::get('modules/{id}', [ModuleController::class, 'show']);
    Route::post('modules/{id}', [ModuleController::class, 'update']); // Can update module_name, key, branch_id, is_active
    Route::delete('modules/{id}', [ModuleController::class, 'destroy']);

    // Department management
    Route::get('departments', [DepartmentController::class, 'index']);
    Route::post('departments', [DepartmentController::class, 'store']);
    Route::get('departments/{id}', [DepartmentController::class, 'show']);
    Route::post('departments/{id}', [DepartmentController::class, 'update']);
    Route::delete('departments/{id}', [DepartmentController::class, 'destroy']);

    // Branch management
    Route::get('branches', [BranchController::class, 'index']);
    Route::post('branches', [BranchController::class, 'store']);
    Route::get('branches/{id}', [BranchController::class, 'show']);
    Route::post('branches/{id}', [BranchController::class, 'update']);
    Route::delete('branches/{id}', [BranchController::class, 'destroy']);

    // Branch Cities
    Route::get('branch-cities', [\App\Http\Controllers\Api\BranchCityController::class, 'index']);
    Route::post('branch-cities', [\App\Http\Controllers\Api\BranchCityController::class, 'store']);
    Route::get('branch-cities/{id}', [\App\Http\Controllers\Api\BranchCityController::class, 'show']);
    Route::post('branch-cities/{id}', [\App\Http\Controllers\Api\BranchCityController::class, 'update']);
    Route::delete('branch-cities/{id}', [\App\Http\Controllers\Api\BranchCityController::class, 'destroy']);

    // -------------- Loan Apis --------------------------------- //
    // Interest Master routes
    Route::get('get-all-interest-rates', [InterestMasterController::class, 'index']);
    Route::post('create-interest-rate', [InterestMasterController::class, 'store']);
    Route::get('get-interest-rate-by-id/{id}', [InterestMasterController::class, 'show']);
    Route::post('update-interest-rate/{id}', [InterestMasterController::class, 'update']);
    Route::post('delete-interest-rate/{id}', [InterestMasterController::class, 'destroy']);

    // Fee Master routes
    Route::get('get-all-fee-masters', [FeeMasterController::class, 'index']);
    Route::post('create-fee-master', [FeeMasterController::class, 'store']);
    Route::get('get-fee-master-by-id/{id}', [FeeMasterController::class, 'show']);
    Route::post('update-fee-master/{id}', [FeeMasterController::class, 'update']);
    Route::post('delete-fee-master/{id}', [FeeMasterController::class, 'destroy']);

    // Customer Enrollments (Existing Customer - New Loan Cycle)
    Route::post('customer-enrollments', [CustomerEnrollmentController::class, 'store']);
    Route::get('customer-enrollments/{customer_unique_id}', [CustomerEnrollmentController::class, 'index']);
    Route::post('verify-enrollment/{enrollment_number}', [CustomerEnrollmentController::class, 'verifyEnrollment'])->where('enrollment_number', '.*');
    Route::get('get-pending-enrollments', [CustomerEnrollmentController::class, 'getPendingEnrollments']);
    Route::get('get-verified-enrollments', [CustomerEnrollmentController::class, 'getVerifiedEnrollments']);
    Route::get('get-verified-enrollments-for-caf', [CustomerEnrollmentController::class, 'getVerifiedEnrollmentsForCaf']);
    Route::post('delete-enrollment/{enrollment_number}', [CustomerEnrollmentController::class, 'deleteEnrollment']);
    Route::post(
        '/revert-enrollment/{enrollment_number}',
        [CustomerEnrollmentController::class, 'revertEnrollment']
    );
    Route::post(
        '/resubmit-enrollment/{enrollment_number}',
        [CustomerEnrollmentController::class, 'resubmitEnrollment']
    );
    Route::get(
        '/get-reverted-enrollments',
        [CustomerEnrollmentController::class, 'getRevertedEnrollments']
    );
    // Loan Customer management routes  
    Route::get('get-all-loan-customer', [LoanCustomerController::class, 'index']); // Supports query filters: user_id, branch_id, cms_admin_id, agent_unique_id, role, status, verification_status, search, per_page
    Route::get('get-all-loan-customer-without-pagination', [LoanCustomerController::class, 'getAllWithoutPagination']); // Supports query filters: user_id, branch_id, cms_admin_id, role, status, verification_status, search
    Route::get(
        '/caf/eligible-customers',
        [LoanCustomerController::class, 'getEligibleCustomersForCAF']
    );
    Route::get('get-all-branch-managers', [LoanCustomerController::class, 'getBranchManagers']);
    Route::get('get-trashed-loan-customers', [LoanCustomerController::class, 'getTrashedCustomers']); // Get soft deleted customers
    Route::get('get-all-deleted-loan-customer', [LoanCustomerController::class, 'getTrashedCustomers']); // Get all soft deleted customers
    Route::post('create-loan-customer', [LoanCustomerController::class, 'store']); // Accepts user_id, branch_id, cms_admin_id
    Route::get('get-loan-customer-by-id/{customer_unique_id}', [LoanCustomerController::class, 'show']);
    Route::get('get-customer-history/{customer_unique_id}', [LoanCustomerController::class, 'getCustomerHistory']);
    Route::get('export-customer-history/{customer_unique_id}', [LoanCustomerController::class, 'exportCustomerHistory']);
    Route::get('export-caf-csv/{loan_application_id}', [CafExportController::class, 'exportCsv'])->where('loan_application_id', '.*');
    Route::get('export-caf-csv', [CafExportController::class, 'exportCsv']); // Export all CAFs
    // Route::get(
    //     '/customer-enrollment-details/{customerUniqueId}',
    //     [LoanCustomerController::class, 'getEnrollmentDetails']
    // );
    Route::post('update-loan-customer/{id}', [LoanCustomerController::class, 'update']); // Can update user_id, branch_id, cms_admin_id
    Route::post('verify-loan-customer/{customer_unique_id}', [LoanCustomerController::class, 'verifyCustomer']);
    Route::post('reject-loan-customer/{id}', [LoanCustomerController::class, 'rejectCustomer']);
    Route::get('loan-customer-verification-history/{customer_unique_id}', [LoanCustomerController::class, 'getVerificationHistory']);
    Route::post('delete-loan-customer/{id}', [LoanCustomerController::class, 'deleteCustomer']); // Cascade soft delete via GET
    Route::post('restore-loan-customer/{id}', [LoanCustomerController::class, 'restoreCustomer']); // Restore soft deleted customer
    Route::post('restore-deleted-loan-customer/{customer_unique_id}', [LoanCustomerController::class, 'restoreDeletedCustomer']); // Restore customer and all related soft deleted records
    Route::post('force-delete-loan-customer/{id}', [LoanCustomerController::class, 'forceDeleteCustomer']); // Permanently delete
    Route::post('promote-loan-customer/{customer_unique_id}', [LoanCustomerController::class, 'promoteToBranchManager']);
    Route::post('revert-loan-customer/{customer_unique_id}', [LoanCustomerController::class, 'revertToFieldExecutive']);
    Route::post('customer-deletion-request/{customer_unique_id}', [LoanCustomerController::class, 'deletionRequest']);
    Route::post('cancel-customer-deletion-request/{customer_unique_id}', [LoanCustomerController::class, 'cancelDeletionRequest']);

    // Loan Credit Application Form (CAF) routes
    Route::get('get-all-caf', [CreditApplicationFormController::class, 'index']);
    Route::get('get-verified-caf', [CreditApplicationFormController::class, 'getVerifiedCafs']);
    Route::get('get-pd-created-caf', [CreditApplicationFormController::class, 'getPdCreatedCafs']);
    Route::get('get-trashed-caf', [CreditApplicationFormController::class, 'getTrashedCafs']); // Get soft deleted CAFs
    Route::post('create-caf', [CreditApplicationFormController::class, 'store']);
    Route::post('update-caf/{loan_application_id}', [CreditApplicationFormController::class, 'update']);
    Route::get('get-caf-by-id/{loan_application_id}', [CreditApplicationFormController::class, 'show']);
    Route::post('update-caf-status/{loan_application_id}', [CreditApplicationFormController::class, 'updateStatus']);
    Route::post('caf-deletion-request/{loan_application_id}', [CreditApplicationFormController::class, 'deletionRequest']);
    Route::post('cancel-caf-deletion-request/{loan_application_id}', [CreditApplicationFormController::class, 'cancelDeletionRequest']);
    Route::post('revert-caf-to-field-executive/{id}', [CreditApplicationFormController::class, 'revertToFieldExecutive']);
    Route::post('verify-caf/{id}', [CreditApplicationFormController::class, 'verify']);
    // Route::post('delete-caf/{id}', [CreditApplicationFormController::class, 'destroy']); // Soft delete CAF only
    Route::get('delete-caf/{id}', [CreditApplicationFormController::class, 'deleteCaf'])->where('id', '.*'); // Cascade soft delete CAF + PD + CAM + Disbursement + Loan + EMIs
    Route::post('delete-caf/{id}', [CreditApplicationFormController::class, 'deleteCaf'])->where('id', '.*'); // Cascade soft delete via DELETE
    Route::post('restore-caf/{id}', [CreditApplicationFormController::class, 'restoreCaf']); // Restore soft deleted CAF
    Route::post('force-delete-caf/{id}', [CreditApplicationFormController::class, 'forceDeleteCaf']); // Permanently delete CAF

    // Loan PD routes
    Route::post('store-pd', [CreditApplicationFormController::class, 'storePD']);
    Route::get('get-all-pd', [CreditApplicationFormController::class, 'getAllPD']);
    Route::get('get-all-cash-pd', [CreditApplicationFormController::class, 'getAllCashPD']);
    Route::get('get-all-product-pd', [CreditApplicationFormController::class, 'getAllProductPD']);
    Route::get('get-pd-by-id/{id}', [CreditApplicationFormController::class, 'getPDById']);
    Route::get('get-pd-by-application-id/{pd_application_id}', [CreditApplicationFormController::class, 'getPDByApplicationId']);
    Route::post('update-pd/{id}', [CreditApplicationFormController::class, 'updatePD']);
    Route::post('delete-pd/{id}', [CreditApplicationFormController::class, 'deletePD']);

    // Loan CAM routes
    Route::post('create-cam', [CAMController::class, 'store']);
    Route::get('get-all-cam', [CAMController::class, 'index']);
    Route::get('get-cam-by-id/{id}', [CAMController::class, 'show']);
    Route::post('verify-cam/{id}', [CAMController::class, 'verify']);
    Route::get('get-cam-documents/{id}', [CAMController::class, 'getVerificationDocuments']);
    Route::post('update-cam-sanction/{id}', [CAMController::class, 'updateSanction']);
    Route::get('get-verified-cams', [CAMController::class, 'getVerifiedCams']);
    Route::post('revert-cam-to-pd/{id}', [CAMController::class, 'revertToPD']);
    Route::post('revert-cam-to-unverified-pd/{id}', [CAMController::class, 'revertToUnverifiedPD']);
    Route::get('get-my-verified-cams', [CAMController::class, 'getMyVerifiedCams']);

    // Loan Disbursement routes
    Route::post('save-disbursement', [DisbursementController::class, 'store']);
    Route::post('save-final-disbursement', [DisbursementController::class, 'storeFinal']);
    Route::post('clear-disbursement-documents/{id}', [DisbursementController::class, 'clearDocuments'])->where('id', '.*');
    Route::get('get-initialized-disbursements', [DisbursementController::class, 'getInitializedDisbursements']);
    Route::get('get-disbursement-by-id/{id}', [DisbursementController::class, 'show'])->where('id', '.*');

    // Loan Agent management routes
    Route::get('get-all-loan-agents', [LoanAgentController::class, 'index']);
    Route::post('create-loan-agent', [LoanAgentController::class, 'store']);
    Route::get('get-loan-agent-by-id/{id}', [LoanAgentController::class, 'show']);
    Route::post('update-loan-agent/{id}', [LoanAgentController::class, 'update']);
    Route::post('delete-loan-agent/{id}', [LoanAgentController::class, 'destroy']);

    // Loan Application routes
    Route::get('get-my-loan-applications', [LoanApplicationController::class, 'index']); // Supports query filters: customer_unique_id, user_id, branch_id, cms_admin_id, application_status, is_disbursed, loan_started, search, per_page
    Route::post('create-loan-application', [LoanApplicationController::class, 'store']);
    Route::post('edit-loan-application/{id}', [LoanApplicationController::class, 'update']);
    Route::get('get-loan-application-by-id/{id}', [LoanApplicationController::class, 'show']);
    Route::post('update-loan-application-status/{id}', [LoanApplicationController::class, 'updateStatus']);
    Route::post('delete-loan-application/{id}', [LoanApplicationController::class, 'destroy']);

    // Customer Process Tracking
    Route::get('customer-processes/{customer_id}', [CustomerProcessController::class, 'getCustomerProcesses']);
    // Route::get('customer/{customer_id}/caf/{caf_id}', [CustomerProcessController::class, 'getCustomerCAF']);
    // Route::get('customer/{customer_id}/pd/{pd_id}', [CustomerProcessController::class, 'getCustomerPD']);
    // Route::get('customer/{customer_id}/cam/{cam_id}', [CustomerProcessController::class, 'getCustomerCAM']);
    // Route::get('customer/{customer_id}/disbursement/{disbursement_id}', [CustomerProcessController::class, 'getCustomerDisbursement']);

    // Customer Dashboard
    Route::get('customer-dashboard/{customer_id}', [CustomerDashboardController::class, 'getDashboard']);

    // Loan management routes
    Route::get('get-my-loans', [LoanController::class, 'index']); // Supports query filters: customer_unique_id, user_id, branch_id, cms_admin_id, loan_status, search, per_page
    Route::get('get-loan-by-id/{loan_number}', [LoanController::class, 'show']);
    Route::get('get-emi-schedule-by-loan-id/{loan_number}', [LoanController::class, 'getEmiSchedule']);
    Route::get('get-loan-card/{loan_number}', [LoanController::class, 'getLoanCard']);
    // Route::get('test-loan-data', [LoanController::class, 'testLoanData']);

    // Loan Card API (standalone)
    Route::get('loan-card/{loan_number}', [\App\Http\Controllers\Api\LoanCardController::class, 'getLoanCard']);

    // Loan Management APIs
    Route::post('start-loan', [LoanController::class, 'startLoan']);
    Route::get('get-all-loans', [LoanController::class, 'getAllLoans']);
    Route::get('get-loan-details/{loan_number}', [LoanController::class, 'getLoanDetails']);
    Route::get('get-emi-schedule/{loan_number}', [LoanController::class, 'getEmiSchedule']);

    // Loan Disbursement routes
    // Loan Disbursement routes (user_id/branch_id/cms_admin_id can be supplied/filtered)
    Route::post('admin/disburse-loan', [LoanDisbursementController::class, 'disburseLoan']);
    Route::get('admin/get-all-disbursements', [LoanDisbursementController::class, 'getAllDisbursements']);
    Route::get('admin/get-all-raw-disbursements', [LoanDisbursementController::class, 'getAllRawDisbursements']);
    Route::get('admin/get-all-disbursements-with-dates', [LoanDisbursementController::class, 'getAllDisbursementsWithDates']);

    // Loan Dashboard & Reports
    Route::get('loan/dashboard', [LoanDashboardController::class, 'index']);
    Route::get('loan/reports/loans', [LoanReportController::class, 'loanReport']);
    Route::get('loan/reports/applications', [LoanReportController::class, 'applicationReport']);
    Route::get('loan/reports/disbursements', [LoanReportController::class, 'disbursementReport']);
    Route::get('loan/reports/loans/view/{id}', [LoanReportController::class, 'viewLoan']);
    Route::get('loan/reports/applications/view/{id}', [LoanReportController::class, 'viewApplication']);
    Route::get('loan/reports/disbursements/view/{id}', [LoanReportController::class, 'viewDisbursement']);
    Route::get('loan/reports/customers', [CustomerReportController::class, 'index']);
    Route::get('loan/reports/customers/{id}', [CustomerReportController::class, 'show']);

    // Consolidated Loan Reports
    Route::get('report/loan/caf', [LoanConsolidatedReportController::class, 'cafReport']);
    Route::get('report/loan/pd', [LoanConsolidatedReportController::class, 'pdReport']);
    Route::get('report/loan/cam', [LoanConsolidatedReportController::class, 'camReport']);
    Route::get('report/loan/master', [LoanConsolidatedReportController::class, 'masterReport']);
    Route::get('report/loan/disbursement', [LoanConsolidatedReportController::class, 'disbursementReport']);
    Route::get('report/loan/payment-inventory', [LoanConsolidatedReportController::class, 'paymentInventoryReport']);
    Route::get('report/loan/final-disbursement', [LoanConsolidatedReportController::class, 'finalDisbursementReport']);
    Route::get('report/cam-disbursement', [LoanConsolidatedReportController::class, 'camDisbursementReport']);

    // Unified Reports
    Route::get('report/customers',    [\App\Http\Controllers\Api\Loan\ReportController::class, 'customerReport']);
    Route::get('report/caf',           [\App\Http\Controllers\Api\Loan\ReportController::class, 'cafReport']);
    Route::get('report/pd',            [\App\Http\Controllers\Api\Loan\ReportController::class, 'pdReport']);
    Route::get('report/cam',           [\App\Http\Controllers\Api\Loan\ReportController::class, 'camReport']);
    Route::get('report/disbursement',  [\App\Http\Controllers\Api\Loan\ReportController::class, 'disbursementReport']);
    Route::get('report/emis',          [\App\Http\Controllers\Api\Loan\ReportController::class, 'emiReport']);
    Route::get('report/emis/collection', [\App\Http\Controllers\Api\Loan\ReportController::class, 'emiCollectionReport']);
    Route::get('report/loans',         [\App\Http\Controllers\Api\Loan\ReportController::class, 'loanReport']);

    Route::get('admin/get-final-disbursements', [LoanDisbursementController::class, 'getFinalDisbursements']);
    Route::get('admin/get-disbursement-by-id/{id}', [LoanDisbursementController::class, 'getDisbursementById'])->where('id', '.*');
    Route::get('admin/get-all-disbursements/{id}', [LoanDisbursementController::class, 'getDisbursementById'])->where('id', '.*');
    Route::post('admin/update-inventory-payment/{id}', [LoanDisbursementController::class, 'updateInventoryPayment'])->where('id', '.*');
    Route::get('admin/get-completed-inventory-payments', [LoanDisbursementController::class, 'getCompletedInventoryPayments']);
    Route::get('admin/get-disbursement-inventory-details/{id}', [LoanDisbursementController::class, 'getDisbursementDetails'])->where('id', '.*');
    Route::get('admin/get-final-disbursements-for-inventory', [LoanDisbursementController::class, 'getFinalDisbursementsForInventory']);
    Route::get('admin/get-disbursements-by-application/{loanApplicationId}', [LoanDisbursementController::class, 'getDisbursementsByLoanApplication'])->where('loanApplicationId', '.*');
    Route::get('admin/get-disbursement-complete-details', [LoanDisbursementController::class, 'getDisbursementCompleteDetails']);
    Route::post('admin/update-disbursement-dates/{id}', [LoanDisbursementController::class, 'updateDisbursementDates'])->where('id', '.*');

    // EMI payment routes
    Route::post('make-emi-payment', [EmiController::class, 'makePayment']);
    Route::get('get-my-payment-history', [EmiController::class, 'getPaymentHistory']);
    Route::get('get-all-emi-payments', [EmiController::class, 'getAllPayments']); // Supports query filters: approval_status, branch_id, cms_admin_id
    Route::get('get-all-emi-payments-by-id/{id}', [EmiController::class, 'getAllPaymentsById']);
    Route::get('get-emi-payment-by-id/{id}', [EmiController::class, 'getPaymentById']);
    Route::get('get-emi-payment-by-emi-id/{emi_id}', [EmiController::class, 'getPaymentByEmiId']);
    Route::post('admin/approve-emi-payment/{id}', [EmiController::class, 'approvePayment']);
    Route::post('admin/reject-emi-payment/{id}', [EmiController::class, 'rejectPayment']);
    Route::post('admin/revert-emi-payment/{emi_id}', [EmiController::class, 'revertPayment']);
    Route::post('loan-pre-close', [EmiController::class, 'preClose']);
    Route::post('admin/approve-pre-close/{loan_id}', [EmiController::class, 'approvePreClose'])->where('loan_id', '.*');

    // Loan Investor Type Master
    Route::prefix('loan')->group(function () {
        Route::get('investor-types', [InvestorTypeController::class, 'index']);
        Route::post('investor-types', [InvestorTypeController::class, 'store']);
        Route::get('investor-types/{id}', [InvestorTypeController::class, 'show']);
        Route::post('investor-types/{id}', [InvestorTypeController::class, 'update']);
        Route::delete('investor-types/{id}', [InvestorTypeController::class, 'destroy']);

        Route::get('investor-basic-info', [BasicInformationController::class, 'index']);
        Route::post('investor-basic-info', [BasicInformationController::class, 'store']);
        Route::get('investor-basic-info/check', [BasicInformationController::class, 'checkInvestor']); // Query parameter version
        Route::post('investor-basic-info/check', [BasicInformationController::class, 'checkInvestorPost']); // POST version for special chars
        Route::get('investor-basic-info/check/{id}', [BasicInformationController::class, 'checkInvestor'])->where('id', '.*');
        Route::get('investor-basic-info/{id}', [BasicInformationController::class, 'show'])->where('id', '.*');
        Route::post('investor-basic-info/{id}', [BasicInformationController::class, 'update'])->where('id', '.*');
        Route::delete('investor-basic-info/{id}', [BasicInformationController::class, 'destroy'])->where('id', '.*');

        // Money Pools
        Route::get('money-pools', [MoneyPoolController::class, 'index']);
        Route::post('money-pools', [MoneyPoolController::class, 'store']);
        Route::get('money-pools/{id}', [MoneyPoolController::class, 'show']);
        Route::post('money-pools/{id}', [MoneyPoolController::class, 'update']);
        Route::delete('money-pools/{id}', [MoneyPoolController::class, 'destroy']);

        // INVESTOR INVESTMENTS
        Route::get('investor-investments/dashboard', [InvestorInvestmentController::class, 'dashboard']);
        Route::get('investor-investments/investor-dashboard/{investor_unique_id}', [InvestorInvestmentController::class, 'investorDashboard'])->where('investor_unique_id', '.*');
        Route::get('investor-investments', [InvestorInvestmentController::class, 'index']);

        // POST fallback for IDs with special characters (e.g. FAIJ/ANV/INS/0001)
        // GET fallback: pass id as query param ?id=FAIJ/ANV/INS/0001
        Route::post('investor-investments/get-by-id', [InvestorInvestmentController::class, 'showByPost']);
        Route::get('investor-investments/get-by-id', [InvestorInvestmentController::class, 'showByPost']);

        // These are distinct static paths followed by a parameter
        Route::get('investor-investments/weekly-schedule/{id}', [InvestorInvestmentController::class, 'getWeeklyScheduleFromTable'])->where('id', '.*');
        Route::get('investor-investments/referral-earnings/{id}', [InvestorInvestmentController::class, 'getReferralEarnings'])->where('id', '.*');
        Route::get('investor-investments/available-referral-bonus/{id}', [InvestorInvestmentController::class, 'getAvailableReferralBonus'])->where('id', '.*');
        Route::post('investor-investments/redeem/{id}', [InvestorInvestmentController::class, 'processRedemption'])->where('id', '.*');
        Route::post('investor-investments/deduct-balance/{id}', [InvestorInvestmentController::class, 'deductPoolBalance'])->where('id', '.*');

        Route::post('investor-investments', [InvestorInvestmentController::class, 'store']);

        // Root ID matches - strictly no slashes allowed in the ID here to prevent matching sub-paths
        Route::get('investor-investments/{id}', [InvestorInvestmentController::class, 'show'])->where('id', '.*');
        Route::post('investor-investments/{id}', [InvestorInvestmentController::class, 'update'])->where('id', '.*');
        Route::delete('investor-investments/{id}', [InvestorInvestmentController::class, 'destroy'])->where('id', '.*');
    });
});

// Direct weekly schedule route (similar to EMI schedule)
Route::get('get-weekly-schedule/{id}', [InvestorInvestmentController::class, 'getWeeklyScheduleFromTable'])->where('id', '.*');

// RE-DEFINING THE CONFLICTING ROUTE WITH HIGH PRIORITY
Route::get('investor-investments-weekly-schedule/{id}', [InvestorInvestmentController::class, 'getWeeklyScheduleFromTable'])->where('id', '.*');

// Investment Weekly Redemption routes (similar to EMI payments)
Route::post('request-weekly-redemption', [\App\Http\Controllers\Api\InvestmentRedemptionController::class, 'requestRedemption']);
Route::get('get-my-redemption-history', [\App\Http\Controllers\Api\InvestmentRedemptionController::class, 'getMyRedemptions']);
Route::get('get-all-weekly-redemptions', [\App\Http\Controllers\Api\InvestmentRedemptionController::class, 'getAllRedemptions']); // Supports query filters: status, investment_unique_id, start_date, end_date
Route::get('get-weekly-redemption-by-id/{id}', [\App\Http\Controllers\Api\InvestmentRedemptionController::class, 'getRedemptionById']);
Route::post('admin/approve-weekly-redemption/{id}', [\App\Http\Controllers\Api\InvestmentRedemptionController::class, 'approveRedemption']);
Route::post('admin/reject-weekly-redemption/{id}', [\App\Http\Controllers\Api\InvestmentRedemptionController::class, 'rejectRedemption']);

// -------------- Loan Apis --------------------------------- //
// -------------- Inventory Apis ---------------------------- //
Route::prefix('inventory')->group(function () {
    Route::get('units', [UnitController::class, 'index']);
    Route::post('units', [UnitController::class, 'store']);
    Route::get('units/{id}', [UnitController::class, 'show']);
    Route::post('units/{id}', [UnitController::class, 'update']);
    Route::delete('units/{id}', [UnitController::class, 'destroy']);

    Route::get('vendors', [VendorController::class, 'index']);
    Route::post('vendors', [VendorController::class, 'store']);
    Route::get('vendors/{id}', [VendorController::class, 'show']);
    Route::post('vendors/{id}', [VendorController::class, 'update']);
    Route::delete('vendors/{id}', [VendorController::class, 'destroy']);

    Route::get('categories', [CategoryController::class, 'index']);
    Route::post('categories', [CategoryController::class, 'store']);
    Route::get('categories/{id}', [CategoryController::class, 'show']);
    Route::post('categories/{id}', [CategoryController::class, 'update']);
    Route::delete('categories/{id}', [CategoryController::class, 'destroy']);

    Route::get('taxes', [TaxController::class, 'index']);
    Route::post('taxes', [TaxController::class, 'store']);
    Route::get('taxes/{id}', [TaxController::class, 'show']);
    Route::post('taxes/{id}', [TaxController::class, 'update']);
    Route::delete('taxes/{id}', [TaxController::class, 'destroy']);

    Route::get('attributes', [AttributeController::class, 'index']);
    Route::post('attributes', [AttributeController::class, 'store']);
    Route::get('attributes/{id}', [AttributeController::class, 'show']);
    Route::post('attributes/{id}', [AttributeController::class, 'update']);
    Route::delete('attributes/{id}', [AttributeController::class, 'destroy']);

    // Brand Master
    Route::get('brands', [BrandController::class, 'index']);
    Route::post('brands', [BrandController::class, 'store']);
    Route::get('brands/{id}', [BrandController::class, 'show']);
    Route::post('brands/{id}', [BrandController::class, 'update']);
    Route::delete('brands/{id}', [BrandController::class, 'destroy']);

    // Simple Product Master (separate from inventory_products)
    // Loan-ready product details for inventory/loan purchase flows.
    Route::get('product-masters/loan-ready-catalog', [ProductMasterController::class, 'getLoanReadyProductCatalog']);
    Route::get('products/available-for-sale', [ProductMasterController::class, 'getAvailableForSale']);
    Route::get('product-masters/edit-data/{id}', [ProductMasterController::class, 'getEditData']);
    Route::get('product-masters', [ProductMasterController::class, 'index']);
    Route::get('product-masters/stock-summary', [ProductMasterController::class, 'stockSummary']);
    Route::get('product-masters/{id}/purchase-history', [ProductMasterController::class, 'purchaseHistory']);
    Route::post('product-masters', [ProductMasterController::class, 'store']);
    // Prevent reserved endpoint names from being treated as dynamic product IDs.
    Route::get('product-masters/{id}', [ProductMasterController::class, 'show'])
        ->where('id', '^(?!loan-ready-catalog$)(?!stock-summary$).+');
    Route::post('product-masters/{id}', [ProductMasterController::class, 'update'])
        ->where('id', '^(?!loan-ready-catalog$)(?!stock-summary$).+');
    Route::delete('product-masters/{id}', [ProductMasterController::class, 'destroy'])
        ->where('id', '^(?!loan-ready-catalog$)(?!stock-summary$).+');

    // Invoices & Search
    Route::get('products-search', [InvoiceController::class, 'searchProducts']);
    Route::get('inventory-product-cart', [InventoryProductCartController::class, 'index']);
    Route::get('inventory-product-cart/{inquiryId}', [InventoryProductCartController::class, 'show']);
    Route::post('inventory-product-cart/{inquiryId}/verify-fe', [InventoryProductCartController::class, 'verifyByFe']);
    Route::get('invoices', [InvoiceController::class, 'index']);
    Route::get('invoices/{id}', [InvoiceController::class, 'show']);
    Route::post('invoices/{id}/payments', [InvoiceController::class, 'addPayment']);
    Route::post('invoices', [InvoiceController::class, 'store']);
    Route::put('invoices/{id}', [InvoiceController::class, 'update']);
    Route::post('invoices/{id}', [InvoiceController::class, 'update']); // Support parity with form clients
    Route::delete('invoices/{id}', [InvoiceController::class, 'destroy']);

    // Purchases
    Route::get('purchases/master-data/{id?}', [PurchaseMasterDataController::class, 'getMasterData']);
    Route::get('purchases', [PurchaseController::class, 'index']);
    Route::post('purchases', [PurchaseController::class, 'store']);
    Route::get('purchases/{id}', [PurchaseController::class, 'show']);
    Route::put('purchases/{id}', [PurchaseController::class, 'update']);
    Route::post('purchases/{id}', [PurchaseController::class, 'update']); // Support FormData for files
    Route::post('purchases/{id}/payments', [PurchaseController::class, 'addPayment']);
    Route::delete('purchases/{id}', [PurchaseController::class, 'destroy']);
    Route::get('purchases/{id}/invoices', [PurchaseInvoiceController::class, 'byPurchase']);
    Route::post('purchases/{id}/invoices/generate', [PurchaseInvoiceController::class, 'generateByPurchase']);
    Route::get('purchase-invoices/{id}', [PurchaseInvoiceController::class, 'show']);

    // Advance Bookings (no stock deduction)
    Route::get('advance-bookings', [AdvanceBookingController::class, 'index']);
    Route::get('advance-bookings/{id}', [AdvanceBookingController::class, 'show']);
    Route::post('advance-bookings', [AdvanceBookingController::class, 'store']);
    Route::put('advance-bookings/{id}', [AdvanceBookingController::class, 'update']);
    Route::post('advance-bookings/{id}', [AdvanceBookingController::class, 'update']);
    Route::delete('advance-bookings/{id}', [AdvanceBookingController::class, 'destroy']);

    // Reports & Analytics
    Route::get('reports/vendor-purchases', [InventoryReportController::class, 'vendorPurchaseReport']);
    Route::get('reports/sales', [InventoryReportController::class, 'salesReport']);
    Route::get('reports/stock', [InventoryReportController::class, 'inventoryStockReport']);
});
// -------------- Inventory Apis ---------------------------- //
// -------------- Investment Portfolio System ---------------------------- //
Route::prefix('investments')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\InvestmentController::class, 'index']);
    Route::post('/', [\App\Http\Controllers\Api\InvestmentController::class, 'store']);
    Route::get('/{id}', [\App\Http\Controllers\Api\InvestmentController::class, 'show']);
    Route::get('/{id}/summary', [\App\Http\Controllers\Api\InvestmentController::class, 'summary']);
    Route::post('/{id}/redeem', [\App\Http\Controllers\Api\InvestmentController::class, 'processRedemption']);
});
// -------------- Investment Portfolio System ---------------------------- //
// -------------- HRMS Apis ---------------------------- //
Route::prefix('hrms')->group(function () {
    // Dashboard
    Route::get('dashboard', [DashboardController::class, 'index']);

    // Designations
    Route::get('designations', [DesignationController::class, 'index']);
    Route::post('designations', [DesignationController::class, 'store']);
    Route::get('designations/{id}', [DesignationController::class, 'show']);
    Route::post('designations/{id}', [DesignationController::class, 'update']);
    Route::delete('designations/{id}', [DesignationController::class, 'destroy']);

    // Departments (HRMS Specific)
    Route::get('departments', [HrmsDepartmentController::class, 'index']);
    Route::post('departments', [HrmsDepartmentController::class, 'store']);
    Route::get('departments/{id}', [HrmsDepartmentController::class, 'show']);
    Route::post('departments/{id}', [HrmsDepartmentController::class, 'update']);
    Route::delete('departments/{id}', [HrmsDepartmentController::class, 'destroy']);

    // Employees
    Route::get('employees', [EmployeeController::class, 'index']);
    Route::post('employees', [EmployeeController::class, 'store']);
    Route::get('employees/{id}', [EmployeeController::class, 'show']);
    Route::match(['post', 'put', 'patch'], 'employees/{id}', [EmployeeController::class, 'update']);
    Route::delete('employees/{id}', [EmployeeController::class, 'destroy']);

    // Attendance
    Route::get('attendance', [AttendanceController::class, 'index']);
    Route::post('attendance', [AttendanceController::class, 'store']);
    Route::post('attendance/mark-bulk', [AttendanceController::class, 'markBulk']);
    Route::post('attendance/mark-multiple', [AttendanceController::class, 'markMultiple']);
    Route::get('attendance/report', [AttendanceController::class, 'report']);
    Route::get('attendance/{id}', [AttendanceController::class, 'show']);
    Route::post('attendance/{id}', [AttendanceController::class, 'update']);

    // Leaves
    Route::get('leave-types', [LeaveController::class, 'getLeaveTypes']);
    Route::post('leave-types', [LeaveController::class, 'storeLeaveType']);
    Route::post('leave-types/{id}', [LeaveController::class, 'updateLeaveType']);
    Route::delete('leave-types/{id}', [LeaveController::class, 'destroyLeaveType']);

    // Leave Requests
    Route::get('leave-requests', [LeaveRequestController::class, 'index']);
    Route::post('leave-requests', [LeaveRequestController::class, 'store']);
    Route::get('leave-requests/{id}', [LeaveRequestController::class, 'show']);
    Route::post('leave-requests/{id}/approve', [LeaveRequestController::class, 'approve']);
    Route::post('leave-requests/{id}/reject', [LeaveRequestController::class, 'reject']);
    Route::post('leave-requests/{id}/cancel', [LeaveRequestController::class, 'cancel']);

    // Attendance Calendar (GitHub-style)
    Route::get('employees/{employeeId}/attendance-calendar', [LeaveRequestController::class, 'getAttendanceCalendar']);

    // Salary
    Route::get('salary-structures', [SalaryController::class, 'getSalaryStructures']);
    Route::post('salary-structures', [SalaryController::class, 'upsertSalaryStructure']);
    Route::get('salaries', [SalaryController::class, 'index']);
    Route::get('salaries/{id}', [SalaryController::class, 'show']);
    Route::get('payroll/calculate', [SalaryController::class, 'calculatePayroll']);
    Route::post('generate-salary', [SalaryController::class, 'generateSalary']);
    Route::post('salaries/{id}/status', [SalaryController::class, 'updateStatus']);

    // Holidays
    Route::get('holidays', [HolidayController::class, 'index']);
    Route::post('holidays', [HolidayController::class, 'store']);
    Route::post('holidays/{id}', [HolidayController::class, 'update']);
    Route::delete('holidays/{id}', [HolidayController::class, 'destroy']);
});
// -------------- HRMS Apis ---------------------------- //

// -------------- Finance & Accountant Apis -------------- //
Route::middleware('auth:sanctum')->prefix('finance')->group(function () {
    Route::get('dashboard', [FinanceDashboardController::class, 'index']);

    Route::get('transactions', [FinanceTransactionController::class, 'index']);
    Route::post('transactions', [FinanceTransactionController::class, 'store']);
    Route::get('transactions/{id}', [FinanceTransactionController::class, 'show']);
    Route::post('transactions/{id}', [FinanceTransactionController::class, 'update']);
    Route::delete('transactions/{id}', [FinanceTransactionController::class, 'destroy']);
    Route::get('transactions/{id}/download', [FinanceTransactionController::class, 'downloadAttachment']);

    // Cash Book
    Route::get('cash-book/today', [CashBookController::class, 'today']);
    Route::get('cash-book', [CashBookController::class, 'index']);
    Route::post('cash-book', [CashBookController::class, 'store']);
    Route::get('cash-book/{id}', [CashBookController::class, 'show']);
    Route::post('cash-book/{id}', [CashBookController::class, 'update']);
    Route::delete('cash-book/{id}', [CashBookController::class, 'destroy']);
});
// -------------- Finance & Accountant Apis -------------- //

// -------------- Super Admin Dashboard APIs -------------- //
Route::prefix('super-admin')->group(function () {
    Route::get('dashboard/overview', [SuperAdminDashboardController::class, 'overview']);
    Route::get('dashboard/branch-wise', [SuperAdminDashboardController::class, 'branchWiseData']);
    Route::get('dashboard/all-branches', [SuperAdminDashboardController::class, 'allBranchesData']);
    Route::get('dashboard/profit-loss', [SuperAdminDashboardController::class, 'profitLoss']);

    // Debug endpoints
    Route::get('debug/tables', [\App\Http\Controllers\Api\SuperAdmin\DebugController::class, 'checkTables']);
    Route::get('debug/branches', [\App\Http\Controllers\Api\SuperAdmin\DebugController::class, 'checkBranches']);
});
    // -------------- Super Admin Dashboard APIs -------------- //

/*
|--------------------------------------------------------------------------
| Laravel AI APIs
|--------------------------------------------------------------------------
|
| APIs created specifically for AI Tool Calling integration.
| These endpoints will be consumed by the Node.js AI service.
|
*/

Route::middleware('auth:sanctum,employee')->prefix('ai')->group(function () {
    Route::get('dashboard', [AiController::class, 'dashboard']);
    Route::get('branches', [AiController::class, 'branches']);
    Route::get('branch-summary', [AiController::class, 'branchSummary']);

    Route::get('investments', [AiController::class, 'investments']);
    Route::get('investments/{uniqueId}', [AiController::class, 'investmentDetail']);

    Route::get('sales', [AiController::class, 'sales']);
    Route::get('sales/{invoiceNo}', [AiController::class, 'saleDetail'])->where('invoiceNo', '.*');

    Route::get('purchases', [AiController::class, 'purchases']);
    Route::get('purchases/{uniqueId}', [AiController::class, 'purchaseDetail'])->where('uniqueId', '.*');

    Route::get('bookings', [AiController::class, 'bookings']);

    Route::get('customers', [AiController::class, 'customers']);
    Route::get('customers/{customerUniqueId}', [AiController::class, 'customerDetail'])->where('customerUniqueId', '.*');

    Route::get('payments', [AiController::class, 'payments']);

    Route::prefix('loan')->group(function () {
        Route::get('customers', [AiLoanController::class, 'customers']);
        Route::get('customers/{customerId}/history', [AiLoanController::class, 'customerHistory'])->where('customerId', '.*');
        Route::get('customers/{customerId}', [AiLoanController::class, 'customerDetail'])->where('customerId', '.*');

        Route::get('caf', [AiLoanController::class, 'caf']);
        Route::get('caf/{cafId}', [AiLoanController::class, 'cafDetail'])->where('cafId', '.*');

        Route::get('pd', [AiLoanController::class, 'pd']);
        Route::get('pd/{pdId}', [AiLoanController::class, 'pdDetail'])->where('pdId', '.*');

        Route::get('cam', [AiLoanController::class, 'cam']);
        Route::get('cam/{camId}', [AiLoanController::class, 'camDetail'])->where('camId', '.*');

        Route::get('disbursements', [AiLoanController::class, 'disbursements']);
        Route::get('disbursements/{disbursementId}', [AiLoanController::class, 'disbursementDetail'])->where('disbursementId', '.*');

        Route::get('loans', [AiLoanController::class, 'loans']);
        Route::get('loans/{loanId}/emi-schedule', [AiLoanController::class, 'loanEmiSchedule'])->where('loanId', '.*');
        Route::get('loans/{loanId}', [AiLoanController::class, 'loanDetail'])->where('loanId', '.*');

        Route::get('emis', [AiLoanController::class, 'emis']);
        Route::get('emis/{emiId}/payment', [AiLoanController::class, 'emiPayment'])->where('emiId', '.*');
        Route::get('emi-collections', [AiLoanController::class, 'emiCollections']);

        Route::get('agents', [AiLoanController::class, 'agents']);
    });
});
