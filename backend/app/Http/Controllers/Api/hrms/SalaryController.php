<?php

namespace App\Http\Controllers\Api\hrms;

use App\Http\Controllers\Controller;
use App\Models\hrms\Salary;
use App\Models\hrms\SalaryStructure;
use App\Models\hrms\Employee;
use App\Models\hrms\Attendance;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Exception;

class SalaryController extends Controller
{
    // Salary Structures
    public function getSalaryStructures()
    {
        try {
            $structures = SalaryStructure::with('employee:employee_id,first_name,last_name,email,employee_id')
                ->where('is_deleted', 0)
                ->paginate(20);
            return response()->json(['status' => 'success', 'data' => $structures], 200);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function calculatePayroll(Request $request)
    {
        try {
            $monthStr = $request->input('month'); // YYYY-MM
            $month = Carbon::parse($monthStr);
            $daysInMonth = $month->daysInMonth;

            $employees = Employee::with(['salaryStructure'])->where('status', 'active')->get();
            $payrollData = [];

            foreach ($employees as $employee) {
                // Calculate attendance
                $attendance = Attendance::where('employee_id', $employee->employee_id)
                    ->whereYear('date', $month->year)
                    ->whereMonth('date', $month->month)
                    ->get();

                $presentDays = $attendance->whereIn('status', ['present', 'overtime'])->count();
                $leaveDays = $attendance->where('status', 'leave')->count();
                
                // Calculate sundays in the month
                $sundays = 0;
                for ($d = 1; $d <= $daysInMonth; $d++) {
                    $date = Carbon::create($month->year, $month->month, $d);
                    if ($date->isSunday()) {
                        $sundays++;
                    }
                }

                // Absent days calculation: Total days - (Present + Leaves + Sundays)
                // This ensures Sundays are treated as paid/not-absent even if no attendance record exists
                $recordedAbsent = $attendance->where('status', 'absent')->count();
                
                // If there's no attendance record for a non-sunday, it's typically considered absent in payroll
                // but for your calculation we will use logic where ONLY recorded absents or gap days except sundays are counted
                $absentDays = $daysInMonth - ($presentDays + $leaveDays + $sundays);
                $absentDays = max(0, $absentDays); // Should not be negative

                // Get salary structure or use basic_salary from employee
                $basicSalary = $employee->basic_salary ?? 0;
                $allowances = 0;
                $deductions = 0;

                if ($employee->salaryStructure) {
                    $struct = $employee->salaryStructure;
                    $basicSalary = $struct->basic_salary ?: $basicSalary;
                    $allowances = (float)($struct->house_rent_allowance + $struct->medical_allowance + 
                                 $struct->transport_allowance + $struct->other_allowance);
                    $deductions = (float)($struct->provident_fund + $struct->tax_deduction + $struct->other_deduction);
                }

                // Daily rate based on basic salary (simple calculation)
                $dailyRate = $daysInMonth > 0 ? ($basicSalary / $daysInMonth) : 0;
                
                // Actual Basic Pay for present days (+ leaves if paid + Sundays)
                $payableDays = $presentDays + $leaveDays + $sundays;
                $actualBasicPay = $dailyRate * $payableDays;
                
                $netPay = ($actualBasicPay + $allowances) - $deductions;

                $payrollData[] = [
                    'id' => $employee->id,
                    'employee_id' => $employee->employee_id,
                    'employee_name' => $employee->first_name . ' ' . $employee->last_name,
                    'month' => $monthStr,
                    'total_working_days' => $daysInMonth,
                    'present_days' => $presentDays,
                    'absent_days' => $absentDays,
                    'leave_days' => $leaveDays,
                    'off_days' => $sundays,
                    'basic_pay' => round($actualBasicPay, 2),
                    'allowances' => round($allowances, 2),
                    'deductions' => round($deductions, 2),
                    'net_pay' => round($netPay, 2),
                ];
            }

            return response()->json([
                'status' => 'success',
                'data' => $payrollData
            ], 200);

        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function upsertSalaryStructure(Request $request)
    {
        try {
            $structure = SalaryStructure::updateOrCreate(
                ['employee_id' => $request->employee_id],
                $request->all()
            );
            return response()->json(['status' => 'success', 'data' => $structure], 200);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // Salaries (Monthly Payouts)
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $monthParam = $request->input('month'); // Expects YYYY-MM
            $fromDate = $request->input('from_date'); // YYYY-MM-DD
            $toDate = $request->input('to_date');     // YYYY-MM-DD
            
            // 1. Determine the target month (fallback for backward compatibility)
            $targetMonth = $monthParam ?: now()->format('Y-m');
            $currentMonth = now()->format('Y-m');

            // 2. Restrict checking future months AND CURRENT MONTH for salary data
            $isEmployeeUser = ($user instanceof Employee)
                || $request->header('User-Type') === 'employee'
                || (isset($user->role) && $user->role === 'employee');

            if ($isEmployeeUser) {
                if ($targetMonth >= $currentMonth) {
                    return response()->json([
                        'status' => 'success',
                        'message' => 'Salary details for the current month are not yet available.',
                        'data' => [],
                        'meta' => [
                            'selected_month' => $targetMonth,
                            'current_month' => $currentMonth,
                            'is_past_month' => false
                        ]
                    ], 200);
                }
            } else if ($targetMonth > now()->addMonth()->format('Y-m')) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cannot view salary details for the distant future.',
                    'data' => []
                ], 403);
            }

            // 3. Get all employees for the branch/admin
            $query = Employee::query()
                ->forAdmin($user)
                ->where('is_deleted', 0)
                ->select(['id', 'employee_id', 'first_name', 'last_name', 'email', 'basic_salary', 'joining_date', 'status', 'designation_id', 'department_id'])
                ->with(['designation:id,name', 'department:id,name', 'salaryStructure', 'bankDetails', 'personalDetail']);

            // Only filter by joining date if it's NOT an employee viewing. 
            // Employees should see past months records even if the records are technically "before" their current hire date record (as requested).
            // However, they still shouldn't see records for future months (handled above).
            if (!($user instanceof Employee || $request->header('User-Type') === 'employee' || (isset($user->role) && $user->role === 'employee'))) {
                $query->where('joining_date', '<=', Carbon::parse($targetMonth)->endOfMonth()->toDateString());
            }

            if ($request->boolean('all')) {
                $employees = $query->get();
            } else {
                // Apply department filter to the query before fetching/paginating
                if ($request->has('department_id') && !empty($request->department_id)) {
                    $query->where('department_id', $request->department_id);
                }
                $employees = $query->paginate($request->input('per_page', 25))->getCollection();
            }

            // 4. Get existing salary records for the target month or date range
            $displayTargetMonth = Carbon::parse($targetMonth)->format('F Y');

            $salaryQuery = Salary::where('is_deleted', 0)
                ->whereIn('employee_id', $employees->pluck('employee_id'));

            if ($fromDate && $toDate) {
                // If date range provided, filter salaries by payment_date or month mapping
                $salaryQuery->whereBetween('payment_date', [$fromDate, $toDate]);
            } else {
                $salaryQuery->where(function($q) use ($targetMonth, $displayTargetMonth) {
                    $q->where('month', $targetMonth)
                      ->orWhere('month', $displayTargetMonth);
                });
            }

            $salaries = $salaryQuery->get()->keyBy('employee_id');

            // 4.5 Get Live Attendance Summary
            $targetDate = Carbon::parse($targetMonth);
            $daysInMonth = $targetDate->daysInMonth;
            
            $isCurrentMonth = $targetMonth === now()->format('Y-m');
            $endDayToCount = $isCurrentMonth ? now()->day : $daysInMonth;

            $attendanceQuery = Attendance::whereIn('employee_id', $employees->pluck('employee_id'));
            
            if ($fromDate && $toDate) {
                $attendanceQuery->whereBetween('date', [$fromDate, $toDate]);
                $rangeStart = Carbon::parse($fromDate);
                $rangeEnd = Carbon::parse($toDate);
                $daysInRange = $rangeStart->diffInDays($rangeEnd) + 1;
                $endDayToCount = $daysInRange;
                
                // Recalculate Sundays for range
                $sundays = 0;
                for ($d = 0; $d < $daysInRange; $d++) {
                    if ($rangeStart->copy()->addDays($d)->isSunday()) $sundays++;
                }
            } else {
                $attendanceQuery->whereYear('date', $targetDate->year)
                    ->whereMonth('date', $targetDate->month);
                
                $sundays = 0;
                for ($d = 1; $d <= $endDayToCount; $d++) {
                    if (Carbon::create($targetDate->year, $targetDate->month, $d)->isSunday()) $sundays++;
                }
            }

            $liveAttendance = $attendanceQuery->get()->groupBy('employee_id');

            // 5. Merge data
            $result = $employees->map(function($emp) use ($salaries, $targetMonth, $liveAttendance, $endDayToCount, $sundays) {
                $payout = $salaries->get($emp->employee_id);
                $attRecords = $liveAttendance->get($emp->employee_id) ?? collect();
                
                $present = $payout ? $payout->present_days : $attRecords->where('status', 'present')->count();
                $leaves  = $payout ? $payout->leave_days   : $attRecords->where('status', 'on-leave')->count();
                $recordedAbsents = $attRecords->where('status', 'absent')->count();

                $calculatedAbsents = max(0, $endDayToCount - ($present + $leaves + $sundays));
                $absent = $payout ? $payout->absent_days : max($recordedAbsents, $calculatedAbsents);

                return [
                    'id' => $emp->id,
                    'employee_id' => $emp->employee_id,
                    'employee_code' => $emp->employee_id,
                    'name' => $emp->first_name . ' ' . $emp->last_name,
                    'first_name' => $emp->first_name,
                    'last_name' => $emp->last_name,
                    'designation' => $emp->designation->name ?? 'N/A',
                    'department' => $emp->department->name ?? 'N/A',
                    
                    // Extra Employee Details
                    'email' => $emp->email,
                    'bank_details' => $emp->bankDetails,
                    'personal_details' => [
                        'aadhaar_number' => $emp->personalDetail->aadhaar_number ?? 'N/A',
                        'pan_number' => $emp->personalDetail->pan_number ?? 'N/A'
                    ],

                    'present_days' => $present,
                    'total_working_days' => $endDayToCount,
                    'payout_id' => $payout->payout_id ?? $payout->salary_id ?? null,
                    'salary_db_id' => $payout->id ?? null,
                    'attendance' => [
                        'present' => $present,
                        'absent' => $absent,
                        'leaves' => $leaves,
                        'off_days' => $payout->off_days ?? $sundays,
                        'total_days' => $endDayToCount,
                        'display' => "{$present}/{$endDayToCount}" 
                    ],
                  
                    'basic_salary' => (float)($emp->salaryStructure->basic_salary ?? $emp->basic_salary ?? 0),
                    'net_pay' => (float)($payout->net_pay ?? 0),
                    'status' => $payout->status ?? 'unpaid',
                    'method' => $payout->payment_method ?? null,
                    'month' => $payout->month ?? $targetMonth,
                    'payment_date' => $payout->payment_date ?? null
                ];
            });

            // 6. Apply Search and Status Filters
            $searchTerm = strtolower($request->input('search', ''));
            $statusFilter = strtolower($request->input('status', ''));

            $filteredResult = $result->filter(function($row) use ($searchTerm, $statusFilter) {
                if ($searchTerm) {
                    $match = str_contains(strtolower($row['employee_code']), $searchTerm) ||
                             str_contains(strtolower($row['name']), $searchTerm) ||
                             str_contains(strtolower($row['designation']), $searchTerm);
                    if (!$match) return false;
                }

                if ($statusFilter && $statusFilter !== 'all') {
                    if (strtolower($row['status']) !== $statusFilter) return false;
                }

                return true;
            })->values();

            return response()->json([
                'status' => 'success',
                'data' => $filteredResult,
                'meta' => [
                    'selected_month' => $targetMonth,
                    'from_date' => $fromDate,
                    'to_date' => $toDate,
                    'is_default' => empty($monthParam) && empty($fromDate),
                    'total' => count($filteredResult),
                    'search' => $searchTerm,
                    'status_filter' => $statusFilter
                ]
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function generateSalary(Request $request)
    {
        try {
            $admin = $request->user();
            $data = $request->all();
            
            // Link to the admin who created this record using cms_admin
            if ($admin && !($admin instanceof Employee)) {
                $data['cms_admin_id'] = $admin->cms_admin ?? $admin->user_id;
            }

            // Fix: Capture the employee's branch_id automatically
            if (!empty($data['employee_id'])) {
                $employee = Employee::find($data['employee_id']);
                if ($employee) {
                    $data['branch_id'] = $employee->branch_id;
                    if (empty($data['cms_admin_id'])) {
                        $data['cms_admin_id'] = $employee->cms_admin_id;
                    }
                }
            }

            $salary = Salary::create($data);
            
            return response()->json([
                'status' => 'success',
                'message' => 'Salary record generated successfully',
                'data' => $salary,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function updateStatus(Request $request, $id)
    {
        try {
            $admin = $request->user();
            $salary = Salary::query()->forAdmin($admin)->findOrFail($id);
            $salary->update($request->all());
            
            return response()->json([
                'status' => 'success',
                'message' => 'Salary payout status updated',
                'data' => $salary,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Status update failed or unauthorized',
            ], 500);
        }
    }

    public function show(Request $request, $id)
    {
        try {
            $admin = $request->user();
            $salary = Salary::query()
                ->forAdmin($admin)
                ->with(['employee.user', 'employee.designation'])
                ->findOrFail($id);
                
            return response()->json([
                'status' => 'success',
                'data' => $salary,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Salary record not found or unauthorized',
            ], 404);
        }
    }
}
