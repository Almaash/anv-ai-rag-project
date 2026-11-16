<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function overview(Request $request)
    {
        try {
            $branchId = $request->query('branch_id');
            $dateFrom = $request->query('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $dateTo = $request->query('date_to', Carbon::now()->endOfMonth()->format('Y-m-d'));

            $data = [
                'branches_summary' => $this->getBranchesSummary($branchId),
                'financial_overview' => $this->getFinancialOverview($branchId, $dateFrom, $dateTo),
                'department_metrics' => $this->getDepartmentMetrics($branchId, $dateFrom, $dateTo),
                'top_performing_branches' => $this->getTopPerformingBranches($dateFrom, $dateTo),
                'branch_wise_breakdown' => $this->getBranchWiseBreakdown($branchId, $dateFrom, $dateTo),
                'charts' => $this->getOverviewChartData($branchId, $dateFrom, $dateTo),
                'filters' => [
                    'selected_branch' => $branchId,
                    'date_range' => [
                        'from' => $dateFrom,
                        'to' => $dateTo,
                    ],
                    'available_branches' => $this->getAvailableBranches(),
                ],
            ];

            return response()->json([
                'status' => true,
                'message' => $branchId ? "Overview data for branch {$branchId} retrieved successfully" : 'Overview data for all branches retrieved successfully',
                'data' => $data
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Failed to fetch overview data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function branchWiseData(Request $request)
    {
        try {
            $branchId = $request->query('branch_id');
            $dateFrom = $request->query('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $dateTo = $request->query('date_to', Carbon::now()->endOfMonth()->format('Y-m-d'));

            if ($branchId) {
                // Single branch data
                $data = [
                    'branch_info' => $this->getBranchInfo($branchId),
                    'loans' => $this->getBranchLoanData($branchId, $dateFrom, $dateTo),
                    'inventory' => $this->getBranchInventoryData($branchId, $dateFrom, $dateTo),
                    'hrms' => $this->getBranchHRMSData($branchId, $dateFrom, $dateTo),
                    'cms_admin' => $this->getBranchCMSData($branchId, $dateFrom, $dateTo),
                    'financial_summary' => $this->getBranchFinancialSummary($branchId, $dateFrom, $dateTo),
                    'charts' => $this->getBranchChartData($branchId, $dateFrom, $dateTo),
                ];
                
                $message = "Branch data for {$branchId} retrieved successfully";
            } else {
                // All branches data
                $branches = DB::table('branches')->where('is_active', 1)->get();
                $data = [];
                
                foreach ($branches as $branch) {
                    $data[] = [
                        'branch_info' => $branch,
                        'loans' => $this->getBranchLoanData($branch->code, $dateFrom, $dateTo),
                        'inventory' => $this->getBranchInventoryData($branch->code, $dateFrom, $dateTo),
                        'hrms' => $this->getBranchHRMSData($branch->code, $dateFrom, $dateTo),
                        'cms_admin' => $this->getBranchCMSData($branch->code, $dateFrom, $dateTo),
                        'financial_summary' => $this->getBranchFinancialSummary($branch->code, $dateFrom, $dateTo),
                        'charts' => $this->getBranchChartData($branch->code, $dateFrom, $dateTo),
                    ];
                }
                
                $message = "All branches data retrieved successfully";
            }

            return response()->json([
                'status' => true,
                'message' => $message,
                'data' => $data
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Failed to fetch branch data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function allBranchesData(Request $request)
    {
        try {
            $branchId = $request->query('branch_id'); // Add branch filter support
            $dateFrom = $request->query('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $dateTo = $request->query('date_to', Carbon::now()->endOfMonth()->format('Y-m-d'));

            // Get branches based on filter
            $branchesQuery = DB::table('branches')->where('is_active', 1);
            if ($branchId) {
                $branchesQuery->where('code', $branchId);
            }
            $branches = $branchesQuery->get();
            
            $branchesData = [];
            $summary = [
                'total_branches' => $branches->count(),
                'total_loans' => 0,
                'total_inventory_sales' => 0,
                'total_employees' => 0,
                'total_revenue' => 0,
                'total_expenses' => 0,
                'total_profit' => 0,
            ];
            
            foreach ($branches as $branch) {
                $loanData = $this->getBranchLoanData($branch->code, $dateFrom, $dateTo);
                $inventoryData = $this->getBranchInventoryData($branch->code, $dateFrom, $dateTo);
                $hrmsData = $this->getBranchHRMSData($branch->code, $dateFrom, $dateTo);
                $cmsData = $this->getBranchCMSData($branch->code, $dateFrom, $dateTo);
                $financialData = $this->getBranchFinancialSummary($branch->code, $dateFrom, $dateTo);
                
                $branchData = [
                    'branch_info' => [
                        'id' => $branch->id,
                        'code' => $branch->code,
                        'name' => $branch->name,
                        'address' => $branch->address ?? '',
                        'phone' => $branch->phone ?? '',
                        'email' => $branch->email ?? '',
                    ],
                    'loans' => $loanData,
                    'inventory' => $inventoryData,
                    'hrms' => $hrmsData,
                    'cms_admin' => $cmsData,
                    'financial_summary' => $financialData,
                    'charts' => $this->getBranchChartData($branch->code, $dateFrom, $dateTo),
                    'performance_metrics' => $this->getBranchPerformanceMetrics($branch->code, $dateFrom, $dateTo),
                ];
                
                $branchesData[] = $branchData;
                
                // Add to summary
                $summary['total_loans'] += $loanData['disbursements'];
                $summary['total_inventory_sales'] += $inventoryData['sales'];
                $summary['total_employees'] += $hrmsData['employees'];
                $summary['total_revenue'] += $financialData['revenue'];
                $summary['total_expenses'] += $financialData['expenses'];
                $summary['total_profit'] += $financialData['profit'];
            }

            $data = [
                'summary' => $summary,
                'branches' => $branchesData,
                'branch_wise_comparison' => $this->getBranchWiseComparison($branchId, $dateFrom, $dateTo),
                'department_wise_breakdown' => $this->getDepartmentWiseBreakdown($branchId, $dateFrom, $dateTo),
                'date_range' => [
                    'from' => $dateFrom,
                    'to' => $dateTo,
                ],
                'charts' => $this->getAllBranchesChartData($dateFrom, $dateTo),
                'filters' => [
                    'selected_branch' => $branchId,
                    'available_branches' => $this->getAvailableBranches(),
                    'date_range' => [
                        'from' => $dateFrom,
                        'to' => $dateTo,
                    ],
                ],
            ];

            $message = $branchId 
                ? "Branch data for {$branchId} with detailed breakdown retrieved successfully"
                : 'All branches data with detailed breakdown retrieved successfully';

            return response()->json([
                'status' => true,
                'message' => $message,
                'data' => $data
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Failed to fetch all branches data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function profitLoss(Request $request)
    {
        try {
            $branchId = $request->query('branch_id');
            $dateFrom = $request->query('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $dateTo = $request->query('date_to', Carbon::now()->endOfMonth()->format('Y-m-d'));

            $profitLossData = $this->getProfitLossData($branchId, $dateFrom, $dateTo);
            $chartData = $this->getProfitLossChartData($branchId, $dateFrom, $dateTo);

            $data = [
                'profit_loss_data' => $profitLossData,
                'charts' => $chartData,
                'date_range' => [
                    'from' => $dateFrom,
                    'to' => $dateTo,
                ],
            ];

            $message = $branchId 
                ? "Profit/Loss data for branch {$branchId} retrieved successfully"
                : "Profit/Loss data for all branches retrieved successfully";

            return response()->json([
                'status' => true,
                'message' => $message,
                'data' => $data
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Failed to fetch profit/loss data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function getBranchesSummary($branchId = null)
    {
        $query = DB::table('branches')->where('is_active', 1);
        
        if ($branchId) {
            $query->where('code', $branchId);
        }

        $branches = $query->get();
        
        return [
            'total_branches' => $branches->count(),
            'active_branches' => $branches->where('is_active', 1)->count(),
            'branches' => $branches->map(function ($branch) {
                return [
                    'id' => $branch->id,
                    'code' => $branch->code,
                    'name' => $branch->name,
                    'address' => $branch->address ?? '',
                    'phone' => $branch->phone ?? '',
                    'email' => $branch->email ?? '',
                    'is_active' => $branch->is_active,
                ];
            }),
        ];
    }

    private function getFinancialOverview($branchId, $dateFrom, $dateTo)
    {
        try {
            $loanRevenue = $this->getLoanRevenue($branchId, $dateFrom, $dateTo);
            $inventoryRevenue = $this->getInventoryRevenue($branchId, $dateFrom, $dateTo);
            $expenses = $this->getExpenses($branchId, $dateFrom, $dateTo);

            $totalRevenue = $loanRevenue + $inventoryRevenue;
            $netProfit = $totalRevenue - $expenses;

            return [
                'total_revenue' => $totalRevenue,
                'loan_revenue' => $loanRevenue,
                'inventory_revenue' => $inventoryRevenue,
                'total_expenses' => $expenses,
                'net_profit' => $netProfit,
                'profit_margin' => $totalRevenue > 0 ? round(($netProfit / $totalRevenue) * 100, 2) : 0,
            ];
        } catch (\Exception $e) {
            return [
                'total_revenue' => 0,
                'loan_revenue' => 0,
                'inventory_revenue' => 0,
                'total_expenses' => 0,
                'net_profit' => 0,
                'profit_margin' => 0,
            ];
        }
    }

    private function getDepartmentMetrics($branchId, $dateFrom, $dateTo)
    {
        try {
            return [
                'loans' => $this->getLoanMetrics($branchId, $dateFrom, $dateTo),
                'inventory' => $this->getInventoryMetrics($branchId, $dateFrom, $dateTo),
                'hrms' => $this->getHRMSMetrics($branchId, $dateFrom, $dateTo),
                'cms_admin' => $this->getCMSMetrics($branchId, $dateFrom, $dateTo),
            ];
        } catch (\Exception $e) {
            return [
                'loans' => [],
                'inventory' => [],
                'hrms' => [],
                'cms_admin' => [],
            ];
        }
    }

    private function getLoanMetrics($branchId, $dateFrom, $dateTo)
    {
        $query = DB::table('loan_applications');
        
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $totalApplications = (clone $query)->whereBetween('created_at', [$dateFrom, $dateTo])->count();
        $approvedLoans = (clone $query)->where('application_status', 'approved')
            ->whereBetween('created_at', [$dateFrom, $dateTo])->count();
        
        // Get disbursed amount from loan_loans table instead
        $disbursedAmount = DB::table('loan_loans')
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->whereBetween('loan_start_date', [$dateFrom, $dateTo])
            ->sum('loan_amount') ?? 0;

        return [
            'total_applications' => $totalApplications,
            'approved_loans' => $approvedLoans,
            'approval_rate' => $totalApplications > 0 ? round(($approvedLoans / $totalApplications) * 100, 2) : 0,
            'disbursed_amount' => $disbursedAmount,
            'active_customers' => DB::table('loan_customers')
                ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                ->where('status', 'active')
                ->count(),
        ];
    }

    private function getInventoryMetrics($branchId, $dateFrom, $dateTo)
    {
        $salesAmount = DB::table('inventory_sales')
            ->when($branchId, fn($q) => $q->where('branch', $branchId))
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->sum('total_amount') ?? 0;

        $purchaseAmount = DB::table('inventory_purchase_orders')
            ->when($branchId, fn($q) => $q->where('branch', $branchId))
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->sum('total_amount') ?? 0;

        $totalProducts = DB::table('inventory_product_masters')
            ->when($branchId, fn($q) => $q->where('branch', $branchId))
            ->count();

        // Since there's no minimum_stock column, just count products with low stock (< 10)
        $lowStockItems = DB::table('inventory_product_masters')
            ->when($branchId, fn($q) => $q->where('branch', $branchId))
            ->where('stock', '<', 10)
            ->count();

        return [
            'total_sales' => $salesAmount,
            'total_purchases' => $purchaseAmount,
            'total_products' => $totalProducts,
            'low_stock_items' => $lowStockItems,
        ];
    }

    private function getHRMSMetrics($branchId, $dateFrom, $dateTo)
    {
        $totalEmployees = DB::table('hrms_employees')
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->where('status', 'active')
            ->count();

        $leaveRequests = DB::table('hrms_leave_requests')
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->count();

        $totalSalaryPaid = DB::table('hrms_salaries')
            ->join('hrms_employees', 'hrms_salaries.employee_id', '=', 'hrms_employees.id')
            ->when($branchId, fn($q) => $q->where('hrms_employees.branch_id', $branchId))
            ->whereBetween('hrms_salaries.payment_date', [$dateFrom, $dateTo])
            ->sum('hrms_salaries.net_pay') ?? 0;

        return [
            'total_employees' => $totalEmployees,
            'attendance_rate' => $this->getAttendanceRate($branchId, $dateFrom, $dateTo),
            'leave_requests' => $leaveRequests,
            'total_salary_paid' => $totalSalaryPaid,
        ];
    }

    private function getCMSMetrics($branchId, $dateFrom, $dateTo)
    {
        try {
            return [
                'total_users' => DB::table('users')
                    ->when($branchId, fn($q) => $q->where('branch', $branchId))
                    ->count(),
                'active_subscriptions' => DB::table('subscriptions')
                    ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                    ->where('status', 'active')
                    ->count(),
                'total_roles' => DB::table('roles')
                    ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                    ->count(),
            ];
        } catch (\Exception $e) {
            return [
                'total_users' => 0,
                'active_subscriptions' => 0,
                'total_roles' => 0,
            ];
        }
    }

    private function getTopPerformingBranches($dateFrom, $dateTo)
    {
        try {
            return DB::table('branches as b')
                ->leftJoin('loan_loans as ll', 'b.code', '=', 'll.branch_id')
                ->leftJoin('inventory_sales as i', 'b.code', '=', 'i.branch')
                ->select(
                    'b.id',
                    'b.code',
                    'b.name',
                    'b.address',
                    DB::raw('COALESCE(SUM(ll.loan_amount), 0) as loan_revenue'),
                    DB::raw('COALESCE(SUM(i.total_amount), 0) as inventory_revenue'),
                    DB::raw('COALESCE(SUM(ll.loan_amount), 0) + COALESCE(SUM(i.total_amount), 0) as total_revenue')
                )
                ->whereBetween('ll.loan_start_date', [$dateFrom, $dateTo])
                ->whereBetween('i.created_at', [$dateFrom, $dateTo])
                ->groupBy('b.id', 'b.code', 'b.name', 'b.address')
                ->orderBy('total_revenue', 'desc')
                ->limit(10)
                ->get();
        } catch (\Exception $e) {
            return collect([]);
        }
    }

    private function getBranchInfo($branchId)
    {
        return DB::table('branches')->where('code', $branchId)->first();
    }

    private function getBranchLoanData($branchId, $dateFrom, $dateTo)
    {
        try {
            $applications = DB::table('loan_applications')
                ->where('branch_id', $branchId)
                ->whereBetween('created_at', [$dateFrom, $dateTo])
                ->count();

            $disbursements = DB::table('loan_loans')
                ->where('branch_id', $branchId)
                ->whereBetween('loan_start_date', [$dateFrom, $dateTo])
                ->sum('loan_amount') ?? 0;

            $collections = DB::table('loan_emi_payments')
                ->where('branch_id', $branchId)
                ->whereBetween('payment_date', [$dateFrom, $dateTo])
                ->where('approval_status', 'approved')
                ->sum('payment_amount') ?? 0;

            // Simplified overdue calculation - just count overdue EMIs without amount
            $overdueCount = 0;
            try {
                $overdueCount = DB::table('loan_emi_schedules')
                    ->where('branch_id', $branchId)
                    ->where('due_date', '<', Carbon::now()->format('Y-m-d'))
                    ->where('status', 'pending')
                    ->count();
            } catch (\Exception $e) {
                $overdueCount = 0;
            }

            return [
                'applications' => $applications,
                'disbursements' => $disbursements,
                'collections' => $collections,
                'overdue_count' => $overdueCount,
                'overdue_amount' => 0, // Placeholder until we fix the column issue
            ];
        } catch (\Exception $e) {
            return [
                'applications' => 0,
                'disbursements' => 0,
                'collections' => 0,
                'overdue_count' => 0,
                'overdue_amount' => 0,
            ];
        }
    }

    private function getBranchInventoryData($branchId, $dateFrom, $dateTo)
    {
        $sales = DB::table('inventory_sales')
            ->where('branch', $branchId)
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->sum('total_amount') ?? 0;

        $purchases = DB::table('inventory_purchase_orders')
            ->where('branch', $branchId)
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->sum('total_amount') ?? 0;

        // Calculate stock value using available columns: stock * selling_price
        $stockValue = DB::table('inventory_product_masters')
            ->where('branch', $branchId)
            ->sum(DB::raw('stock * selling_price')) ?? 0;

        return [
            'sales' => $sales,
            'purchases' => $purchases,
            'stock_value' => $stockValue,
        ];
    }

    private function getBranchHRMSData($branchId, $dateFrom, $dateTo)
    {
        $employees = DB::table('hrms_employees')
            ->where('branch_id', $branchId)
            ->where('status', 'active')
            ->count();

        $salaryPaid = DB::table('hrms_salaries')
            ->join('hrms_employees', 'hrms_salaries.employee_id', '=', 'hrms_employees.id')
            ->where('hrms_employees.branch_id', $branchId)
            ->whereBetween('hrms_salaries.payment_date', [$dateFrom, $dateTo])
            ->sum('hrms_salaries.net_pay') ?? 0;

        return [
            'employees' => $employees,
            'salary_paid' => $salaryPaid,
            'attendance_rate' => $this->getAttendanceRate($branchId, $dateFrom, $dateTo),
        ];
    }

    private function getBranchCMSData($branchId, $dateFrom, $dateTo)
    {
        try {
            return [
                'users' => DB::table('users')->where('branch', $branchId)->count(),
                'roles' => DB::table('roles')->where('branch_id', $branchId)->count(),
                'modules' => DB::table('modules')->where('branch_id', $branchId)->count(),
            ];
        } catch (\Exception $e) {
            return [
                'users' => 0,
                'roles' => 0,
                'modules' => 0,
            ];
        }
    }

    private function getBranchFinancialSummary($branchId, $dateFrom, $dateTo)
    {
        try {
            $revenue = $this->getLoanRevenue($branchId, $dateFrom, $dateTo) + 
                      $this->getInventoryRevenue($branchId, $dateFrom, $dateTo);
            $expenses = $this->getExpenses($branchId, $dateFrom, $dateTo);
            $profit = $revenue - $expenses;

            return [
                'revenue' => $revenue,
                'expenses' => $expenses,
                'profit' => $profit,
                'profit_margin' => $revenue > 0 ? round(($profit / $revenue) * 100, 2) : 0,
            ];
        } catch (\Exception $e) {
            return [
                'revenue' => 0,
                'expenses' => 0,
                'profit' => 0,
                'profit_margin' => 0,
            ];
        }
    }

    private function getProfitLossData($branchId, $dateFrom, $dateTo)
    {
        try {
            $query = DB::table('branches as b');
            
            if ($branchId) {
                $query->where('b.code', $branchId);
            }

            return $query->leftJoin('loan_loans as ll', 'b.code', '=', 'll.branch_id')
                ->leftJoin('inventory_sales as i', 'b.code', '=', 'i.branch')
                ->leftJoin('hrms_salaries as s', function($join) {
                    $join->on('b.code', '=', 'hrms_employees.branch_id')
                         ->join('hrms_employees', 'hrms_salaries.employee_id', '=', 'hrms_employees.id');
                })
                ->select(
                    'b.id',
                    'b.code',
                    'b.name as branch_name',
                    DB::raw('COALESCE(SUM(ll.loan_amount * 0.1), 0) as loan_revenue'),
                    DB::raw('COALESCE(SUM(i.total_amount * 0.2), 0) as inventory_revenue'),
                    DB::raw('COALESCE(SUM(s.net_pay), 0) as salary_expenses'),
                    DB::raw('COALESCE(SUM(ll.loan_amount * 0.1), 0) + COALESCE(SUM(i.total_amount * 0.2), 0) as total_revenue'),
                    DB::raw('COALESCE(SUM(s.net_pay), 0) as total_expenses'),
                    DB::raw('(COALESCE(SUM(ll.loan_amount * 0.1), 0) + COALESCE(SUM(i.total_amount * 0.2), 0)) - COALESCE(SUM(s.net_pay), 0) as net_profit')
                )
                ->whereBetween('ll.loan_start_date', [$dateFrom, $dateTo])
                ->whereBetween('i.created_at', [$dateFrom, $dateTo])
                ->whereBetween('s.payment_date', [$dateFrom, $dateTo])
                ->groupBy('b.id', 'b.code', 'b.name')
                ->get();
        } catch (\Exception $e) {
            return collect([]);
        }
    }

    private function getLoanRevenue($branchId, $dateFrom, $dateTo)
    {
        try {
            // Use loan_emi_payments for actual revenue from interest/payments
            $query = DB::table('loan_emi_payments');
            
            if ($branchId) {
                $query->where('branch_id', $branchId);
            }

            return $query->whereBetween('payment_date', [$dateFrom, $dateTo])
                ->where('approval_status', 'approved')
                ->sum('payment_amount') ?? 0;
        } catch (\Exception $e) {
            // Fallback: calculate estimated revenue from loan amounts
            try {
                $query = DB::table('loan_loans');
                
                if ($branchId) {
                    $query->where('branch_id', $branchId);
                }

                $loanAmount = $query->whereBetween('loan_start_date', [$dateFrom, $dateTo])
                    ->sum('loan_amount') ?? 0;
                    
                return $loanAmount * 0.1; // Assume 10% revenue from loans
            } catch (\Exception $e2) {
                return 0;
            }
        }
    }

    private function getInventoryRevenue($branchId, $dateFrom, $dateTo)
    {
        try {
            $query = DB::table('inventory_sales');
            
            if ($branchId) {
                $query->where('branch', $branchId);
            }

            return $query->whereBetween('created_at', [$dateFrom, $dateTo])
                ->sum('total_amount') ?? 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function getExpenses($branchId, $dateFrom, $dateTo)
    {
        try {
            $salaryQuery = DB::table('hrms_salaries')
                ->join('hrms_employees', 'hrms_salaries.employee_id', '=', 'hrms_employees.id');
            
            if ($branchId) {
                $salaryQuery->where('hrms_employees.branch_id', $branchId);
            }

            return $salaryQuery->whereBetween('hrms_salaries.payment_date', [$dateFrom, $dateTo])
                ->sum('hrms_salaries.net_pay') ?? 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function getAttendanceRate($branchId, $dateFrom, $dateTo)
    {
        try {
            $totalWorkingDays = Carbon::parse($dateFrom)->diffInWeekdays(Carbon::parse($dateTo));
            
            if ($totalWorkingDays == 0) return 100;

            $attendanceQuery = DB::table('hrms_attendance as a')
                ->join('hrms_employees as e', 'a.employee_id', '=', 'e.id');
                
            if ($branchId) {
                $attendanceQuery->where('e.branch_id', $branchId);
            }

            $presentDays = $attendanceQuery->whereBetween('a.date', [$dateFrom, $dateTo])
                ->where('a.status', 'present')
                ->count();

            $totalEmployees = DB::table('hrms_employees')
                ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                ->where('status', 'active')
                ->count();

            $expectedAttendance = $totalEmployees * $totalWorkingDays;
            
            return $expectedAttendance > 0 ? round(($presentDays / $expectedAttendance) * 100, 2) : 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    // ============= CHART DATA METHODS =============

    private function getOverviewChartData($branchId, $dateFrom, $dateTo)
    {
        try {
            return [
                'revenue_breakdown' => $this->getRevenueBreakdownChart($branchId, $dateFrom, $dateTo),
                'branch_performance' => $this->getBranchPerformanceChart($dateFrom, $dateTo),
                'department_comparison' => $this->getDepartmentComparisonChart($branchId, $dateFrom, $dateTo),
                'monthly_trends' => $this->getMonthlyTrendsChart($branchId, $dateFrom, $dateTo),
                'loan_status_distribution' => $this->getLoanStatusChart($branchId, $dateFrom, $dateTo),
            ];
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getBranchChartData($branchId, $dateFrom, $dateTo)
    {
        try {
            return [
                'financial_overview' => $this->getBranchFinancialChart($branchId, $dateFrom, $dateTo),
                'loan_performance' => $this->getBranchLoanChart($branchId, $dateFrom, $dateTo),
                'inventory_trends' => $this->getBranchInventoryChart($branchId, $dateFrom, $dateTo),
                'employee_metrics' => $this->getBranchEmployeeChart($branchId, $dateFrom, $dateTo),
                'daily_trends' => $this->getDailyTrendsChart($branchId, $dateFrom, $dateTo),
            ];
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getAllBranchesChartData($dateFrom, $dateTo)
    {
        try {
            return [
                'branches_comparison' => $this->getBranchesComparisonChart($dateFrom, $dateTo),
                'revenue_distribution' => $this->getRevenueDistributionChart($dateFrom, $dateTo),
                'performance_ranking' => $this->getPerformanceRankingChart($dateFrom, $dateTo),
                'growth_trends' => $this->getGrowthTrendsChart($dateFrom, $dateTo),
            ];
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getProfitLossChartData($branchId, $dateFrom, $dateTo)
    {
        try {
            return [
                'profit_loss_trend' => $this->getProfitLossTrendChart($branchId, $dateFrom, $dateTo),
                'revenue_vs_expenses' => $this->getRevenueVsExpensesChart($branchId, $dateFrom, $dateTo),
                'branch_profitability' => $this->getBranchProfitabilityChart($branchId, $dateFrom, $dateTo),
                'cost_breakdown' => $this->getCostBreakdownChart($branchId, $dateFrom, $dateTo),
            ];
        } catch (\Exception $e) {
            return [];
        }
    }

    // Revenue Breakdown Pie Chart
    private function getRevenueBreakdownChart($branchId, $dateFrom, $dateTo)
    {
        $loanRevenue = $this->getLoanRevenue($branchId, $dateFrom, $dateTo);
        $inventoryRevenue = $this->getInventoryRevenue($branchId, $dateFrom, $dateTo);

        return [
            'type' => 'pie',
            'title' => 'Revenue Breakdown',
            'data' => [
                ['name' => 'Loan Revenue', 'value' => $loanRevenue, 'color' => '#3B82F6'],
                ['name' => 'Inventory Revenue', 'value' => $inventoryRevenue, 'color' => '#10B981'],
            ],
            'total' => $loanRevenue + $inventoryRevenue,
        ];
    }

    // Branch Performance Bar Chart
    private function getBranchPerformanceChart($dateFrom, $dateTo)
    {
        $branches = DB::table('branches')->where('is_active', 1)->limit(10)->get();
        $data = [];

        foreach ($branches as $branch) {
            $revenue = $this->getLoanRevenue($branch->code, $dateFrom, $dateTo) + 
                      $this->getInventoryRevenue($branch->code, $dateFrom, $dateTo);
            $expenses = $this->getExpenses($branch->code, $dateFrom, $dateTo);
            
            $data[] = [
                'branch' => $branch->name,
                'revenue' => $revenue,
                'expenses' => $expenses,
                'profit' => $revenue - $expenses,
            ];
        }

        return [
            'type' => 'bar',
            'title' => 'Branch Performance Comparison',
            'data' => $data,
            'xAxis' => 'branch',
            'yAxis' => ['revenue', 'expenses', 'profit'],
        ];
    }

    // Department Comparison Doughnut Chart
    private function getDepartmentComparisonChart($branchId, $dateFrom, $dateTo)
    {
        $metrics = $this->getDepartmentMetrics($branchId, $dateFrom, $dateTo);
        
        return [
            'type' => 'doughnut',
            'title' => 'Department Performance',
            'data' => [
                ['name' => 'Loans', 'value' => $metrics['loans']['disbursed_amount'] ?? 0, 'color' => '#8B5CF6'],
                ['name' => 'Inventory', 'value' => $metrics['inventory']['total_sales'] ?? 0, 'color' => '#F59E0B'],
                ['name' => 'HRMS', 'value' => $metrics['hrms']['total_salary_paid'] ?? 0, 'color' => '#EF4444'],
            ],
        ];
    }

    // Monthly Trends Line Chart
    private function getMonthlyTrendsChart($branchId, $dateFrom, $dateTo)
    {
        $months = [];
        $currentDate = Carbon::parse($dateFrom);
        $endDate = Carbon::parse($dateTo);

        while ($currentDate->lte($endDate)) {
            $monthStart = $currentDate->copy()->startOfMonth()->format('Y-m-d');
            $monthEnd = $currentDate->copy()->endOfMonth()->format('Y-m-d');
            
            $revenue = $this->getLoanRevenue($branchId, $monthStart, $monthEnd) + 
                      $this->getInventoryRevenue($branchId, $monthStart, $monthEnd);
            $expenses = $this->getExpenses($branchId, $monthStart, $monthEnd);
            
            $months[] = [
                'month' => $currentDate->format('M Y'),
                'revenue' => $revenue,
                'expenses' => $expenses,
                'profit' => $revenue - $expenses,
            ];
            
            $currentDate->addMonth();
        }

        return [
            'type' => 'line',
            'title' => 'Monthly Financial Trends',
            'data' => $months,
            'xAxis' => 'month',
            'yAxis' => ['revenue', 'expenses', 'profit'],
        ];
    }

    // Loan Status Distribution
    private function getLoanStatusChart($branchId, $dateFrom, $dateTo)
    {
        try {
            $query = DB::table('loan_applications');
            if ($branchId) {
                $query->where('branch_id', $branchId);
            }
            
            $statusData = $query->whereBetween('created_at', [$dateFrom, $dateTo])
                ->selectRaw('application_status, COUNT(*) as count')
                ->groupBy('application_status')
                ->get();

            $colors = [
                'pending' => '#F59E0B',
                'approved' => '#10B981',
                'rejected' => '#EF4444',
                'under_review' => '#8B5CF6',
            ];

            $data = $statusData->map(function ($item) use ($colors) {
                return [
                    'name' => ucfirst(str_replace('_', ' ', $item->application_status)),
                    'value' => $item->count,
                    'color' => $colors[$item->application_status] ?? '#6B7280',
                ];
            });

            return [
                'type' => 'pie',
                'title' => 'Loan Application Status',
                'data' => $data,
            ];
        } catch (\Exception $e) {
            return ['type' => 'pie', 'title' => 'Loan Application Status', 'data' => []];
        }
    }

    // Branch Financial Overview Chart
    private function getBranchFinancialChart($branchId, $dateFrom, $dateTo)
    {
        $financial = $this->getBranchFinancialSummary($branchId, $dateFrom, $dateTo);
        
        return [
            'type' => 'bar',
            'title' => 'Financial Overview',
            'data' => [
                ['category' => 'Revenue', 'amount' => $financial['revenue']],
                ['category' => 'Expenses', 'amount' => $financial['expenses']],
                ['category' => 'Profit', 'amount' => $financial['profit']],
            ],
            'xAxis' => 'category',
            'yAxis' => 'amount',
        ];
    }

    // Branch Loan Performance
    private function getBranchLoanChart($branchId, $dateFrom, $dateTo)
    {
        $loanData = $this->getBranchLoanData($branchId, $dateFrom, $dateTo);
        
        return [
            'type' => 'bar',
            'title' => 'Loan Performance',
            'data' => [
                ['metric' => 'Applications', 'count' => $loanData['applications']],
                ['metric' => 'Disbursements', 'count' => $loanData['disbursements'] / 100000], // Scale down for visualization
                ['metric' => 'Collections', 'count' => $loanData['collections'] / 100000],
            ],
            'xAxis' => 'metric',
            'yAxis' => 'count',
        ];
    }

    // Branch Inventory Trends
    private function getBranchInventoryChart($branchId, $dateFrom, $dateTo)
    {
        $inventoryData = $this->getBranchInventoryData($branchId, $dateFrom, $dateTo);
        
        return [
            'type' => 'line',
            'title' => 'Inventory Trends',
            'data' => [
                ['period' => 'Sales', 'amount' => $inventoryData['sales']],
                ['period' => 'Purchases', 'amount' => $inventoryData['purchases']],
                ['period' => 'Stock Value', 'amount' => $inventoryData['stock_value']],
            ],
            'xAxis' => 'period',
            'yAxis' => 'amount',
        ];
    }

    // Branch Employee Metrics
    private function getBranchEmployeeChart($branchId, $dateFrom, $dateTo)
    {
        $hrmsData = $this->getBranchHRMSData($branchId, $dateFrom, $dateTo);
        
        return [
            'type' => 'gauge',
            'title' => 'Employee Metrics',
            'data' => [
                ['name' => 'Attendance Rate', 'value' => $hrmsData['attendance_rate'], 'max' => 100],
                ['name' => 'Employee Count', 'value' => $hrmsData['employees'], 'max' => 100],
            ],
        ];
    }

    // Daily Trends
    private function getDailyTrendsChart($branchId, $dateFrom, $dateTo)
    {
        // Generate sample daily data for the date range
        $days = [];
        $currentDate = Carbon::parse($dateFrom);
        $endDate = Carbon::parse($dateTo);

        while ($currentDate->lte($endDate)) {
            $dayRevenue = rand(10000, 50000); // Sample data
            $days[] = [
                'date' => $currentDate->format('Y-m-d'),
                'revenue' => $dayRevenue,
                'expenses' => rand(5000, 25000),
            ];
            $currentDate->addDay();
        }

        return [
            'type' => 'area',
            'title' => 'Daily Revenue Trends',
            'data' => $days,
            'xAxis' => 'date',
            'yAxis' => ['revenue', 'expenses'],
        ];
    }

    // Branches Comparison
    private function getBranchesComparisonChart($dateFrom, $dateTo)
    {
        return $this->getBranchPerformanceChart($dateFrom, $dateTo);
    }

    // Revenue Distribution
    private function getRevenueDistributionChart($dateFrom, $dateTo)
    {
        $branches = DB::table('branches')->where('is_active', 1)->get();
        $data = [];

        foreach ($branches as $branch) {
            $revenue = $this->getLoanRevenue($branch->code, $dateFrom, $dateTo) + 
                      $this->getInventoryRevenue($branch->code, $dateFrom, $dateTo);
            
            if ($revenue > 0) {
                $data[] = [
                    'name' => $branch->name,
                    'value' => $revenue,
                ];
            }
        }

        return [
            'type' => 'pie',
            'title' => 'Revenue Distribution by Branch',
            'data' => $data,
        ];
    }

    // Performance Ranking
    private function getPerformanceRankingChart($dateFrom, $dateTo)
    {
        $performanceData = $this->getBranchPerformanceChart($dateFrom, $dateTo);
        
        // Sort by profit descending
        $sortedData = collect($performanceData['data'])->sortByDesc('profit')->take(10)->values();
        
        return [
            'type' => 'horizontal_bar',
            'title' => 'Top Performing Branches',
            'data' => $sortedData,
            'xAxis' => 'profit',
            'yAxis' => 'branch',
        ];
    }

    // Growth Trends
    private function getGrowthTrendsChart($dateFrom, $dateTo)
    {
        return $this->getMonthlyTrendsChart(null, $dateFrom, $dateTo);
    }

    // Profit Loss Trend
    private function getProfitLossTrendChart($branchId, $dateFrom, $dateTo)
    {
        return $this->getMonthlyTrendsChart($branchId, $dateFrom, $dateTo);
    }

    // Revenue vs Expenses
    private function getRevenueVsExpensesChart($branchId, $dateFrom, $dateTo)
    {
        $revenue = $this->getLoanRevenue($branchId, $dateFrom, $dateTo) + 
                  $this->getInventoryRevenue($branchId, $dateFrom, $dateTo);
        $expenses = $this->getExpenses($branchId, $dateFrom, $dateTo);
        
        return [
            'type' => 'bar',
            'title' => 'Revenue vs Expenses',
            'data' => [
                ['category' => 'Revenue', 'amount' => $revenue, 'color' => '#10B981'],
                ['category' => 'Expenses', 'amount' => $expenses, 'color' => '#EF4444'],
            ],
            'xAxis' => 'category',
            'yAxis' => 'amount',
        ];
    }

    // Branch Profitability
    private function getBranchProfitabilityChart($branchId, $dateFrom, $dateTo)
    {
        if ($branchId) {
            $financial = $this->getBranchFinancialSummary($branchId, $dateFrom, $dateTo);
            return [
                'type' => 'gauge',
                'title' => 'Profit Margin',
                'data' => [
                    ['name' => 'Profit Margin', 'value' => $financial['profit_margin'], 'max' => 100],
                ],
            ];
        } else {
            $branches = DB::table('branches')->where('is_active', 1)->get();
            $data = [];
            
            foreach ($branches as $branch) {
                $financial = $this->getBranchFinancialSummary($branch->code, $dateFrom, $dateTo);
                $data[] = [
                    'branch' => $branch->name,
                    'profit_margin' => $financial['profit_margin'],
                ];
            }
            
            return [
                'type' => 'bar',
                'title' => 'Branch Profitability',
                'data' => $data,
                'xAxis' => 'branch',
                'yAxis' => 'profit_margin',
            ];
        }
    }

    // Cost Breakdown
    private function getCostBreakdownChart($branchId, $dateFrom, $dateTo)
    {
        $salaryExpenses = $this->getExpenses($branchId, $dateFrom, $dateTo);
        $operationalCosts = $salaryExpenses * 0.3; // Estimated operational costs
        $otherExpenses = $salaryExpenses * 0.1; // Estimated other expenses
        
        return [
            'type' => 'pie',
            'title' => 'Cost Breakdown',
            'data' => [
                ['name' => 'Salary Expenses', 'value' => $salaryExpenses, 'color' => '#EF4444'],
                ['name' => 'Operational Costs', 'value' => $operationalCosts, 'color' => '#F59E0B'],
                ['name' => 'Other Expenses', 'value' => $otherExpenses, 'color' => '#8B5CF6'],
            ],
        ];
    }

    // ============= BRANCH-WISE BREAKDOWN METHODS =============

    private function getBranchWiseBreakdown($branchId, $dateFrom, $dateTo)
    {
        try {
            $branchesQuery = DB::table('branches')->where('is_active', 1);
            if ($branchId) {
                $branchesQuery->where('code', $branchId);
            }
            $branches = $branchesQuery->get();
            
            $breakdown = [];
            
            foreach ($branches as $branch) {
                $loanData = $this->getBranchLoanData($branch->code, $dateFrom, $dateTo);
                $inventoryData = $this->getBranchInventoryData($branch->code, $dateFrom, $dateTo);
                $hrmsData = $this->getBranchHRMSData($branch->code, $dateFrom, $dateTo);
                $financialData = $this->getBranchFinancialSummary($branch->code, $dateFrom, $dateTo);
                
                $breakdown[] = [
                    'branch_code' => $branch->code,
                    'branch_name' => $branch->name,
                    'metrics' => [
                        'loans' => [
                            'applications' => $loanData['applications'],
                            'disbursements' => $loanData['disbursements'],
                            'collections' => $loanData['collections'],
                            'overdue_amount' => $loanData['overdue_amount'] ?? 0,
                        ],
                        'inventory' => [
                            'sales' => $inventoryData['sales'],
                            'purchases' => $inventoryData['purchases'],
                            'stock_value' => $inventoryData['stock_value'],
                        ],
                        'hrms' => [
                            'employees' => $hrmsData['employees'],
                            'salary_paid' => $hrmsData['salary_paid'],
                            'attendance_rate' => $hrmsData['attendance_rate'],
                        ],
                        'financial' => [
                            'revenue' => $financialData['revenue'],
                            'expenses' => $financialData['expenses'],
                            'profit' => $financialData['profit'],
                            'profit_margin' => $financialData['profit_margin'],
                        ],
                    ],
                ];
            }
            
            return $breakdown;
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getBranchWiseComparison($branchId, $dateFrom, $dateTo)
    {
        try {
            $branchesQuery = DB::table('branches')->where('is_active', 1);
            if ($branchId) {
                $branchesQuery->where('code', $branchId);
            }
            $branches = $branchesQuery->get();
            
            $comparison = [
                'revenue_comparison' => [],
                'profit_comparison' => [],
                'employee_comparison' => [],
                'loan_performance' => [],
                'inventory_performance' => [],
            ];
            
            foreach ($branches as $branch) {
                $financialData = $this->getBranchFinancialSummary($branch->code, $dateFrom, $dateTo);
                $loanData = $this->getBranchLoanData($branch->code, $dateFrom, $dateTo);
                $inventoryData = $this->getBranchInventoryData($branch->code, $dateFrom, $dateTo);
                $hrmsData = $this->getBranchHRMSData($branch->code, $dateFrom, $dateTo);
                
                $comparison['revenue_comparison'][] = [
                    'branch' => $branch->name,
                    'revenue' => $financialData['revenue'],
                ];
                
                $comparison['profit_comparison'][] = [
                    'branch' => $branch->name,
                    'profit' => $financialData['profit'],
                    'profit_margin' => $financialData['profit_margin'],
                ];
                
                $comparison['employee_comparison'][] = [
                    'branch' => $branch->name,
                    'employees' => $hrmsData['employees'],
                    'attendance_rate' => $hrmsData['attendance_rate'],
                ];
                
                $comparison['loan_performance'][] = [
                    'branch' => $branch->name,
                    'applications' => $loanData['applications'],
                    'disbursements' => $loanData['disbursements'],
                    'collections' => $loanData['collections'],
                ];
                
                $comparison['inventory_performance'][] = [
                    'branch' => $branch->name,
                    'sales' => $inventoryData['sales'],
                    'purchases' => $inventoryData['purchases'],
                ];
            }
            
            return $comparison;
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getDepartmentWiseBreakdown($branchId, $dateFrom, $dateTo)
    {
        try {
            $departments = ['loans', 'inventory', 'hrms', 'cms_admin'];
            $breakdown = [];
            
            foreach ($departments as $department) {
                switch ($department) {
                    case 'loans':
                        $breakdown['loans'] = [
                            'total_applications' => 0,
                            'total_disbursements' => 0,
                            'total_collections' => 0,
                            'branch_wise' => [],
                        ];
                        break;
                    case 'inventory':
                        $breakdown['inventory'] = [
                            'total_sales' => 0,
                            'total_purchases' => 0,
                            'total_stock_value' => 0,
                            'branch_wise' => [],
                        ];
                        break;
                    case 'hrms':
                        $breakdown['hrms'] = [
                            'total_employees' => 0,
                            'total_salary_paid' => 0,
                            'average_attendance' => 0,
                            'branch_wise' => [],
                        ];
                        break;
                    case 'cms_admin':
                        $breakdown['cms_admin'] = [
                            'total_users' => 0,
                            'total_roles' => 0,
                            'branch_wise' => [],
                        ];
                        break;
                }
            }
            
            $branchesQuery = DB::table('branches')->where('is_active', 1);
            if ($branchId) {
                $branchesQuery->where('code', $branchId);
            }
            $branches = $branchesQuery->get();
            
            foreach ($branches as $branch) {
                $loanData = $this->getBranchLoanData($branch->code, $dateFrom, $dateTo);
                $inventoryData = $this->getBranchInventoryData($branch->code, $dateFrom, $dateTo);
                $hrmsData = $this->getBranchHRMSData($branch->code, $dateFrom, $dateTo);
                $cmsData = $this->getBranchCMSData($branch->code, $dateFrom, $dateTo);
                
                // Loans breakdown
                $breakdown['loans']['branch_wise'][] = [
                    'branch' => $branch->name,
                    'applications' => $loanData['applications'],
                    'disbursements' => $loanData['disbursements'],
                    'collections' => $loanData['collections'],
                ];
                $breakdown['loans']['total_applications'] += $loanData['applications'];
                $breakdown['loans']['total_disbursements'] += $loanData['disbursements'];
                $breakdown['loans']['total_collections'] += $loanData['collections'];
                
                // Inventory breakdown
                $breakdown['inventory']['branch_wise'][] = [
                    'branch' => $branch->name,
                    'sales' => $inventoryData['sales'],
                    'purchases' => $inventoryData['purchases'],
                    'stock_value' => $inventoryData['stock_value'],
                ];
                $breakdown['inventory']['total_sales'] += $inventoryData['sales'];
                $breakdown['inventory']['total_purchases'] += $inventoryData['purchases'];
                $breakdown['inventory']['total_stock_value'] += $inventoryData['stock_value'];
                
                // HRMS breakdown
                $breakdown['hrms']['branch_wise'][] = [
                    'branch' => $branch->name,
                    'employees' => $hrmsData['employees'],
                    'salary_paid' => $hrmsData['salary_paid'],
                    'attendance_rate' => $hrmsData['attendance_rate'],
                ];
                $breakdown['hrms']['total_employees'] += $hrmsData['employees'];
                $breakdown['hrms']['total_salary_paid'] += $hrmsData['salary_paid'];
                
                // CMS breakdown
                $breakdown['cms_admin']['branch_wise'][] = [
                    'branch' => $branch->name,
                    'users' => $cmsData['users'],
                    'roles' => $cmsData['roles'],
                ];
                $breakdown['cms_admin']['total_users'] += $cmsData['users'];
                $breakdown['cms_admin']['total_roles'] += $cmsData['roles'];
            }
            
            // Calculate average attendance
            $totalBranches = count($branches);
            if ($totalBranches > 0) {
                $totalAttendance = array_sum(array_column($breakdown['hrms']['branch_wise'], 'attendance_rate'));
                $breakdown['hrms']['average_attendance'] = $totalAttendance / $totalBranches;
            }
            
            return $breakdown;
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getBranchPerformanceMetrics($branchCode, $dateFrom, $dateTo)
    {
        try {
            $financialData = $this->getBranchFinancialSummary($branchCode, $dateFrom, $dateTo);
            $loanData = $this->getBranchLoanData($branchCode, $dateFrom, $dateTo);
            $inventoryData = $this->getBranchInventoryData($branchCode, $dateFrom, $dateTo);
            $hrmsData = $this->getBranchHRMSData($branchCode, $dateFrom, $dateTo);
            
            return [
                'efficiency_score' => $this->calculateEfficiencyScore($financialData, $hrmsData),
                'growth_rate' => $this->calculateGrowthRate($branchCode, $dateFrom, $dateTo),
                'customer_satisfaction' => $this->calculateCustomerSatisfaction($loanData),
                'operational_metrics' => [
                    'revenue_per_employee' => $hrmsData['employees'] > 0 ? $financialData['revenue'] / $hrmsData['employees'] : 0,
                    'profit_per_employee' => $hrmsData['employees'] > 0 ? $financialData['profit'] / $hrmsData['employees'] : 0,
                    'loan_approval_rate' => $loanData['applications'] > 0 ? ($loanData['disbursements'] / $loanData['applications']) * 100 : 0,
                    'inventory_turnover' => $inventoryData['purchases'] > 0 ? $inventoryData['sales'] / $inventoryData['purchases'] : 0,
                ],
            ];
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getAvailableBranches()
    {
        try {
            return DB::table('branches')
                ->where('is_active', 1)
                ->select('id', 'code', 'name', 'address')
                ->get()
                ->map(function ($branch) {
                    return [
                        'id' => $branch->id,
                        'code' => $branch->code,
                        'name' => $branch->name,
                        'display_name' => $branch->name . ' (' . $branch->code . ')',
                    ];
                });
        } catch (\Exception $e) {
            return [];
        }
    }

    private function calculateEfficiencyScore($financialData, $hrmsData)
    {
        try {
            $profitMargin = $financialData['profit_margin'];
            $attendanceRate = $hrmsData['attendance_rate'];
            
            // Simple efficiency score calculation (0-100)
            $score = ($profitMargin * 0.6) + ($attendanceRate * 0.4);
            return min(100, max(0, $score));
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function calculateGrowthRate($branchCode, $dateFrom, $dateTo)
    {
        try {
            // Calculate growth compared to previous period
            $currentRevenue = $this->getLoanRevenue($branchCode, $dateFrom, $dateTo) + 
                            $this->getInventoryRevenue($branchCode, $dateFrom, $dateTo);
            
            // Get previous period (same duration)
            $periodDays = Carbon::parse($dateTo)->diffInDays(Carbon::parse($dateFrom));
            $prevDateTo = Carbon::parse($dateFrom)->subDay()->format('Y-m-d');
            $prevDateFrom = Carbon::parse($prevDateTo)->subDays($periodDays)->format('Y-m-d');
            
            $previousRevenue = $this->getLoanRevenue($branchCode, $prevDateFrom, $prevDateTo) + 
                             $this->getInventoryRevenue($branchCode, $prevDateFrom, $prevDateTo);
            
            if ($previousRevenue > 0) {
                return (($currentRevenue - $previousRevenue) / $previousRevenue) * 100;
            }
            
            return 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function calculateCustomerSatisfaction($loanData)
    {
        try {
            // Simple satisfaction score based on loan performance
            $applications = $loanData['applications'];
            $collections = $loanData['collections'];
            $overdue = $loanData['overdue_amount'] ?? 0;
            
            if ($applications > 0) {
                $approvalRate = ($loanData['disbursements'] / $applications) * 100;
                $collectionRate = $collections > 0 ? (($collections - $overdue) / $collections) * 100 : 100;
                
                return ($approvalRate * 0.4) + ($collectionRate * 0.6);
            }
            
            return 75; // Default satisfaction score
        } catch (\Exception $e) {
            return 0;
        }
    }
}