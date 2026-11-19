<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Loan\CAMController;
use App\Http\Controllers\Api\Loan\CreditApplicationFormController;
use App\Http\Controllers\Api\Loan\EmiController;
use App\Http\Controllers\Api\Loan\LoanCustomerController;
use App\Http\Controllers\Api\Loan\LoanDisbursementController;
use App\Http\Controllers\Api\Loan\LoanAgentController;
use App\Http\Controllers\Api\Loan\ReportController;
use App\Http\Controllers\Controller;
use App\Http\Helpers\AuthContext;
use App\Models\Loan\CAM;
use App\Models\Loan\EmiPayment;
use App\Models\Loan\EmiSchedule;
use App\Models\Loan\Loan;
use App\Models\Loan\LoanAgent;
use App\Models\Loan\LoanCustomer;
use App\Models\Loan\LoanDisbursement;
use App\Models\Loan\PdInformation;
use App\Models\Loan\CreditApplicationForm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AiLoanController extends Controller
{
    private function filters(Request $request): array
    {
        $validator = Validator::make($request->query(), [
            'user_id' => 'nullable|string|max:100',
            'branch_id' => 'nullable|string|max:100',
            'cms_admin_id' => 'nullable|string|max:100',
            'search' => 'nullable|string|max:255',
            'verification_status' => 'nullable|string|max:100',
            'status' => 'nullable|string|max:100',
            'frequency' => 'nullable|in:weekly,biweekly,monthly',
            'due_start_date' => 'nullable|date_format:Y-m-d',
            'due_end_date' => 'nullable|date_format:Y-m-d|after_or_equal:due_start_date',
            'installment_no' => 'nullable|integer|min:1',
            'customer_unique_id' => 'nullable|string|max:100',
            'agent_unique_id' => 'nullable|string|max:100',
            'from_date' => 'nullable|date_format:Y-m-d',
            'to_date' => 'nullable|date_format:Y-m-d|after_or_equal:from_date',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        if ($validator->fails()) {
            abort(response()->json([
                'success' => false,
                'message' => 'Invalid request parameters',
                'errors' => $validator->errors(),
            ], 422));
        }

        $user = $request->user();
        $requestedBranch = $request->query('branch_id');
        $requestedCms = $request->query('cms_admin_id');
        $requestedUser = $request->query('user_id');

        if (!AuthContext::isSuperAdmin()) {
            $ownBranch = $user?->branch ?? $user?->branch_id ?? null;
            if ($requestedBranch && $ownBranch && (string) $requestedBranch !== (string) $ownBranch) {
                abort(response()->json(['success' => false, 'message' => 'You are not authorized to access this branch'], 403));
            }

            $effectiveCms = AuthContext::cmsAdminId();
            if ($requestedCms && $effectiveCms && (string) $requestedCms !== (string) $effectiveCms) {
                abort(response()->json(['success' => false, 'message' => 'You are not authorized to access this CMS administrator data'], 403));
            }
            if ($requestedUser && $user?->user_id && (string) $requestedUser !== (string) $user->user_id) {
                abort(response()->json(['success' => false, 'message' => 'You are not authorized to access this employee data'], 403));
            }

            $branch = $requestedBranch ?: $ownBranch;
            $cms = $requestedCms ?: $effectiveCms;
        } else {
            $branch = $requestedBranch ?: null;
            $cms = $requestedCms ?: null;
        }

        $filters = $request->query();
        $filters['branch_id'] = $branch;
        $filters['cms_admin_id'] = $cms;
        $filters['page'] = (int) $request->query('page', 1);
        $filters['per_page'] = (int) $request->query('per_page', 25);
        foreach (['user_id', 'search', 'verification_status', 'status', 'frequency', 'due_start_date', 'due_end_date', 'installment_no', 'customer_unique_id', 'agent_unique_id', 'from_date', 'to_date'] as $key) {
            if (!array_key_exists($key, $filters)) {
                $filters[$key] = null;
            }
        }
        return $filters;
    }

    private function report(Request $request, string $reportType, string $method, array $allowedExtra = []): JsonResponse
    {
        $filters = $this->filters($request);
        $params = array_filter($filters, fn ($value) => $value !== null && $value !== '');

        $reportRequest = Request::create('/api/report/' . $reportType, 'GET', $params);
        $reportRequest->setUserResolver(fn () => $request->user());
        $payload = (new ReportController())->{$method}($reportRequest)->getData(true);

        if (!($payload['success'] ?? false)) {
            return response()->json([
                'success' => false,
                'message' => $payload['message'] ?? 'Loan report retrieval failed',
                'report_type' => $reportType,
            ], 500);
        }

        $data = $payload['data'] ?? [];
        if (is_array($data) && array_key_exists('data', $data)) {
            $records = $data['data'];
            $pagination = [
                'current_page' => $data['current_page'] ?? 1,
                'per_page' => $data['per_page'] ?? $filters['per_page'],
                'total' => $data['total'] ?? count($records),
                'last_page' => $data['last_page'] ?? null,
            ];
        } else {
            $records = $payload['data'] ?? [];
            $pagination = $payload['pagination'] ?? [
                'current_page' => $filters['page'],
                'per_page' => $filters['per_page'],
                'total' => count($records),
            ];
        }

        return response()->json([
            'success' => true,
            'message' => ucfirst($reportType) . ' report retrieved successfully',
            'report_type' => $reportType,
            'filters' => $filters,
            'summary' => $payload['summary'] ?? [],
            'records' => $records,
            'pagination' => $pagination,
        ]);
    }

    public function customers(Request $request): JsonResponse
    {
        return $this->report($request, 'customers', 'customerReport');
    }

    public function caf(Request $request): JsonResponse
    {
        return $this->report($request, 'caf', 'cafReport');
    }

    public function pd(Request $request): JsonResponse
    {
        return $this->report($request, 'pd', 'pdReport');
    }

    public function cam(Request $request): JsonResponse
    {
        return $this->report($request, 'cam', 'camReport');
    }

    public function disbursements(Request $request): JsonResponse
    {
        return $this->report($request, 'disbursements', 'disbursementReport');
    }

    public function emis(Request $request): JsonResponse
    {
        return $this->report($request, 'emis', 'emiReport');
    }

    public function emiCollections(Request $request): JsonResponse
    {
        return $this->report($request, 'emi_collections', 'emiCollectionReport');
    }

    public function loans(Request $request): JsonResponse
    {
        return $this->report($request, 'loans', 'loanReport');
    }

    private function ensureAccessibleBranch(?string $branchId): bool
    {
        if (AuthContext::isSuperAdmin() || !$branchId) {
            return true;
        }
        return $branchId === AuthContext::branchId();
    }

    private function notFound(string $message): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message], 404);
    }

    public function customerDetail(Request $request, string $customerId): JsonResponse
    {
        $customer = LoanCustomer::withoutGlobalScope('notDeleted')
            ->where('customer_unique_id', $customerId)
            ->first();
        if (!$customer || $customer->is_deleted) {
            return $this->notFound('Customer not found');
        }
        if (!$this->ensureAccessibleBranch($customer->branch_id)) {
            return response()->json(['success' => false, 'message' => 'You are not authorized to access this customer'], 403);
        }

        return response()->json([
            'success' => true,
            'message' => 'Customer details retrieved successfully',
            'report_type' => 'customer_detail',
            'record' => [
                'customer_unique_id' => $customer->customer_unique_id,
                'name' => trim($customer->first_name . ' ' . $customer->middle_name . ' ' . $customer->last_name),
                'contact_number' => $customer->contact_number_1,
                'email' => $customer->email,
                'branch_id' => $customer->branch_id,
                'status' => $customer->status,
                'verification_status' => $customer->verification_status,
                'agent_unique_id' => $customer->agent_unique_id,
            ],
        ]);
    }

    public function customerHistory(Request $request, string $customerId): JsonResponse
    {
        $customer = LoanCustomer::withoutGlobalScope('notDeleted')->where('customer_unique_id', $customerId)->first();
        if (!$customer || $customer->is_deleted) {
            return $this->notFound('Customer not found');
        }
        if (!$this->ensureAccessibleBranch($customer->branch_id)) {
            return response()->json(['success' => false, 'message' => 'You are not authorized to access this customer'], 403);
        }

        $cafs = CreditApplicationForm::where('customer_unique_id', $customerId)->orderBy('created_at')->get([
            'loan_application_id', 'customer_unique_id', 'branch_id', 'status', 'credit_mode', 'credit_applied_for',
            'is_verified', 'is_pd_created', 'is_cam_created', 'is_disbursement_created', 'created_at',
        ]);
        $cafIds = $cafs->pluck('loan_application_id');
        $loans = Loan::whereIn('loan_application_id', $cafIds)->orderBy('created_at')->get([
            'loan_number', 'loan_application_id', 'customer_unique_id', 'branch_id', 'loan_amount', 'disbursement_amount',
            'emi_amount', 'interest_rate', 'tenure_months', 'frequency', 'loan_start_date', 'installment_start_date', 'created_at',
        ]);

        $summary = [
            'total_cafs' => $cafs->count(),
            'total_loans' => $loans->count(),
            'total_loan_amount' => (float) $loans->sum('loan_amount'),
            'total_disbursement_amount' => (float) $loans->sum('disbursement_amount'),
        ];

        return response()->json([
            'success' => true,
            'message' => 'Customer history retrieved successfully',
            'report_type' => 'customer_history',
            'summary' => $summary,
            'records' => [
                'customer' => [
                    'customer_unique_id' => $customer->customer_unique_id,
                    'name' => trim($customer->first_name . ' ' . $customer->middle_name . ' ' . $customer->last_name),
                    'branch_id' => $customer->branch_id,
                ],
                'cafs' => $cafs,
                'loans' => $loans,
            ],
        ]);
    }

    public function cafDetail(Request $request, string $cafId): JsonResponse
    {
        $caf = CreditApplicationForm::where('loan_application_id', $cafId)->first();
        if (!$caf) {
            return $this->notFound('CAF not found');
        }
        if (!$this->ensureAccessibleBranch($caf->branch_id)) {
            return response()->json(['success' => false, 'message' => 'You are not authorized to access this CAF'], 403);
        }
        $caf->loadMissing(['customer:customer_unique_id,first_name,middle_name,last_name,contact_number_1']);
        return response()->json(['success' => true, 'message' => 'CAF details retrieved successfully', 'report_type' => 'caf_detail', 'record' => $caf]);
    }

    public function pdDetail(Request $request, string $pdId): JsonResponse
    {
        $pd = PdInformation::where('is_deleted', 0)->where('pd_application_id', $pdId)->first();
        if (!$pd) {
            return $this->notFound('PD not found');
        }
        if (!$this->ensureAccessibleBranch($pd->branch_id)) {
            return response()->json(['success' => false, 'message' => 'You are not authorized to access this PD'], 403);
        }
        $pd->loadMissing(['customer:customer_unique_id,first_name,middle_name,last_name,contact_number_1']);
        return response()->json(['success' => true, 'message' => 'PD details retrieved successfully', 'report_type' => 'pd_detail', 'record' => $pd]);
    }

    public function camDetail(Request $request, string $camId): JsonResponse
    {
        $cam = CAM::where('is_deleted', 0)->where(function ($query) use ($camId) {
            $query->where('cam_unique_id', $camId)->orWhere('id', $camId);
        })->first();
        if (!$cam) {
            return $this->notFound('CAM not found');
        }
        if (!$this->ensureAccessibleBranch($cam->branch_id)) {
            return response()->json(['success' => false, 'message' => 'You are not authorized to access this CAM'], 403);
        }
        $cam->loadMissing(['customer:customer_unique_id,first_name,middle_name,last_name,contact_number_1']);
        return response()->json(['success' => true, 'message' => 'CAM details retrieved successfully', 'report_type' => 'cam_detail', 'record' => $cam]);
    }

    public function disbursementDetail(Request $request, string $disbursementId): JsonResponse
    {
        $disbursement = LoanDisbursement::where('is_deleted', 0)
            ->where(function ($query) use ($disbursementId) {
                $query->where('disbursement_id', $disbursementId)->orWhere('id', $disbursementId);
            })->first();
        if (!$disbursement) {
            return $this->notFound('Disbursement not found');
        }
        if (!$this->ensureAccessibleBranch($disbursement->branch_id)) {
            return response()->json(['success' => false, 'message' => 'You are not authorized to access this disbursement'], 403);
        }
        $disbursement->loadMissing(['customer:customer_unique_id,first_name,middle_name,last_name,contact_number_1']);
        return response()->json(['success' => true, 'message' => 'Disbursement details retrieved successfully', 'report_type' => 'disbursement_detail', 'record' => $disbursement]);
    }

    public function loanDetail(Request $request, string $loanId): JsonResponse
    {
        $loan = Loan::where(function ($query) use ($loanId) {
            $query->where('loan_number', $loanId)->orWhere('id', $loanId);
        })->first();
        if (!$loan) {
            return $this->notFound('Loan not found');
        }
        if (!$this->ensureAccessibleBranch($loan->branch_id)) {
            return response()->json(['success' => false, 'message' => 'You are not authorized to access this loan'], 403);
        }
        $loan->loadMissing(['customer:customer_unique_id,first_name,middle_name,last_name,contact_number_1']);
        return response()->json(['success' => true, 'message' => 'Loan details retrieved successfully', 'report_type' => 'loan_detail', 'record' => $loan]);
    }

    public function loanEmiSchedule(Request $request, string $loanId): JsonResponse
    {
        $loan = Loan::where(function ($query) use ($loanId) {
            $query->where('loan_number', $loanId)->orWhere('id', $loanId);
        })->first();
        if (!$loan) {
            return $this->notFound('Loan not found');
        }
        if (!$this->ensureAccessibleBranch($loan->branch_id)) {
            return response()->json(['success' => false, 'message' => 'You are not authorized to access this loan'], 403);
        }
        $schedule = EmiSchedule::where('loan_id', $loan->loan_number)->orderBy('installment_no')->get([
            'emi_id', 'loan_id', 'installment_no', 'installment_date', 'frequency',
            'installment_amount', 'principal_due', 'interest_due', 'outstanding_balance', 'status', 'paid_amount', 'paid_date',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Loan EMI schedule retrieved successfully',
            'report_type' => 'loan_emi_schedule',
            'summary' => [
                'total_installments' => $schedule->count(),
                'paid_installments' => $schedule->where('status', 'paid')->count(),
                'pending_installments' => $schedule->where('status', 'pending')->count(),
                'overdue_installments' => $schedule->where('status', 'overdue')->count(),
                'total_scheduled_amount' => (float) $schedule->sum('installment_amount'),
            ],
            'records' => $schedule,
        ]);
    }

    public function emiPayment(Request $request, string $emiId): JsonResponse
    {
        $payment = EmiPayment::where('emi_schedule_id', $emiId)->where('is_deleted', 0)->first();
        if (!$payment) {
            return $this->notFound('No payment found for this EMI schedule');
        }
        if (!$this->ensureAccessibleBranch($payment->branch_id)) {
            return response()->json(['success' => false, 'message' => 'You are not authorized to access this payment'], 403);
        }
        return response()->json([
            'success' => true,
            'message' => 'EMI payment retrieved successfully',
            'report_type' => 'emi_payment',
            'record' => [
                'id' => $payment->id,
                'emi_schedule_id' => $payment->emi_schedule_id,
                'loan_id' => $payment->loan_id,
                'payment_amount' => $payment->payment_amount,
                'payment_date' => $payment->payment_date,
                'payment_method' => $payment->payment_method,
                'transaction_id' => $payment->transaction_id,
                'payment_status' => $payment->payment_status,
                'approval_status' => $payment->approval_status,
                'receipt_number' => $payment->receipt_number,
                'branch_id' => $payment->branch_id,
            ],
        ]);
    }

    public function agents(Request $request): JsonResponse
    {
        $filters = $this->filters($request);
        $query = LoanAgent::query()->where('is_deleted', 0);
        if ($filters['branch_id']) {
            $query->where('branch_id', $filters['branch_id']);
        }
        if ($filters['cms_admin_id']) {
            $query->where('cms_admin_id', $filters['cms_admin_id']);
        }
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('agent_unique_id', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('phone_no', 'like', "%{$search}%");
            });
        }
        $agents = $query->orderByDesc('created_at')->paginate($filters['per_page'], [
            'agent_unique_id', 'name', 'email', 'phone_no', 'location', 'status', 'branch_id', 'cms_admin_id',
        ], 'page', $filters['page']);

        return response()->json([
            'success' => true,
            'message' => 'Loan agents retrieved successfully',
            'report_type' => 'agents',
            'filters' => $filters,
            'summary' => [
                'total' => $agents->total(),
                'active' => (clone $query)->where('status', 'active')->count(),
            ],
            'records' => $agents->items(),
            'pagination' => [
                'current_page' => $agents->currentPage(),
                'per_page' => $agents->perPage(),
                'total' => $agents->total(),
                'last_page' => $agents->lastPage(),
            ],
        ]);
    }
}
