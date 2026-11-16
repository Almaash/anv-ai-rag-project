<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Loan\CreditApplicationForm;
use App\Models\Loan\PdInformation;
use App\Models\Loan\CAM;
use App\Models\Loan\LoanCustomer;
use App\Models\Loan\Loan;
use App\Models\Loan\LoanDisbursement;
use Illuminate\Support\Facades\DB;

class LoanConsolidatedReportController extends Controller
{
    public function masterReport(Request $request)
    {
        $query = Loan::with(['customer']);

        if ($request->search) {
            $s = $request->search;
            $query->where(function($q) use ($s) {
                $q->where('loan_number', 'like', "%$s%")
                  ->orWhere('loan_application_id', 'like', "%$s%")
                  ->orWhereHas('customer', function($cq) use ($s) {
                      $cq->where('first_name', 'like', "%$s%")
                         ->orWhere('last_name', 'like', "%$s%");
                  });
            });
        }

        if ($request->from_date) $query->whereDate('created_at', '>=', $request->from_date);
        if ($request->to_date) $query->whereDate('created_at', '<=', $request->to_date);

        $data = $query->orderBy('id', 'desc')->paginate($request->limit ?? 20);
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function disbursementReport(Request $request)
    {
        $query = LoanDisbursement::with(['customer', 'loanApplication']);

        if ($request->search) {
            $s = $request->search;
            $query->where(function($q) use ($s) {
                $q->where('disbursement_id', 'like', "%$s%")
                  ->orWhere('loan_application_id', 'like', "%$s%")
                  ->orWhereHas('customer', function($cq) use ($s) {
                      $cq->where('first_name', 'like', "%$s%")
                         ->orWhere('last_name', 'like', "%$s%");
                  });
            });
        }

        if ($request->from_date) $query->whereDate('created_at', '>=', $request->from_date);
        if ($request->to_date)   $query->whereDate('created_at', '<=', $request->to_date);

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('status')) {
            $query->where('disbursement_status', $request->status);
        }

        $data = $query->orderBy('id', 'desc')->paginate($request->limit ?? 10);
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function cafReport(Request $request)
    {
        $query = CreditApplicationForm::with(['customer']);

        if ($request->search) {
            $s = $request->search;
            $query->where(function($q) use ($s) {
                $q->where('loan_application_id', 'like', "%$s%")
                  ->orWhereHas('customer', function($cq) use ($s) {
                      $cq->where('first_name', 'like', "%$s%")
                         ->orWhere('last_name', 'like', "%$s%")
                         ->orWhere('contact_number_1', 'like', "%$s%");
                  });
            });
        }

        if ($request->from_date) $query->whereDate('created_at', '>=', $request->from_date);
        if ($request->to_date)   $query->whereDate('created_at', '<=', $request->to_date);

        // Branch filter
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        // Status filter
        if ($request->filled('status')) {
            $s = strtolower($request->status);
            if ($s === 'verified') {
                $query->where('is_verified', 1);
            } elseif ($s === 'pending') {
                $query->where('is_verified', 0);
            } else {
                $query->where('status', $request->status);
            }
        }

        $data = $query->orderBy('id', 'desc')->paginate($request->limit ?? 10);
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function pdReport(Request $request)
    {
        $query = PdInformation::with(['customer', 'loanApplication']);

        if ($request->search) {
            $s = $request->search;
            $query->where(function($q) use ($s) {
                $q->where('pd_application_id', 'like', "%$s%")
                  ->orWhere('loan_application_id', 'like', "%$s%")
                  ->orWhereHas('customer', function($cq) use ($s) {
                      $cq->where('first_name', 'like', "%$s%")
                         ->orWhere('last_name', 'like', "%$s%");
                  });
            });
        }

        if ($request->from_date) $query->whereDate('created_at', '>=', $request->from_date);
        if ($request->to_date)   $query->whereDate('created_at', '<=', $request->to_date);

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->status !== null && $request->status !== '') {
            $query->where('status', $request->status);
        }

        $data = $query->orderBy('id', 'desc')->paginate($request->limit ?? 10);
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function camReport(Request $request)
    {
        $query = CAM::with(['customer', 'loanApplication']);

        if ($request->search) {
            $s = $request->search;
            $query->where(function($q) use ($s) {
                $q->where('cam_unique_id', 'like', "%$s%")
                  ->orWhere('loan_application_id', 'like', "%$s%")
                  ->orWhereHas('customer', function($cq) use ($s) {
                      $cq->where('first_name', 'like', "%$s%")
                         ->orWhere('last_name', 'like', "%$s%");
                  });
            });
        }

        if ($request->from_date) $query->whereDate('created_at', '>=', $request->from_date);
        if ($request->to_date)   $query->whereDate('created_at', '<=', $request->to_date);

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->status) {
            if ($request->status === 'verified') $query->where('is_verified', 1);
            elseif ($request->status === 'pending') $query->where('is_verified', 0)->where('status', '!=', 'rejected');
            else $query->where('status', $request->status);
        }

        $records = $query->orderBy('id', 'desc')->paginate($request->limit ?? 20);

        // Map data to return only necessary report fields
        $records->getCollection()->transform(function ($item) {
            // Priority 1: credit_decision field
            // Priority 2: credit_sanction_status field
            // Priority 3: fallback to 'pending'
            $rawDecision = $item->credit_decision ?? $item->credit_sanction_status ?? 'pending';
            $decision = strtolower(trim((string)$rawDecision));

            if ($decision === 'approved' || $decision === '1') {
                $decision = 'approved';
            } elseif ($decision === 'rejected' || $decision === '0') {
                $decision = 'rejected';
            } else {
                $decision = 'pending';
            }

            return [
                'id'            => $item->id,
                'cam_unique_id' => $item->cam_unique_id ?? ('CAM-' . $item->id),
                'loan_id'       => $item->loan_application_id,
                'customer_name' => ($item->customer->first_name ?? '') . ' ' . ($item->customer->last_name ?? ''),
                'decision'      => $decision, 
                'raw_status'    => $item->status, // This is the workflow status (e.g. branch_manager)
                'is_verified'   => (bool)$item->is_verified, 
                'date'          => $item->created_at->toIso8601String(),
            ];
        });

        return response()->json(['success' => true, 'data' => $records]);
    }
    public function camDisbursementReport(Request $request)
    {
        $query = \App\Models\Loan\CAM::with(['customer', 'loanApplication'])
            ->where('is_disbursement_created', true);

        if ($request->search) {
            $s = $request->search;
            $query->where(function($q) use ($s) {
                $q->where('cam_unique_id', 'like', "%$s%")
                  ->orWhere('loan_application_id', 'like', "%$s%")
                  ->orWhere('customer_unique_id', 'like', "%$s%");
            });
        }

        if ($request->from_date) $query->whereDate('created_at', '>=', $request->from_date);
        if ($request->to_date) $query->whereDate('created_at', '<=', $request->to_date);

        if ($request->credit_decision) $query->where('credit_decision', $request->credit_decision);

        $totalCams = \App\Models\Loan\CAM::count();
        $verifiedCams = \App\Models\Loan\CAM::where('is_verified', true)->count();
        $disbCreated = \App\Models\Loan\CAM::where('is_disbursement_created', true)->count();
        $disbPending = \App\Models\Loan\CAM::where('is_disbursement_created', false)->count();

        $records = $query->orderBy('id', 'desc')->get();

        $cleanData = $records->map(function($item) {
            return [
                'id' => $item->id,
                'cam_unique_id' => $item->cam_unique_id,
                'loan_application_id' => $item->loan_application_id,
                'pd_id' => $item->pd_id,
                'customer_unique_id' => $item->customer_unique_id,
                'credit_decision' => $item->credit_decision,
                'verification_status' => $item->is_verified ? 'Verified' : 'Pending',
                'disbursement_status' => $item->is_disbursement_created ? 'Created' : 'Pending',
                'status_display' => $item->is_disbursement_created ? 'Disbursement Created' : 'In Process',
                'created_at' => $item->created_at->toIso8601String(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $cleanData,
            'summary' => [
                'total_cams' => $totalCams,
                'verified_cams' => $verifiedCams,
                'disbursement_created_cams' => $disbCreated,
                'disbursement_pending_cams' => $disbPending,
            ],
            'pagination' => [
                'current_page' => 1,
                'total' => $cleanData->count(),
                'per_page' => $cleanData->count(),
                'last_page' => 1,
            ]
        ]);
    }

    public function paymentInventoryReport(Request $request)
    {
        $query = LoanDisbursement::with(['customer'])
            ->whereNotNull('disbursement_id');

        if ($request->search) {
            $s = $request->search;
            $query->where(function($q) use ($s) {
                $q->where('disbursement_id', 'like', "%$s%")
                  ->orWhere('loan_application_id', 'like', "%$s%")
                  ->orWhereHas('customer', function($cq) use ($s) {
                      $cq->where('first_name', 'like', "%$s%")
                         ->orWhere('last_name', 'like', "%$s%");
                  });
            });
        }

        if ($request->from_date) $query->whereDate('created_at', '>=', $request->from_date);
        if ($request->to_date)   $query->whereDate('created_at', '<=', $request->to_date);

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('disbursement_status')) {
            $query->where('disbursement_status', $request->disbursement_status);
        }

        $data = $query->orderBy('id', 'desc')->paginate($request->limit ?? 10);
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function finalDisbursementReport(Request $request)
    {
        // Using LoanDisbursement model joining with customer and application
        $query = LoanDisbursement::with(['customer', 'loanApplication']);

        if ($request->search) {
            $s = $request->search;
            $query->where(function($q) use ($s) {
                $q->where('disbursement_id', 'like', "%$s%")
                  ->orWhere('loan_application_id', 'like', "%$s%")
                  ->orWhere('transaction_reference', 'like', "%$s%")
                  ->orWhereHas('customer', function($cq) use ($s) {
                      $cq->where('first_name', 'like', "%$s%")
                         ->orWhere('last_name', 'like', "%$s%");
                  });
            });
        }

        if ($request->from_date) $query->whereDate('created_at', '>=', $request->from_date);
        if ($request->to_date) $query->whereDate('created_at', '<=', $request->to_date);

        if ($request->status) {
            $query->where('payment_status', $request->status);
        }

        $records = $query->orderBy('id', 'desc')->paginate($request->limit ?? 20);

        // Transformation to match frontend request exactly
        $records->getCollection()->transform(function ($item) {
            return [
                'id' => $item->id,
                'loanId' => $item->loan_application_id,
                'customerName' => ($item->customer->first_name ?? '') . ' ' . ($item->customer->last_name ?? ''),
                'agentName' => $item->customer->agent_unique_id ?? 'N/A',
                'status' => $this->mapStatus($item->payment_status),
                'disbursementDate' => $item->date_of_disbursement ?? $item->created_at,
            ];
        });

        return response()->json(['success' => true, 'data' => $records]);
    }

    private function mapStatus($status) {
        $s = strtolower($status);
        if (str_contains($s, 'done') || str_contains($s, 'success') || str_contains($s, 'completed')) return 'Success';
        if (str_contains($s, 'failed') || str_contains($s, 'rejected')) return 'Failed';
        return 'Pending';
    }}