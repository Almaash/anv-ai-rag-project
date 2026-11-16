<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use App\Models\Loan\Loan;
use App\Models\Loan\CAM;
use App\Models\Loan\LoanCustomer;
use App\Models\Loan\Disbursement;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LoanReportController extends Controller
{
    /**
     * Comprehensive Loan Report
     */
    public function loanReport(Request $request)
    {
        try {
            $user = auth()->user();
            // Load direct customer relationship from Loan model
            $query = Loan::with(['customer', 'branch:branch_id,name', 'loanApplication']);

            $branchId = $user->branch; 
            if ($user->role !== 'super_admin' && !empty($branchId)) {
                $query->where('branch_id', $branchId);
            }

            if ($request->filled('start_date') && $request->filled('end_date')) {
                $query->whereBetween('created_at', [
                    Carbon::parse($request->start_date)->startOfDay(), 
                    Carbon::parse($request->end_date)->endOfday()
                ]);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('loan_number', 'like', "%{$search}%")
                      ->orWhere('customer_unique_id', 'like', "%{$search}%")
                      ->orWhereHas('customer', function($sub) use ($search) {
                          $sub->where('first_name', 'like', "%{$search}%")
                              ->orWhere('last_name', 'like', "%{$search}%");
                      });
                });
            }

            $perPage = $request->get('per_page', 15);
            $loans = $query->latest()->paginate($perPage);

            return response()->json([
                'success' => true,
                'message' => 'Loan report generated successfully',
                'data' => $loans
            ]);

        } catch (\Exception $e) {
            Log::error('Loan Report Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate loan report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Application Report
     */
    public function applicationReport(Request $request)
    {
        try {
            $user = auth()->user();
            
            // Note: Since 'loan_applications' table is empty, we join the 'loan_credit_application_forms' (CAF) 
            // with 'loan_customers' to get actual data.
            $query = DB::table('loan_credit_application_forms as caf')
                ->leftJoin('loan_customers as cust', 'caf.customer_unique_id', '=', 'cust.customer_unique_id')
                ->leftJoin('branches as br', 'caf.branch_id', '=', 'br.code')
                ->select(
                    'caf.*', 
                    'cust.first_name', 'cust.last_name', 
                    'br.name as branch_name'
                );

            $branchId = $user->branch;
            if ($user->role !== 'super_admin' && !empty($branchId)) {
                $query->where('caf.branch_id', $branchId);
            }

            if ($request->filled('start_date') && $request->filled('end_date')) {
                $query->whereBetween('caf.created_at', [
                    Carbon::parse($request->start_date)->startOfDay(), 
                    Carbon::parse($request->end_date)->endOfday()
                ]);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('caf.loan_application_id', 'like', "%{$search}%")
                      ->orWhere('caf.customer_unique_id', 'like', "%{$search}%")
                      ->orWhere('cust.first_name', 'like', "%{$search}%")
                      ->orWhere('cust.last_name', 'like', "%{$search}%");
                });
            }

            $applications = $query->orderBy('caf.created_at', 'desc')->paginate($request->get('per_page', 15));

            return response()->json([
                'success' => true,
                'message' => 'Application report generated successfully',
                'data' => $applications
            ]);

        } catch (\Exception $e) {
            Log::error('Application Report Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate application report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Disbursement Report
     */
    public function disbursementReport(Request $request)
    {
        try {
            $user = auth()->user();
            $query = Disbursement::with(['customer', 'branch:branch_id,name']);

            $branchId = $user->branch;
            if ($user->role !== 'super_admin' && !empty($branchId)) {
                $query->where('branch_id', $branchId);
            }

            if ($request->filled('start_date') && $request->filled('end_date')) {
                $query->whereBetween('updated_at', [
                    Carbon::parse($request->start_date)->startOfDay(), 
                    Carbon::parse($request->end_date)->endOfday()
                ]);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('disbursement_id', 'like', "%{$search}%")
                      ->orWhere('customer_unique_id', 'like', "%{$search}%")
                      ->orWhereHas('customer', function($sub) use ($search) {
                          $sub->where('first_name', 'like', "%{$search}%")
                              ->orWhere('last_name', 'like', "%{$search}%");
                      });
                });
            }

            $perPage = $request->get('per_page', 15);
            $disbursements = $query->latest()->paginate($perPage);

            return response()->json([
                'success' => true,
                'message' => 'Disbursement report generated successfully',
                'data' => $disbursements
            ]);

        } catch (\Exception $e) {
            Log::error('Disbursement Report Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate disbursement report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * View Detailed Loan Report
     */
    public function viewLoan($id)
    {
        try {
            $loan = Loan::with([
                'customer', 
                'branch:branch_id,name', 
                'loanApplication',
                'emiSchedules'
            ])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $loan
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 404);
        }
    }

    /**
     * View Detailed Application Report
     */
    public function viewApplication($id)
    {
        try {
            // Check CAF first
            $application = DB::table('loan_credit_application_forms as caf')
                ->leftJoin('loan_customers as cust', 'caf.customer_unique_id', '=', 'cust.customer_unique_id')
                ->leftJoin('branches as br', 'caf.branch_id', '=', 'br.code')
                ->select('caf.*', 'cust.*', 'br.name as branch_name')
                ->where('caf.id', $id)
                ->first();

            if (!$application) {
                return response()->json(['success' => false, 'message' => 'Application not found'], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $application
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * View Detailed Disbursement Report
     */
    public function viewDisbursement($id)
    {
        try {
            $disbursement = Disbursement::with(['customer', 'branch:branch_id,name', 'loanApplication'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $disbursement
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 404);
        }
    }
}
