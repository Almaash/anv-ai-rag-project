<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\Loan\LoanCustomer;
use App\Models\Loan\CreditApplicationForm;
use App\Models\Loan\PdInformation;
use App\Models\Loan\CAM;
use App\Models\Loan\LoanDisbursement;
use App\Models\Loan\EmiSchedule;
use App\Models\Loan\Loan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ReportController extends Controller
{
    private function applyCommonFilters($query, Request $request, string $table = '')
    {
        $t = $table ? "{$table}." : '';
        if ($request->filled('branch_id'))      $query->where("{$t}branch_id",      $request->branch_id);
        if ($request->filled('cms_admin_id'))   $query->where("{$t}cms_admin_id",   $request->cms_admin_id);
        if ($request->filled('from_date'))      $query->whereDate("{$t}created_at", '>=', $request->from_date);
        if ($request->filled('to_date'))        $query->whereDate("{$t}created_at", '<=', $request->to_date);
        return $query;
    }

    private function bool($val): bool
    {
        return filter_var($val, FILTER_VALIDATE_BOOLEAN);
    }

    private function perPage(Request $request, int $default = 15): int
    {
        return min(max((int) $request->get('per_page', $default), 1), 100);
    }

    // ─── 1. Customer Report ───────────────────────────────────────────────────
    // Filters: search, branch_id, cms_admin_id, agent_unique_id,
    //          status, verification_status, gender, occupation,
    //          from_date, to_date, per_page

    public function customerReport(Request $request)
    {
        try {
            $query = LoanCustomer::select([
                'customer_unique_id', 'enrollment_number', 'first_name', 'last_name',
                'contact_number_1', 'branch_id', 'agent_unique_id', 'cms_admin_id',
                'gender', 'occupation', 'verification_status', 'status', 'created_at',
            ]);

            $this->applyCommonFilters($query, $request);

            if ($request->filled('agent_unique_id'))  $query->where('agent_unique_id',  $request->agent_unique_id);
            if ($request->filled('status'))            $query->where('status',            $request->status);
            if ($request->filled('verification_status')) $query->where('verification_status', $request->verification_status);
            if ($request->filled('gender'))            $query->where('gender',            $request->gender);
            if ($request->filled('occupation'))        $query->where('occupation',        $request->occupation);

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(function ($q) use ($s) {
                    $q->where('customer_unique_id', 'like', "%{$s}%")
                      ->orWhere('first_name',        'like', "%{$s}%")
                      ->orWhere('last_name',          'like', "%{$s}%")
                      ->orWhere('contact_number_1',   'like', "%{$s}%")
                      ->orWhere('adhaar_number',      'like', "%{$s}%")
                      ->orWhere('pan_number',         'like', "%{$s}%");
                });
            }

            $base     = clone $query;
            $total    = (clone $base)->count();
            $verified = (clone $base)->where('verification_status', 'verified')->count();
            $pending  = (clone $base)->where('verification_status', 'pending')->count();
            $rejected = (clone $base)->where('verification_status', 'rejected')->count();

            $data = $query->orderBy('created_at', 'desc')->paginate($this->perPage($request));

            return response()->json([
                'success' => true,
                'summary' => compact('total', 'verified', 'pending', 'rejected'),
                'data'    => $data,
            ]);
        } catch (\Exception $e) {
            Log::error('Customer Report: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ─── 2. CAF Report ────────────────────────────────────────────────────────
    // Filters: search, branch_id, cms_admin_id, agent_unique_id,
    //          credit_mode, status, is_verified, is_pd_created,
    //          is_cam_created, is_disbursement_created,
    //          min_amount, max_amount, frequency, tenure_option,
    //          from_date, to_date, per_page

    public function cafReport(Request $request)
    {
        try {
            $query = CreditApplicationForm::select([
                'loan_application_id', 'customer_unique_id', 'branch_id', 'agent_unique_id', 'cms_admin_id',
                'credit_mode', 'credit_applied_for', 'down_payment', 'discount',
                'frequency', 'tenure_option',
                'status', 'is_verified', 'is_pd_created', 'is_cam_created', 'is_disbursement_created',
                'created_at',
            ])->with(['customer:customer_unique_id,first_name,last_name,contact_number_1']);

            $this->applyCommonFilters($query, $request);

            if ($request->filled('agent_unique_id')) $query->where('agent_unique_id', $request->agent_unique_id);
            if ($request->filled('credit_mode'))     $query->where('credit_mode',     $request->credit_mode);
            if ($request->filled('status'))          $query->where('status',          $request->status);
            if ($request->filled('frequency'))       $query->where('frequency',       $request->frequency);
            if ($request->filled('tenure_option'))   $query->where('tenure_option',   $request->tenure_option);
            if ($request->filled('min_amount'))      $query->where('credit_applied_for', '>=', $request->min_amount);
            if ($request->filled('max_amount'))      $query->where('credit_applied_for', '<=', $request->max_amount);

            foreach (['is_verified', 'is_pd_created', 'is_cam_created', 'is_disbursement_created'] as $flag) {
                if ($request->filled($flag)) $query->where($flag, $this->bool($request->$flag));
            }

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(function ($q) use ($s) {
                    $q->where('loan_application_id', 'like', "%{$s}%")
                      ->orWhere('customer_unique_id', 'like', "%{$s}%")
                      ->orWhereHas('customer', fn($cq) => $cq
                          ->where('first_name',        'like', "%{$s}%")
                          ->orWhere('last_name',        'like', "%{$s}%")
                          ->orWhere('contact_number_1', 'like', "%{$s}%"));
                });
            }

            $base        = clone $query;
            $total       = (clone $base)->count();
            $verified    = (clone $base)->where('is_verified', true)->count();
            $pdCreated   = (clone $base)->where('is_pd_created', true)->count();
            $camCreated  = (clone $base)->where('is_cam_created', true)->count();
            $disbCreated = (clone $base)->where('is_disbursement_created', true)->count();

            $data = $query->orderBy('created_at', 'desc')->paginate($this->perPage($request));

            return response()->json([
                'success' => true,
                'summary' => compact('total', 'verified', 'pdCreated', 'camCreated', 'disbCreated'),
                'data'    => $data,
            ]);
        } catch (\Exception $e) {
            Log::error('CAF Report: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ─── 3. PD Report ─────────────────────────────────────────────────────────
    // Filters: search, branch_id, cms_admin_id,
    //          verification_status, status,
    //          is_verified, is_cam_created, is_disbursement_created,
    //          loan_application_id, customer_unique_id,
    //          from_date, to_date, per_page

    public function pdReport(Request $request)
    {
        try {
            $query = PdInformation::select([
                'pd_application_id', 'loan_application_id', 'customer_unique_id',
                'branch_id', 'cms_admin_id',
                'verification_status', 'status',
                'is_verified', 'is_cam_created', 'is_disbursement_created',
                'created_at',
            ])->with(['customer:customer_unique_id,first_name,last_name,contact_number_1'])
              ->where('is_deleted', 0);

            $this->applyCommonFilters($query, $request);

            if ($request->filled('verification_status'))  $query->where('verification_status',  $request->verification_status);
            if ($request->filled('status'))               $query->where('status',               $request->status);
            if ($request->filled('loan_application_id'))  $query->where('loan_application_id',  $request->loan_application_id);
            if ($request->filled('customer_unique_id'))   $query->where('customer_unique_id',   $request->customer_unique_id);

            foreach (['is_verified', 'is_cam_created', 'is_disbursement_created'] as $flag) {
                if ($request->filled($flag)) $query->where($flag, $this->bool($request->$flag));
            }

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(function ($q) use ($s) {
                    $q->where('pd_application_id',    'like', "%{$s}%")
                      ->orWhere('loan_application_id', 'like', "%{$s}%")
                      ->orWhere('customer_unique_id',  'like', "%{$s}%")
                      ->orWhereHas('customer', fn($cq) => $cq
                          ->where('first_name', 'like', "%{$s}%")
                          ->orWhere('last_name', 'like', "%{$s}%"));
                });
            }

            $base     = clone $query;
            $total    = (clone $base)->count();
            $verified = (clone $base)->where('verification_status', 'verified')->count();
            $rejected = (clone $base)->where('verification_status', 'rejected')->count();
            $pending  = $total - $verified - $rejected;

            $data = $query->orderBy('created_at', 'desc')->paginate($this->perPage($request));

            return response()->json([
                'success' => true,
                'summary' => compact('total', 'verified', 'rejected', 'pending'),
                'data'    => $data,
            ]);
        } catch (\Exception $e) {
            Log::error('PD Report: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ─── 4. CAM Report ────────────────────────────────────────────────────────
    // Filters: search, branch_id, cms_admin_id,
    //          status, credit_decision,
    //          is_verified, is_disbursement_created,
    //          loan_application_id, customer_unique_id,
    //          from_date, to_date, per_page

    public function camReport(Request $request)
    {
        try {
            $query = CAM::select([
                'cam_unique_id', 'loan_application_id', 'customer_unique_id',
                'branch_id', 'cms_admin_id',
                'status', 'credit_decision',
                'is_verified', 'is_disbursement_created',
                'created_at',
            ])->with(['customer:customer_unique_id,first_name,last_name,contact_number_1'])
              ->where('is_deleted', 0);

            $this->applyCommonFilters($query, $request);

            if ($request->filled('status'))              $query->where('status',              $request->status);
            if ($request->filled('credit_decision'))     $query->where('credit_decision',     $request->credit_decision);
            if ($request->filled('loan_application_id')) $query->where('loan_application_id', $request->loan_application_id);
            if ($request->filled('customer_unique_id'))  $query->where('customer_unique_id',  $request->customer_unique_id);

            foreach (['is_verified', 'is_disbursement_created'] as $flag) {
                if ($request->filled($flag)) $query->where($flag, $this->bool($request->$flag));
            }

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(function ($q) use ($s) {
                    $q->where('cam_unique_id',        'like', "%{$s}%")
                      ->orWhere('loan_application_id', 'like', "%{$s}%")
                      ->orWhere('customer_unique_id',  'like', "%{$s}%")
                      ->orWhereHas('customer', fn($cq) => $cq
                          ->where('first_name', 'like', "%{$s}%")
                          ->orWhere('last_name', 'like', "%{$s}%"));
                });
            }

            $base        = clone $query;
            $total       = (clone $base)->count();
            $approved    = (clone $base)->where('credit_decision', 'approved')->count();
            $rejected    = (clone $base)->where('credit_decision', 'rejected')->count();
            $pending     = (clone $base)->whereNull('credit_decision')->count();
            $disbCreated = (clone $base)->where('is_disbursement_created', true)->count();

            $data = $query->orderBy('created_at', 'desc')->paginate($this->perPage($request));

            return response()->json([
                'success' => true,
                'summary' => compact('total', 'approved', 'rejected', 'pending', 'disbCreated'),
                'data'    => $data,
            ]);
        } catch (\Exception $e) {
            Log::error('CAM Report: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ─── 5. Disbursement Report ───────────────────────────────────────────────
    // Filters: search, branch_id, cms_admin_id,
    //          disbursement_status, payment_status,
    //          is_disbursed, is_loan_started,
    //          loan_application_id, customer_unique_id,
    //          from_date, to_date, per_page

    public function disbursementReport(Request $request)
    {
        try {
            $query = LoanDisbursement::select([
                'disbursement_id', 'loan_application_id', 'customer_unique_id',
                'branch_id', 'cms_admin_id',
                'disbursement_status', 'payment_status',
                'date_of_disbursement', 'booking_date',
                'is_disbursed', 'is_loan_started',
                'created_at',
            ])->with(['customer:customer_unique_id,first_name,last_name,contact_number_1'])
              ->where('is_deleted', 0);

            $this->applyCommonFilters($query, $request);

            if ($request->filled('disbursement_status'))  $query->where('disbursement_status',  $request->disbursement_status);
            if ($request->filled('payment_status'))       $query->where('payment_status',       $request->payment_status);
            if ($request->filled('loan_application_id'))  $query->where('loan_application_id',  $request->loan_application_id);
            if ($request->filled('customer_unique_id'))   $query->where('customer_unique_id',   $request->customer_unique_id);

            foreach (['is_disbursed', 'is_loan_started'] as $flag) {
                if ($request->filled($flag)) $query->where($flag, $this->bool($request->$flag));
            }

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(function ($q) use ($s) {
                    $q->where('disbursement_id',      'like', "%{$s}%")
                      ->orWhere('loan_application_id', 'like', "%{$s}%")
                      ->orWhere('customer_unique_id',  'like', "%{$s}%")
                      ->orWhereHas('customer', fn($cq) => $cq
                          ->where('first_name', 'like', "%{$s}%")
                          ->orWhere('last_name', 'like', "%{$s}%"));
                });
            }

            $base        = clone $query;
            $total       = (clone $base)->count();
            $disbursed   = (clone $base)->where('disbursement_status', 'Disbursed')->count();
            $pending     = (clone $base)->where('disbursement_status', 'pending')->count();
            $loanStarted = (clone $base)->where('is_loan_started', true)->count();

            $data = $query->orderBy('created_at', 'desc')->paginate($this->perPage($request));

            return response()->json([
                'success' => true,
                'summary' => compact('total', 'disbursed', 'pending', 'loanStarted'),
                'data'    => $data,
            ]);
        } catch (\Exception $e) {
            Log::error('Disbursement Report: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ─── 6. EMI Schedule Report ─────────────────────────────────────────────
    // Filters: search, branch_id, cms_admin_id, agent_unique_id,
    //          loan_id, customer_unique_id, status, frequency,
    //          installment_no, from_date, to_date,
    //          due_start_date, due_end_date, per_page

    public function emiReport(Request $request)
    {
        try {
            $query = EmiSchedule::select([
                'emi_id', 'loan_id', 'branch_id', 'cms_admin_id',
                'installment_no', 'installment_date', 'frequency',
                'installment_amount', 'principal_due', 'interest_due',
                'outstanding_balance', 'status',
                'created_at',
            ])->with([
                'loan:loan_number,loan_application_id,customer_unique_id,agent_unique_id,loan_amount,frequency,loan_start_date',
                'loan.customer:customer_unique_id,first_name,last_name,contact_number_1',
                'loan.agent:agent_unique_id,name,phone_no',
            ]);

            $this->applyCommonFilters($query, $request);

            if ($request->filled('loan_id'))        $query->where('loan_id',       $request->loan_id);
            if ($request->filled('status'))         $query->where('status',        $request->status);
            if ($request->filled('frequency'))      $query->where('frequency',     $request->frequency);
            if ($request->filled('installment_no')) $query->where('installment_no',$request->installment_no);

            // Due date range filters
            if ($request->filled('due_start_date')) $query->whereDate('installment_date', '>=', $request->due_start_date);
            if ($request->filled('due_end_date'))   $query->whereDate('installment_date', '<=', $request->due_end_date);

            // Filter by customer or agent via loan relationship
            if ($request->filled('customer_unique_id')) {
                $query->whereHas('loan', fn($q) => $q->where('customer_unique_id', $request->customer_unique_id));
            }
            if ($request->filled('agent_unique_id')) {
                $query->whereHas('loan', fn($q) => $q->where('agent_unique_id', $request->agent_unique_id));
            }

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(function ($q) use ($s) {
                    $q->where('emi_id',  'like', "%{$s}%")
                      ->orWhere('loan_id', 'like', "%{$s}%")
                      ->orWhereHas('loan', function ($lq) use ($s) {
                          $lq->where('loan_application_id', 'like', "%{$s}%")
                             ->orWhere('customer_unique_id', 'like', "%{$s}%")
                             ->orWhere('agent_unique_id',    'like', "%{$s}%")
                             ->orWhereHas('customer', fn($cq) => $cq
                                 ->where('first_name', 'like', "%{$s}%")
                                 ->orWhere('last_name', 'like', "%{$s}%")
                                 ->orWhere('contact_number_1', 'like', "%{$s}%"));
                      });
                });
            }

            $base        = clone $query;
            $total       = (clone $base)->count();
            $paid        = (clone $base)->where('status', 'paid')->count();
            $pending     = (clone $base)->where('status', 'pending')->count();
            $overdue     = (clone $base)->where('status', 'overdue')->count();
            $partial     = (clone $base)->where('status', 'partial')->count();
            $totalAmount = (clone $base)->sum('installment_amount');

            $data = $query->orderBy('installment_date', 'asc')->paginate($this->perPage($request));

            return response()->json([
                'success' => true,
                'summary' => [
                    'total'        => $total,
                    'paid'         => $paid,
                    'pending'      => $pending,
                    'overdue'      => $overdue,
                    'partial'      => $partial,
                    'total_amount' => round($totalAmount, 2),
                ],
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            Log::error('EMI Report: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ─── 7. EMI Collection Report (no pagination) ─────────────────────────────
    // Same filters as /report/emis but returns full collection (no pagination)
    // Filters: search, branch_id, cms_admin_id, agent_unique_id,
    //          loan_id, customer_unique_id, status, frequency,
    //          installment_no, due_start_date, due_end_date,
    //          from_date, to_date

    public function emiCollectionReport(Request $request)
    {
        try {
            $query = EmiSchedule::select([
                'emi_id', 'loan_id', 'branch_id', 'cms_admin_id',
                'installment_no', 'installment_date', 'frequency',
                'installment_amount', 'principal_due', 'interest_due',
                'outstanding_balance', 'status',
                'created_at',
            ])->with([
                'loan:loan_number,loan_application_id,customer_unique_id,agent_unique_id,loan_amount,frequency,loan_start_date',
                'loan.customer:customer_unique_id,first_name,last_name,contact_number_1',
                'loan.agent:agent_unique_id,name,phone_no',
            ]);

            $this->applyCommonFilters($query, $request);

            if ($request->filled('loan_id'))        $query->where('loan_id',        $request->loan_id);
            if ($request->filled('status'))         $query->where('status',         $request->status);
            if ($request->filled('frequency'))      $query->where('frequency',      $request->frequency);
            if ($request->filled('installment_no')) $query->where('installment_no', $request->installment_no);

            if ($request->filled('due_start_date')) $query->whereDate('installment_date', '>=', $request->due_start_date);
            if ($request->filled('due_end_date'))   $query->whereDate('installment_date', '<=', $request->due_end_date);

            if ($request->filled('customer_unique_id')) {
                $query->whereHas('loan', fn($q) => $q->where('customer_unique_id', $request->customer_unique_id));
            }
            if ($request->filled('agent_unique_id')) {
                $query->whereHas('loan', fn($q) => $q->where('agent_unique_id', $request->agent_unique_id));
            }

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(function ($q) use ($s) {
                    $q->where('emi_id',   'like', "%{$s}%")
                      ->orWhere('loan_id', 'like', "%{$s}%")
                      ->orWhereHas('loan', function ($lq) use ($s) {
                          $lq->where('loan_application_id', 'like', "%{$s}%")
                             ->orWhere('customer_unique_id', 'like', "%{$s}%")
                             ->orWhere('agent_unique_id',    'like', "%{$s}%")
                             ->orWhereHas('customer', fn($cq) => $cq
                                 ->where('first_name',      'like', "%{$s}%")
                                 ->orWhere('last_name',      'like', "%{$s}%")
                                 ->orWhere('contact_number_1','like', "%{$s}%"));
                      });
                });
            }

            // Summary counts on unpaginated base
            $base        = clone $query;
            $total       = (clone $base)->count();
            $paid        = (clone $base)->where('status', 'paid')->count();
            $pending     = (clone $base)->where('status', 'pending')->count();
            $overdue     = (clone $base)->where('status', 'overdue')->count();
            $partial     = (clone $base)->where('status', 'partial')->count();
            $totalAmount = (clone $base)->sum('installment_amount');

            // Paginate — default 30, max 100
            $perPage = $this->perPage($request, 30);
            $data    = $query->orderBy('installment_date', 'asc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'summary' => [
                    'total'        => $total,
                    'paid'         => $paid,
                    'pending'      => $pending,
                    'overdue'      => $overdue,
                    'partial'      => $partial,
                    'total_amount' => round($totalAmount, 2),
                ],
                'data'       => $data->items(),
                'pagination' => [
                    'current_page' => $data->currentPage(),
                    'per_page'     => $data->perPage(),
                    'total'        => $data->total(),
                    'last_page'    => $data->lastPage(),
                    'from'         => $data->firstItem(),
                    'to'           => $data->lastItem(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('EMI Collection Report: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ─── 8. Loan Report ───────────────────────────────────────────────────────
    // Filters: search, branch_id, cms_admin_id, agent_unique_id,
    //          frequency, loan_application_id, customer_unique_id,
    //          min_amount, max_amount,
    //          from_date, to_date, per_page

    public function loanReport(Request $request)
    {
        try {
            $query = Loan::select([
                'loan_number', 'loan_application_id', 'customer_unique_id',
                'branch_id', 'cms_admin_id', 'agent_unique_id',
                'loan_amount', 'disbursement_amount', 'emi_amount',
                'interest_rate', 'tenure_months', 'frequency',
                'loan_start_date', 'installment_start_date',
                'created_at',
            ])->with(['customer:customer_unique_id,first_name,last_name,contact_number_1']);

            $this->applyCommonFilters($query, $request);

            if ($request->filled('agent_unique_id'))     $query->where('agent_unique_id',     $request->agent_unique_id);
            if ($request->filled('frequency'))           $query->where('frequency',           $request->frequency);
            if ($request->filled('loan_application_id')) $query->where('loan_application_id', $request->loan_application_id);
            if ($request->filled('customer_unique_id'))  $query->where('customer_unique_id',  $request->customer_unique_id);
            if ($request->filled('min_amount'))          $query->where('loan_amount', '>=',   $request->min_amount);
            if ($request->filled('max_amount'))          $query->where('loan_amount', '<=',   $request->max_amount);

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(function ($q) use ($s) {
                    $q->where('loan_number',          'like', "%{$s}%")
                      ->orWhere('loan_application_id', 'like', "%{$s}%")
                      ->orWhere('customer_unique_id',  'like', "%{$s}%")
                      ->orWhereHas('customer', fn($cq) => $cq
                          ->where('first_name', 'like', "%{$s}%")
                          ->orWhere('last_name', 'like', "%{$s}%"));
                });
            }

            $base            = clone $query;
            $total           = (clone $base)->count();
            $totalLoanAmount = (clone $base)->sum('loan_amount');
            $totalDisbursed  = (clone $base)->sum('disbursement_amount');
            $weekly          = (clone $base)->where('frequency', 'weekly')->count();
            $monthly         = (clone $base)->where('frequency', 'monthly')->count();
            $biweekly        = (clone $base)->where('frequency', 'biweekly')->count();

            $data = $query->orderBy('created_at', 'desc')->paginate($this->perPage($request));

            return response()->json([
                'success' => true,
                'summary' => [
                    'total'             => $total,
                    'total_loan_amount' => round($totalLoanAmount, 2),
                    'total_disbursed'   => round($totalDisbursed, 2),
                    'weekly'            => $weekly,
                    'monthly'           => $monthly,
                    'biweekly'          => $biweekly,
                ],
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            Log::error('Loan Report: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
