<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\Loan\CAM;
use App\Models\Loan\CreditApplicationForm;
use App\Models\Loan\CustomerEnrollment;
use App\Models\Loan\Disbursement;
use App\Models\Loan\EmiPayment;
use App\Models\Loan\EmiSchedule;
use App\Models\Loan\Loan;
use App\Models\Loan\LoanAgent;
use App\Models\Loan\LoanCustomer;
use App\Models\Loan\LoanCustomerVerificationHistory;
use App\Models\Loan\PdInformation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CustomerEnrollmentController extends Controller
{
    /**
     * POST /customer-enrollments
     * Creates a new enrollment for an existing customer (re-enrollment flow).
     * Does NOT create a new loan_customers record.
     */
    public function store(Request $request)
    {
        try {

            $validated = $request->validate([
                'customer_unique_id' => 'required|string',
                'enrollment_date'    => 'required|date',
                'branch_id'          => 'nullable|string',
                'cms_admin_id'       => 'nullable|string',
                'enrolled_by'        => 'nullable',
            ]);

            $customer = LoanCustomer::withoutGlobalScope('notDeleted')
                ->where('customer_unique_id', $validated['customer_unique_id'])
                ->firstOrFail();

            if ($customer->is_deleted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot create enrollment for a deleted customer.',
                ], 422);
            }

            $authenticatedUser = $request->user();
            if ($authenticatedUser && strcasecmp($authenticatedUser->role ?? '', 'Field Executive') === 0) {
                $userAgentUniqueId = $authenticatedUser->agent_unique_id ?? null;
                if (!$userAgentUniqueId) {
                    $loanAgent = LoanAgent::where('email', $authenticatedUser->email)->first();
                    $userAgentUniqueId = $loanAgent?->agent_unique_id;
                }

                if (!$userAgentUniqueId || $customer->agent_unique_id !== $userAgentUniqueId) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Field Executive can only generate enrollment for customers created by their own agent.',
                    ], 403);
                }
            }

            $enrollment = CustomerEnrollment::create([
                'customer_unique_id'  => $validated['customer_unique_id'],
                'enrollment_date'     => $validated['enrollment_date'],
                'branch_id'           => $validated['branch_id'] ?? $customer->branch_id,
                'cms_admin_id'        => $validated['cms_admin_id'] ?? $customer->cms_admin_id,
                'enrolled_by'         => $validated['enrolled_by'] ?? null,

                'status'              => 'branch_support_executive',
                'verification_status' => 'pending',

                'status_history' => [
                    [
                        'status' => 'branch_support_executive',
                        'timestamp' => now()->toDateTimeString(),
                        'reason' => 'Existing customer re-enrollment forwarded to BSE',
                        'flow_type' => 're_enrollment',
                        'performed_by' => $authenticatedUser?->user_id ?? $authenticatedUser?->id ?? 'system',
                    ]
                ]
            ]);


            return response()->json([
                'success' => true,
                'message' => 'New enrollment generated successfully and forwarded to BSE',
                'data'    => $enrollment,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $e->errors()
            ], 422);
        } catch (\Exception $e) {

            Log::error('CustomerEnrollment store error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create enrollment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /customer-enrollments/{customer_unique_id}
     * Returns all enrollment history for a customer.
     */
    public function index(string $customerUniqueId)
    {
        try {
            $enrollments = CustomerEnrollment::where('customer_unique_id', $customerUniqueId)
                ->whereHas('customer', fn($q) => $q->where('is_deleted', 0))
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json(['success' => true, 'data' => $enrollments]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /get-pending-enrollments
     * BSE pending list: enrollments with verification_status = pending.
     */
    public function getPendingEnrollments(Request $request)
    {
        try {

            $enrollments = CustomerEnrollment::withoutGlobalScope('notDeleted')
                ->with('customer')
                ->where('is_deleted', 0)
                ->where('status', 'branch_support_executive')
                ->where('verification_status', 'pending')
                ->whereHas('customer', fn($q) => $q->where('is_deleted', 0));

            if ($request->filled('branch_id')) {
                $enrollments->where('branch_id', $request->branch_id);
            }

            if ($request->filled('cms_admin_id')) {
                $enrollments->where('cms_admin_id', $request->cms_admin_id);
            }

            if ($request->filled('agent_unique_id')) {
                $enrollments->whereHas('customer', function ($q) use ($request) {
                    $q->where('agent_unique_id', $request->agent_unique_id);
                });
            }

            if ($request->filled('enrolled_by')) {
                $enrollments->where('enrolled_by', $request->enrolled_by);
            }

            if ($request->filled('search')) {
                $s = $request->search;

                $enrollments->where(function ($q) use ($s) {
                    $q->where('customer_unique_id', 'like', "%{$s}%")
                        ->orWhereHas('customer', function ($customerQuery) use ($s) {
                            $customerQuery->where('first_name', 'like', "%{$s}%")
                                ->orWhere('middle_name', 'like', "%{$s}%")
                                ->orWhere('last_name', 'like', "%{$s}%")
                                ->orWhere('email', 'like', "%{$s}%")
                                ->orWhere('contact_number_1', 'like', "%{$s}%");
                        });
                });
            }

            $perPage = min($request->input('per_page', 10), 10);
            $paginated = $enrollments
                ->orderByDesc('id')
                ->paginate($perPage);

            $data = collect($paginated->items())
                ->map(function ($enrollment) {

                    return [

                        'id' => $enrollment->id,

                        'customer_unique_id' =>
                        $enrollment->customer_unique_id,

                        'enrollment_number' =>
                        $enrollment->enrollment_number,

                        'verification_status' =>
                        $enrollment->verification_status,

                        'status' =>
                        $enrollment->status,

                        'enrollment_date' =>
                        $enrollment->enrollment_date,

                        'created_at' =>
                        $enrollment->created_at,

                        'updated_at' =>
                        $enrollment->updated_at,

                        'source_type' => 'enrollment',

                        'enrollment' => $enrollment,

                        'customer' => [

                            'first_name' =>
                            $enrollment->customer?->first_name,

                            'middle_name' =>
                            $enrollment->customer?->middle_name,

                            'last_name' =>
                            $enrollment->customer?->last_name,

                            'contact_number_1' =>
                            $enrollment->customer?->contact_number_1,

                            'email' =>
                            $enrollment->customer?->email,
                        ]
                    ];
                })
                ->values();

            return response()->json([
                'success' => true,
                'data' => $data,
                'pagination' => [
                    'current_page' => $paginated->currentPage(),
                    'per_page' => $paginated->perPage(),
                    'total' => $paginated->total(),
                    'last_page' => $paginated->lastPage(),
                    'from' => $paginated->firstItem() ?? 0,
                    'to' => $paginated->lastItem() ?? 0,
                ]
            ]);
        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }



    /**
     * GET /get-verified-enrollments-for-caf
     * Returns verified enrollments for CAF customer dropdown.
     * Display: Customer ID | Enrollment Number | Customer Name
     */
    public function getVerifiedEnrollments(Request $request)
    {
        try {

            $enrollments = CustomerEnrollment::withoutGlobalScope('notDeleted')
                ->with('customer')
                ->where('is_deleted', 0)
                ->where('status', 'branch_support_executive')
                ->where('verification_status', 'verified')
                ->whereHas('customer', fn($q) => $q->where('is_deleted', 0));

            if ($request->filled('branch_id')) {
                $enrollments->where('branch_id', $request->branch_id);
            }

            if ($request->filled('cms_admin_id')) {
                $enrollments->where('cms_admin_id', $request->cms_admin_id);
            }

            if ($request->filled('agent_unique_id')) {
                $enrollments->whereHas('customer', function ($q) use ($request) {
                    $q->where('agent_unique_id', $request->agent_unique_id);
                });
            }

            if ($request->filled('enrolled_by')) {
                $enrollments->where('enrolled_by', $request->enrolled_by);
            }

            if ($request->filled('search')) {

                $search = $request->search;

                $enrollments->where(function ($q) use ($search) {

                    $q->where(
                        'customer_unique_id',
                        'like',
                        "%{$search}%"
                    )
                        ->orWhere(
                            'enrollment_number',
                            'like',
                            "%{$search}%"
                        );
                });
            }

            $perPage = min($request->input('per_page', 10), 10);
            $paginated = $enrollments
                ->orderByDesc('id')
                ->paginate($perPage);

            $data = collect($paginated->items())
                ->map(function ($enrollment) {

                    return [

                        'id' => $enrollment->id,

                        'customer_unique_id' =>
                        $enrollment->customer_unique_id,

                        'enrollment_number' =>
                        $enrollment->enrollment_number,

                        'verification_status' =>
                        $enrollment->verification_status,

                        'status' =>
                        $enrollment->status,

                        'enrollment_date' =>
                        $enrollment->enrollment_date,

                        'created_at' =>
                        $enrollment->created_at,

                        'updated_at' =>
                        $enrollment->updated_at,

                        'source_type' => 'enrollment',

                        'enrollment' => $enrollment,

                        'customer' => [

                            'first_name' =>
                            $enrollment->customer?->first_name,

                            'middle_name' =>
                            $enrollment->customer?->middle_name,

                            'last_name' =>
                            $enrollment->customer?->last_name,

                            'contact_number_1' =>
                            $enrollment->customer?->contact_number_1,

                            'email' =>
                            $enrollment->customer?->email,
                        ]
                    ];
                })
                ->values();

            return response()->json([
                'success' => true,
                'data' => $data,
                'pagination' => [
                    'current_page' => $paginated->currentPage(),
                    'per_page' => $paginated->perPage(),
                    'total' => $paginated->total(),
                    'last_page' => $paginated->lastPage(),
                    'from' => $paginated->firstItem() ?? 0,
                    'to' => $paginated->lastItem() ?? 0,
                ]
            ]);
        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /verify-enrollment/{enrollment_number}
     * BSE verifies or rejects an enrollment.
     */
    public function verifyEnrollment(Request $request, string $enrollmentNumber)
    {
        try {

            $validated = $request->validate([
                'verification_status' => 'required|in:verified,rejected,reverted',
                'verification_notes' => 'nullable|string|max:500',
                'occupation_details_applicant' => 'nullable|boolean',
                'occupation_details_nominee' => 'nullable|boolean',
                'house_details' => 'nullable|boolean',
                'assets_details' => 'nullable|boolean',
            ]);

            $enrollment = CustomerEnrollment::where(
                'enrollment_number',
                $enrollmentNumber
            )->whereHas('customer', fn($q) => $q->where('is_deleted', 0))
            ->firstOrFail();

            $user = auth()->user();

            $adminId = $user->user_id ?? $user->id ?? 'system';
            $adminName = $user->name ?? $user->first_name ?? $adminId;

            /*
        |--------------------------------------------------------------------------
        | UPDATE ENROLLMENT STATUS HISTORY
        |--------------------------------------------------------------------------
        */

            $history = is_array($enrollment->status_history)
                ? $enrollment->status_history
                : [];

            $history[] = [
                'status' => $validated['verification_status'],
                'timestamp' => now()->toDateTimeString(),
                'reason' => $validated['verification_notes']
                    ?? ('Enrollment ' . $validated['verification_status']),
                'performed_by' => $adminId,
                'enrollment_number' => $enrollment->enrollment_number,
            ];

            /*
        |--------------------------------------------------------------------------
        | UPDATE ENROLLMENT
        |--------------------------------------------------------------------------
        */

            $status = match ($validated['verification_status']) {
                'verified' => 'branch_support_executive',
                'reverted' => 'field_executive',
                'rejected' => 'field_executive',
                default => $enrollment->status,
            };

            $enrollment->update([
                'verification_status' => $validated['verification_status'],
                'verification_notes' => $validated['verification_notes'] ?? null,
                'verified_by' => $validated['verification_status'] === 'verified'
                    ? $adminId
                    : null,
                'verified_at' => $validated['verification_status'] === 'verified'
                    ? now()
                    : null,
                'reverted_by' => $validated['verification_status'] === 'reverted'
                    ? $adminId
                    : null,
                'reverted_at' => $validated['verification_status'] === 'reverted'
                    ? now()
                    : null,
                'status' => $status,
                'status_history' => $history,
            ]);
            /*
        |--------------------------------------------------------------------------
        | SAVE VERIFICATION HISTORY
        |--------------------------------------------------------------------------
        */

            LoanCustomerVerificationHistory::create([
                'customer_unique_id' => $enrollment->customer_unique_id,
                'enrollment_number' => $enrollment->enrollment_number,

                'status' => $validated['verification_status'],
                'reason' => $validated['verification_notes'] ?? null,

                'occupation_details_applicant' =>
                $validated['occupation_details_applicant'] ?? false,

                'occupation_details_nominee' =>
                $validated['occupation_details_nominee'] ?? false,

                'house_details' =>
                $validated['house_details'] ?? false,

                'assets_details' =>
                $validated['assets_details'] ?? false,

                'admin_id' => $adminId,
                'admin_name' => $adminName,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Enrollment ' . $validated['verification_status'] . ' successfully',
                'data' => $enrollment->fresh(),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {

            return response()->json([
                'success' => false,
                'message' => 'Enrollment not found'
            ], 404);
        } catch (\Exception $e) {

            Log::error('verifyEnrollment error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /revert-enrollment/{enrollment_number}
     */
    public function revertEnrollment(Request $request, string $enrollmentNumber)
    {
        try {

            $validated = $request->validate([
                'reason' => 'required|string|max:1000',
            ]);

            $enrollment = CustomerEnrollment::where(
                'enrollment_number',
                $enrollmentNumber
            )->whereHas('customer', fn($q) => $q->where('is_deleted', 0))
            ->firstOrFail();

            $user = auth()->user();

            $adminId = $user->user_id ?? $user->id ?? 'system';
            $adminName = $user->name ?? $user->first_name ?? $adminId;
            $history = is_array($enrollment->status_history)
                ? $enrollment->status_history
                : [];

            $history[] = [
                'status' => 'field_executive',
                'verification_status' => 'reverted',
                'timestamp' => now()->toDateTimeString(),
                'reason' => $validated['reason'],
                'performed_by' => $adminId,
                'enrollment_number' => $enrollment->enrollment_number,
            ];
            $enrollment->update([
                'status' => 'field_executive',

                'verification_status' => 'reverted',

                'verification_notes' => $validated['reason'],
                'rejection_reason' => $validated['reason'],

                'reverted_by' => $adminId,
                'reverted_at' => now(),

                'status_history' => $history,
            ]);

            LoanCustomerVerificationHistory::create([
                'customer_unique_id' => $enrollment->customer_unique_id,
                'enrollment_number' => $enrollment->enrollment_number,
                'status' => 'reverted',
                'reason' => $validated['reason'],
                'admin_id' => $adminId,
                'admin_name' => $adminName,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Enrollment reverted successfully',
                'data' => $enrollment->fresh(),
            ]);
        } catch (\Exception $e) {

            Log::error('revertEnrollment error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function resubmitEnrollment($enrollmentNumber)
    {
        $enrollment = CustomerEnrollment::where(
            'enrollment_number',
            $enrollmentNumber
        )->whereHas('customer', fn($q) => $q->where('is_deleted', 0))
        ->firstOrFail();

        $enrollment->update([
            'verification_status' => 'pending',
            'verification_notes' => null,
            'rejection_reason' => null,
            'reverted_by' => null,
            'reverted_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Enrollment sent back to BSE successfully'
        ]);
    }


    public function getRevertedEnrollments(Request $request)
    {
        try {

            $enrollments = CustomerEnrollment::withoutGlobalScope('notDeleted')
                ->with('customer')
                ->where('is_deleted', 0)
                ->where('verification_status', 'reverted')
                ->whereHas('customer', fn($q) => $q->where('is_deleted', 0));

            if ($request->filled('branch_id')) {
                $enrollments->where('branch_id', $request->branch_id);
            }

            if ($request->filled('cms_admin_id')) {
                $enrollments->where('cms_admin_id', $request->cms_admin_id);
            }

            if ($request->filled('search')) {

                $search = $request->search;

                $enrollments->where(function ($q) use ($search) {

                    $q->where(
                        'customer_unique_id',
                        'like',
                        "%{$search}%"
                    )
                        ->orWhere(
                            'enrollment_number',
                            'like',
                            "%{$search}%"
                        );
                });
            }

            $data = $enrollments
                ->orderByDesc('id')
                ->get()
                ->map(function ($enrollment) {

                    return [

                        'id' => $enrollment->id,

                        'customer_unique_id' =>
                        $enrollment->customer_unique_id,

                        'enrollment_number' =>
                        $enrollment->enrollment_number,

                        'verification_status' =>
                        $enrollment->verification_status,

                        'status' =>
                        $enrollment->status,

                        'enrollment_date' =>
                        $enrollment->enrollment_date,

                        'created_at' =>
                        $enrollment->created_at,

                        'updated_at' =>
                        $enrollment->updated_at,

                        'source_type' => 'enrollment',

                        'customer' => [

                            'first_name' =>
                            $enrollment->customer?->first_name,

                            'middle_name' =>
                            $enrollment->customer?->middle_name,

                            'last_name' =>
                            $enrollment->customer?->last_name,

                            'contact_number_1' =>
                            $enrollment->customer?->contact_number_1,

                            'email' =>
                            $enrollment->customer?->email,
                        ]
                    ];
                })
                ->values();

            return response()->json([
                'success' => true,
                'data' => $data,
                'pagination' => [
                    'current_page' => 1,
                    'per_page' => $data->count(),
                    'total' => $data->count(),
                    'last_page' => 1,
                    'from' => $data->count() ? 1 : 0,
                    'to' => $data->count(),
                ]
            ]);
        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function deleteEnrollment(string $enrollmentNumber)
    {
        try {
            $enrollment = CustomerEnrollment::withoutGlobalScope('notDeleted')
                ->with('customer')
                ->where('enrollment_number', $enrollmentNumber)
                ->where('is_deleted', 0)
                ->whereHas('customer', fn($q) => $q->where('is_deleted', 0))
                ->firstOrFail();

            $loanApplicationIds = CreditApplicationForm::withoutGlobalScope('notDeleted')
                ->where('enrollment_number', $enrollmentNumber)
                ->where('is_deleted', 0)
                ->pluck('loan_application_id');

            $deleted = [];

            if ($loanApplicationIds->isNotEmpty()) {
                // PD
                $pdCount = PdInformation::withoutGlobalScope('not_deleted')
                    ->whereIn('loan_application_id', $loanApplicationIds)
                    ->where('is_deleted', 0)
                    ->count();
                if ($pdCount > 0) {
                    PdInformation::withoutGlobalScope('not_deleted')
                        ->whereIn('loan_application_id', $loanApplicationIds)
                        ->update(['is_deleted' => 1]);
                    $deleted['pd'] = ['table' => 'loan_pd_information', 'records_deleted' => $pdCount];
                }

                // CAM
                $camCount = CAM::withoutGlobalScope('not_deleted')
                    ->whereIn('loan_application_id', $loanApplicationIds)
                    ->where('is_deleted', 0)
                    ->count();
                if ($camCount > 0) {
                    CAM::withoutGlobalScope('not_deleted')
                        ->whereIn('loan_application_id', $loanApplicationIds)
                        ->update(['is_deleted' => 1]);
                    $deleted['cam'] = ['table' => 'loan_cam', 'records_deleted' => $camCount];
                }

                // Disbursement
                $disbCount = Disbursement::withoutGlobalScope('not_deleted')
                    ->whereIn('loan_application_id', $loanApplicationIds)
                    ->where('is_deleted', 0)
                    ->count();
                if ($disbCount > 0) {
                    Disbursement::withoutGlobalScope('not_deleted')
                        ->whereIn('loan_application_id', $loanApplicationIds)
                        ->update(['is_deleted' => 1]);
                    $deleted['disbursement'] = ['table' => 'loan_disbursements', 'records_deleted' => $disbCount];
                }

                // Loans
                $loanNumbers = Loan::withoutGlobalScope('not_deleted')
                    ->whereIn('loan_application_id', $loanApplicationIds)
                    ->pluck('loan_number');

                if ($loanNumbers->isNotEmpty()) {
                    // EMI Schedules
                    $emiCount = EmiSchedule::withoutGlobalScope('not_deleted')
                        ->whereIn('loan_id', $loanNumbers)
                        ->where('is_deleted', 0)
                        ->count();
                    if ($emiCount > 0) {
                        EmiSchedule::withoutGlobalScope('not_deleted')
                            ->whereIn('loan_id', $loanNumbers)
                            ->update(['is_deleted' => 1]);
                        $deleted['emi_schedules'] = ['table' => 'loan_emi_schedules', 'records_deleted' => $emiCount];
                    }

                    // EMI Payments
                    $emiPaymentCount = EmiPayment::whereIn('loan_id', $loanNumbers)
                        ->where('is_deleted', 0)
                        ->count();
                    if ($emiPaymentCount > 0) {
                        EmiPayment::whereIn('loan_id', $loanNumbers)
                            ->update(['is_deleted' => 1]);
                        $deleted['emi_payments'] = ['table' => 'loan_emi_payments', 'records_deleted' => $emiPaymentCount];
                    }

                    $loanCount = $loanNumbers->count();
                    Loan::withoutGlobalScope('not_deleted')
                        ->whereIn('loan_number', $loanNumbers)
                        ->update(['is_deleted' => 1]);
                    $deleted['loans'] = ['table' => 'loan_loans', 'records_deleted' => $loanCount, 'loan_numbers' => $loanNumbers->values()];
                }

                // CAFs
                CreditApplicationForm::withoutGlobalScope('notDeleted')
                    ->whereIn('loan_application_id', $loanApplicationIds)
                    ->update(['is_deleted' => 1]);
                $deleted['caf'] = ['table' => 'loan_credit_application_forms', 'records_deleted' => $loanApplicationIds->count()];
            }

            LoanCustomerVerificationHistory::where('enrollment_number', $enrollmentNumber)
                ->delete();

            $enrollment->softDelete();
            $deleted['enrollment'] = ['table' => 'customer_enrollments', 'records_deleted' => 1, 'enrollment_number' => $enrollmentNumber];

            return response()->json([
                'success' => true,
                'message' => 'Enrollment and all related records soft deleted successfully',
                'enrollment_number' => $enrollmentNumber,
                'deleted_summary' => $deleted,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Enrollment not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error deleting enrollment: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'message' => 'Failed to delete enrollment: ' . $e->getMessage()], 500);
        }
    }
}
