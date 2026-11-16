<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use App\Models\Loan\CAM;
use App\Models\Loan\CreditApplicationForm;
use App\Models\Loan\Loan;
use App\Models\Loan\LoanCustomer;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LoanDashboardController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = auth()->user();
            $branchId = $request->branch_id ?? $user->branch_id ?? $user->branch;
            
            // Base queries
            $applicationQuery = LoanApplication::query();
            $loanQuery = Loan::query();
            $camQuery = CAM::query();
            $customerQuery = LoanCustomer::query();

            // Branch filtering logic
            if ($branchId && $user->role !== 'super_admin') {
                $applicationQuery->where('branch_id', $branchId);
                $loanQuery->where('branch_id', $branchId);
                $camQuery->where('branch_id', $branchId);
                $customerQuery->where('branch_id', $branchId);
            }

            // 1. Key Statistics (Counters)
            $stats = [
                'total_customers' => (clone $customerQuery)->count(),
                'active_loans' => (clone $loanQuery)->count(),
                'total_applications' => (clone $applicationQuery)->count(),
                'pending_applications' => (clone $applicationQuery)->where('application_status', 'pending')->count(),
                'approved_cams' => (clone $camQuery)->where('credit_decision', 'approved')->count(),
                'disbursed_loans' => (clone $applicationQuery)->where('is_disbursed', 1)->count(),
                'total_disbursed_amount' => (clone $loanQuery)->sum('loan_amount'),
                'total_sanctioned_amount' => (clone $loanQuery)->sum('loan_amount'),
            ];

            // 2. Monthly Disbursement Trend (Last 6 Months)
            $disbursementTrend = [];
            for ($i = 5; $i >= 0; $i--) {
                $date = Carbon::now()->subMonths($i);
                $monthName = $date->format('M');
                $amount = (clone $loanQuery)
                    ->whereMonth('created_at', $date->month)
                    ->whereYear('created_at', $date->year)
                    ->sum('loan_amount');
                
                $disbursementTrend[] = [
                    'month' => $monthName,
                    'amount' => (float)$amount
                ];
            }

            // 3. Application Trend (Last 6 Months)
            $applicationTrend = [];
            for ($i = 5; $i >= 0; $i--) {
                $date = Carbon::now()->subMonths($i);
                $monthName = $date->format('M');
                $count = (clone $applicationQuery)
                    ->whereMonth('created_at', $date->month)
                    ->whereYear('created_at', $date->year)
                    ->count();
                
                $applicationTrend[] = [
                    'month' => $monthName,
                    'count' => $count
                ];
            }

            // 4. Loan Distribution by Type/Purpose (Top 5)
            $loanDistribution = (clone $applicationQuery)
                ->select('loan_purpose', DB::raw('count(*) as count'))
                ->groupBy('loan_purpose')
                ->orderByDesc('count')
                ->limit(5)
                ->get();

            // 5. Recent Applications
            $recentApplications = (clone $applicationQuery)
                ->with(['customer:id,customer_unique_id,first_name,last_name'])
                ->latest()
                ->limit(5)
                ->get()
                ->map(function($app) {
                    return [
                        'id' => $app->id,
                        'application_id' => $app->loan_application_id,
                        'customer_name' => ($app->customer->first_name ?? '') . ' ' . ($app->customer->last_name ?? ''),
                        'amount' => $app->loan_amount,
                        'status' => $app->application_status,
                        'date' => $app->created_at->format('Y-m-d')
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => $stats,
                    'charts' => [
                        'disbursement_trend' => $disbursementTrend,
                        'application_trend' => $applicationTrend,
                        'loan_distribution' => $loanDistribution
                    ],
                    'recent_applications' => $recentApplications
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Loan Dashboard Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load dashboard data: ' . $e->getMessage()
            ], 500);
        }
    }
}
