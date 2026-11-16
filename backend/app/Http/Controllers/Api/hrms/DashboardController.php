<?php

namespace App\Http\Controllers\Api\hrms;

use App\Http\Controllers\Controller;
use App\Models\hrms\Employee;
use App\Models\hrms\LeaveRequest;
use App\Models\hrms\Attendance;
use App\Models\hrms\Salary;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $isEmployee = $user instanceof Employee;
            $today = Carbon::today()->toDateString();
            
            // Shared Logic for Admin Branch Filtering
            $branchId = null;
            $departmentId = null;
            $adminUserId = null;

            if (!$isEmployee) {
                // For regular User model, check if branch property exists
                $branchId = null;
                if (isset($user->branch)) {
                    $branchId = $user->branch;
                } elseif (isset($user->branch_id)) {
                    $branchId = $user->branch_id;
                }
                
                $departmentId = $user->department_id ?? $user->department ?? null;
                $adminUserId  = $user->user_id ?? null;
            }

            if ($isEmployee) {
                // Employee specific dashboard
                $employeeId = $user->employee_id;
                
                // For Employees, we still want to ensure they belong to the correct admin context if needed,
                // but usually, an employee is a single record.
                
                $pendingLeaves = LeaveRequest::where('employee_id', $employeeId)
                    ->where('status', 'pending')
                    ->where('is_deleted', 0)
                    ->count();
                
                $totalLeavesTaken = LeaveRequest::where('employee_id', $employeeId)
                    ->where('status', 'approved')
                    ->where('is_deleted', 0)
                    ->sum('total_days');

                $lastSalary = Salary::where('employee_id', $employeeId)
                    ->orderBy('month', 'desc')
                    ->first();

                $presentThisMonth = Attendance::where('employee_id', $employeeId)
                    ->whereMonth('date', Carbon::now()->month)
                    ->whereYear('date', Carbon::now()->year)
                    ->where('status', 'present')
                    ->count();

                return response()->json([
                    'status' => 'success',
                    'data' => [
                        'stats' => [
                            'pending_leaves' => $pendingLeaves,
                            'total_leaves_taken' => $totalLeavesTaken,
                            'last_salary' => $lastSalary ? $lastSalary->net_pay : 0,
                            'present_this_month' => $presentThisMonth,
                        ],
                        'employee_profile' => $user->load([
                            'designation', 
                            'department', 
                            'branch', 
                            'personalDetail', 
                            'addresses', 
                            'bankDetails',
                            'documents',
                            'leaveBalances.leaveType:id,name',
                            'salaryStructure'
                        ]),
                        'charts' => [
                            'attendance_trend' => $this->getEmployeeAttendanceTrend($employeeId),
                            'leave_stats' => [
                                ['name' => 'Used', 'value' => $totalLeavesTaken],
                                ['name' => 'Remaining', 'value' => max(0, ($user->sick_leave_days + $user->casual_leave_days) - $totalLeavesTaken)],
                            ]
                        ]
                    ]
                ]);
            }

            // Admin Dashboard
            $totalEmployeesQuery = Employee::query()->where('status', 'active')->where('is_deleted', 0);
            
            // Apply unique Admin segregation if applicable
            if ($adminUserId) {
                // Remove prefix lookup if already string
                $totalEmployeesQuery->where('admin_user_id', $adminUserId);
            }

            $onLeaveTodayQuery = LeaveRequest::query()->where('status', 'approved')
                ->where('start_date', '<=', $today)
                ->where('end_date', '>=', $today)
                ->where('is_deleted', 0);
            
            $presentTodayQuery = Attendance::query()->where('date', $today)
                ->where('status', 'present');

            $pendingLeavesQuery = LeaveRequest::query()->where('status', 'pending')->where('is_deleted', 0);
            
            $monthlyPayrollQuery = Salary::query()->where('month', 'like', Carbon::now()->format('Y-m') . '%')
                ->where('is_deleted', 0);

            $monthlySalaryCostsQuery = Salary::query()->where('month', 'like', Carbon::now()->year . '-%')
                ->where('is_deleted', 0);

            // Apply Branch & Department Filters for Admin
            if ($branchId || $adminUserId) {
                // Employees have branch_id, other tables have employee_id
                $empFilterQuery = Employee::query()->where('status', 'active')->where('is_deleted', 0);
                if ($branchId) {
                    $empFilterQuery->where('branch_id', $branchId);
                }
                if ($adminUserId) {
                    $empFilterQuery->where('admin_user_id', $adminUserId);
                }
                
                $employeeIds = $empFilterQuery->pluck('employee_id')->toArray();
                
                if ($branchId) {
                    $totalEmployeesQuery->where('branch_id', $branchId);
                }
                
                if (!empty($employeeIds)) {
                    $onLeaveTodayQuery->whereIn('employee_id', $employeeIds);
                    $presentTodayQuery->whereIn('employee_id', $employeeIds);
                    $pendingLeavesQuery->whereIn('employee_id', $employeeIds);
                    $monthlyPayrollQuery->whereIn('employee_id', $employeeIds);
                    $monthlySalaryCostsQuery->whereIn('employee_id', $employeeIds);
                } else {
                    // Force zero results if no employees match branch/admin
                    $onLeaveTodayQuery->whereRaw('1 = 0');
                    $presentTodayQuery->whereRaw('1 = 0');
                    $pendingLeavesQuery->whereRaw('1 = 0');
                    $monthlyPayrollQuery->whereRaw('1 = 0');
                    $monthlySalaryCostsQuery->whereRaw('1 = 0');
                }
            }

            // Execute Queries
            $totalEmployees = $totalEmployeesQuery->count();
            $onLeaveToday = $onLeaveTodayQuery->count();
            $presentToday = $presentTodayQuery->count();
            $pendingLeaves = $pendingLeavesQuery->count();
            $monthlyPayroll = $monthlyPayrollQuery->sum('net_pay');
            
            $monthlySalaryCosts = $monthlySalaryCostsQuery->selectRaw('month, SUM(net_pay) as total')
                ->groupBy('month')
                ->orderBy('month', 'asc')
                ->get();
            
            // Charts: Attendance Trend
            // $attendanceTrend = $this->getAdminAttendanceTrend($branchId, $adminUserId);

            // Log for debugging if data is empty but branchId is set
            if ($totalEmployees == 0 && ($branchId || $adminUserId)) {
                $checkType = $branchId ? "Branch ID: $branchId" : "Admin User ID: $adminUserId";
                \Log::warning("No employees found for $checkType. Check if branch identifier matches across User and Employee tables.");
            }

            $recentActivities = $this->getRecentActivities($branchId, $adminUserId);

            return response()->json([
                'status' => 'success',
                'data' => [
                    'stats' => [
                        'total_employees' => $totalEmployees,
                        'on_leave_today' => $onLeaveToday,
                        'present_today' => $presentToday,
                        'pending_leaves' => $pendingLeaves,
                        'monthly_payroll' => $monthlyPayroll,
                    ],
                    'recent_activities' => $recentActivities,
                    'salary_costs' => $monthlySalaryCosts,
                    'charts' => [
                        'department_distribution' => $this->getDepartmentDistribution($branchId, $adminUserId),
                        'attendance_overview' => $this->getWeeklyAttendanceOverview($branchId, $adminUserId),
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    private function getEmployeeAttendanceTrend($employeeId)
    {
        $data = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $status = Attendance::where('employee_id', $employeeId)
                ->where('date', $date->toDateString())
                ->value('status');
            
            $data[] = [
                'day' => $date->format('D'),
                'present' => $status === 'present' ? 1 : 0,
                'absent' => $status === 'absent' ? 1 : 0,
            ];
        }
        return $data;
    }

    private function getDepartmentDistribution($branchId = null, $adminUserId = null)
    {
        $query = Employee::join('hrms_departments', 'hrms_employees.department_id', '=', 'hrms_departments.id')
            ->selectRaw('hrms_departments.name, COUNT(*) as value')
            ->where('hrms_employees.is_deleted', 0)
            ->where('hrms_employees.status', 'active')
            ->groupBy('hrms_departments.name');

        if ($branchId) {
            $query->where('hrms_employees.branch_id', $branchId);
        }

        if ($adminUserId) {
            $query->where('hrms_employees.admin_user_id', $adminUserId);
        }

        return $query->get();
    }

    private function getWeeklyAttendanceOverview($branchId = null, $adminUserId = null)
    {
        $data = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $query = Attendance::where('date', $date->toDateString())
                ->where('status', 'present');

            if ($branchId || $adminUserId) {
                $employeeQuery = Employee::query();
                if ($branchId) $employeeQuery->where('branch_id', $branchId);
                if ($adminUserId) $employeeQuery->where('admin_user_id', $adminUserId);
                
                $employeeIds = $employeeQuery->pluck('employee_id');
                $query->whereIn('employee_id', $employeeIds);
            }

            $presentCount = $query->count();
            
            $data[] = [
                'day' => $date->format('D'),
                'present' => $presentCount,
            ];
        }
        return $data;
    }

    private function getRecentActivities($branchId = null, $adminUserId = null)
    {
        // Combine recent employee additions, leave requests etc.
        $leaveQuery = LeaveRequest::with(['employee.user', 'employee.designation'])
            ->where('is_deleted', 0)
            ->orderBy('created_at', 'desc')
            ->limit(10);

        if ($branchId || $adminUserId) {
            $employeeQuery = Employee::query();
            if ($branchId) $employeeQuery->where('branch_id', $branchId);
            if ($adminUserId) $employeeQuery->where('admin_user_id', $adminUserId);
            
            $employeeIds = $employeeQuery->pluck('id');
            $leaveQuery->whereIn('employee_id', $employeeIds);
        }

        $recentLeaves = $leaveQuery->get()
            ->map(function($leave) {
                return [
                    'type' => 'leave',
                    'title' => 'New Leave Request',
                    'description' => ($leave->employee->first_name ?? 'Employee') . ' ' . ($leave->employee->last_name ?? '') . ' requested ' . $leave->leave_category . ' leave for ' . $leave->total_days . ' days.',
                    'time' => $leave->created_at->diffForHumans(),
                    'created_at_raw' => $leave->created_at,
                ];
            });

        $empListQuery = Employee::with(['user', 'designation'])
            ->where('is_deleted', 0)
            ->orderBy('created_at', 'desc')
            ->limit(10);

        if ($branchId) $empListQuery->where('branch_id', $branchId);
        if ($adminUserId) $empListQuery->where('admin_user_id', $adminUserId);

        $recentEmployees = $empListQuery->get()
            ->map(function($emp) {
                return [
                    'type' => 'employee',
                    'title' => 'New Employee Joined',
                    'description' => ($emp->first_name ?? 'Employee') . ' ' . ($emp->last_name ?? '') . ' joined as ' . ($emp->designation->name ?? 'Staff') . '.',
                    'time' => $emp->created_at->diffForHumans(),
                    'created_at_raw' => $emp->created_at,
                ];
            });

        return $recentLeaves->concat($recentEmployees)->sortByDesc(function($activity) {
            return Carbon::parse($activity['created_at_raw']);
        })->values()->take(10);
    }
}
