<?php

namespace App\Http\Controllers\Api\hrms;

use App\Http\Controllers\Controller;
use App\Models\hrms\Attendance;
use App\Models\hrms\Employee;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    private function getAdmin(Request $request)
    {
        return $request->user();
    }

    private function employeeScopeQuery(Request $request)
    {
        $admin = $this->getAdmin($request);
        return Employee::query()->forAdmin($admin);
    }

    private function canAccessEmployee(Request $request, string $employeeId): bool
    {
        return $this->employeeScopeQuery($request)->where('employee_id', $employeeId)->exists();
    }

    public function index(Request $request)
    {
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        $dateParam = $request->input('date', Carbon::today()->toDateString());
        
        // Use range if provided, otherwise use single date
        if ($fromDate && $toDate) {
            $startDate = Carbon::parse($fromDate)->toDateString();
            $endDate = Carbon::parse($toDate)->toDateString();
        } else {
            // Existing logic for single date
            if (in_array(strtolower($dateParam), ['tomorrow', 'yesterday', 'today'])) {
                $startDate = $endDate = Carbon::parse($dateParam)->toDateString();
            } else {
                $startDate = $endDate = $dateParam;
            }
        }

        $role = $request->input('role');
        $departmentId = $request->input('department_id');
        
        $employeesQuery = $this->employeeScopeQuery($request)
            ->with(['user', 'designation', 'department'])
            ->where('status', 'active');
        
        if ($role) {
            $employeesQuery->whereHas('user', function($q) use ($role) {
                $q->where('role', $role);
            });
        }

        if ($departmentId) {
            $employeesQuery->where('department_id', $departmentId);
        }
        
        $employees = $employeesQuery->get();
        
        $attendance = Attendance::whereBetween('date', [$startDate, $endDate])
            ->whereIn('employee_id', $employees->pluck('employee_id'))
            ->get()
            ->groupBy('date');
        
        // Optimize: Load leave requests for the range in one query
        $leaveRequests = \App\Models\hrms\LeaveRequest::where('status', 'approved')
            ->where('start_date', '<=', $endDate)
            ->where('end_date', '>=', $startDate)
            ->whereIn('employee_id', $employees->pluck('employee_id'))
            ->get();

        $result = [];

        // If it's a single date, maintain existing flat structure for compatibility
        if ($startDate === $endDate) {
            $date = $startDate;
            $attendanceForDate = $attendance->get($date, collect())->keyBy('employee_id');
            $leavesForDate = $leaveRequests->filter(function($lr) use ($date) {
                return $lr->start_date <= $date && $lr->end_date >= $date;
            })->keyBy('employee_id');

            $result = $employees->map(function($emp) use ($attendanceForDate, $date, $leavesForDate) {
                $att = $attendanceForDate->get($emp->employee_id);
                $onLeave = $leavesForDate->has($emp->employee_id);
                
                // Check if date is before joining date
                $isBeforeJoining = $emp->joining_date && $date < $emp->joining_date;

                return [
                    'id' => $emp->id,
                    'employee_id' => $emp->employee_id,
                    'employee_code' => $emp->employee_id,
                    'name' => $emp->first_name . ' ' . $emp->last_name,
                    'designation' => $emp->designation->name ?? null,
                    'department' => $emp->department->name ?? null,
                    'role' => $emp->user->role ?? null,
                    'attendance_id' => $att->id ?? null,
                    'status' => $isBeforeJoining ? 'not-joined' : ($att->status ?? ($onLeave ? 'on-leave' : null)),
                    'note' => $att->note ?? ($onLeave ? 'Approved leave' : ($isBeforeJoining ? 'Before Joining Date' : null)),
                    'date' => $date,
                    'on_leave' => $onLeave,
                    'joining_date' => $emp->joining_date
                ];
            });
        } else {
            // For range, return grouped or detailed data if needed by future UI
            // For now, keep it simple but include joining date check
            foreach ($employees as $emp) {
                $empRecords = [];
                for ($d = Carbon::parse($startDate); $d->lte(Carbon::parse($endDate)); $d->addDay()) {
                    $currDate = $d->toDateString();
                    $att = $attendance->get($currDate, collect())->where('employee_id', $emp->id)->first();
                    $onLeave = $leaveRequests->where('employee_id', $emp->id)
                        ->where('start_date', '<=', $currDate)
                        ->where('end_date', '>=', $currDate)
                        ->isNotEmpty();
                    
                    $isBeforeJoining = $emp->joining_date && $currDate < $emp->joining_date;

                    $empRecords[] = [
                        'date' => $currDate,
                        'status' => $isBeforeJoining ? 'not-joined' : ($att->status ?? ($onLeave ? 'on-leave' : null)),
                        'note' => $att->note ?? ($onLeave ? 'Approved leave' : ($isBeforeJoining ? 'Before Joining Date' : null)),
                    ];
                }
                $result[] = [
                    'employee_id' => $emp->id,
                    'name' => $emp->first_name . ' ' . $emp->last_name,
                    'joining_date' => $emp->joining_date,
                    'records' => $empRecords
                ];
            }
        }
        
        return response()->json($result);
    }

    public function markBulk(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'employee_id' => 'required', // Removed exists check since it could be ID or Employee_ID
            'status' => 'required|in:present,absent,half-day,late,on-leave,overtime',
            'note' => 'nullable|string',
        ]);
        
        $employeeId = $validated['employee_id'];
        
        // Find employee by either auto-increment ID or string employee_id
        $employee = Employee::query()
            ->forAdmin($this->getAdmin($request))
            ->where(function($q) use ($employeeId) {
                $q->where('id', $employeeId)->orWhere('employee_id', $employeeId);
            })
            ->first();

        if (!$employee) {
            return response()->json(['message' => 'Forbidden employee access or employee not found'], 403);
        }

        $attendance = Attendance::updateOrCreate(
            [
                'employee_id' => $employee->employee_id, // Use string employee_id for consistency
                'date' => $validated['date'],
            ],
            [
                'cms_admin_id' => $employee->cms_admin_id,
                'branch_id' => $employee->branch_id,
                'status' => $validated['status'],
                'note' => $validated['note'] ?? null,
            ]
        );
        
        return response()->json([
            'message' => 'Attendance marked successfully',
            'data' => $attendance
        ]);
    }

    public function markMultiple(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'employee_ids' => 'required|array',
            'status' => 'required|in:present,absent,half-day,late,on-leave,overtime',
            'note' => 'nullable|string',
        ]);
        
        $results = [];
        foreach ($validated['employee_ids'] as $idInput) {
            $employee = Employee::query()
                ->forAdmin($this->getAdmin($request))
                ->where(function($q) use ($idInput) {
                    $q->where('id', $idInput)->orWhere('employee_id', $idInput);
                })
                ->first();

            if (!$employee) {
                continue;
            }

            $attendance = Attendance::updateOrCreate(
                [
                    'employee_id' => $employee->employee_id, // Use string employee_id
                    'date' => $validated['date'],
                ],
                [
                    'admin_user_id' => $employee->admin_user_id,
                    'branch_id' => $employee->branch_id,
                    'status' => $validated['status'],
                    'note' => $validated['note'] ?? null,
                ]
            );
            $results[] = $attendance;
        }
        
        return response()->json([
            'message' => count($results) . ' attendance records marked successfully',
            'data' => $results
        ]);
    }

    public function store(Request $request)
    {
        $employeeId = $request->input('employee_id');
        if (!$employeeId || !$this->canAccessEmployee($request, $employeeId)) {
            return response()->json(['status' => 'error', 'message' => 'Forbidden employee access'], 403);
        }
        $employee = Employee::where('employee_id', $employeeId)->firstOrFail();
        $payload = $request->only([
            'employee_id', 'leave_request_id', 'date', 'clock_in', 'clock_out',
            'status', 'note', 'remarks', 'total_hours',
        ]);
        $payload['employee_id'] = $employee->employee_id;
        $payload['cms_admin_id'] = $employee->cms_admin_id;
        $payload['branch_id'] = $employee->branch_id;
        $attendance = Attendance::create($payload);
        return response()->json([
            'status' => 'success',
            'data' => $attendance,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $attendance = Attendance::query()
            ->where('id', $id)
            ->whereHas('employee', function ($q) use ($request) {
                $q->forAdmin($this->getAdmin($request));
            })
            ->firstOrFail();
        $attendance->update($request->only([
            'clock_in', 'clock_out', 'status', 'note', 'remarks', 'total_hours',
        ]));
        return response()->json([
            'status' => 'success',
            'data' => $attendance,
        ]);
    }

    public function report(Request $request)
    {
        $admin = $this->getAdmin($request);
        $fromDate = $request->input('from_date', Carbon::now()->startOfMonth()->toDateString());
        $toDate = $request->input('to_date', Carbon::now()->endOfMonth()->toDateString());
        
        $employees = Employee::query()
            ->forAdmin($admin)
            ->with(['designation', 'department', 'branch'])
            ->where('status', 'active')
            ->get();
            
        $employeeIds = $employees->pluck('employee_id');
        
        $attendanceData = Attendance::whereIn('employee_id', $employeeIds)
            ->whereBetween('date', [$fromDate, $toDate])
            ->get()
            ->groupBy('employee_id');
            
        $leaveRequests = \App\Models\hrms\LeaveRequest::whereIn('employee_id', $employeeIds)
            ->where('status', 'approved')
            ->where('start_date', '<=', $toDate)
            ->where('end_date', '>=', $fromDate)
            ->get()
            ->groupBy('employee_id');

        $report = $employees->map(function($emp) use ($attendanceData, $leaveRequests, $fromDate, $toDate) {
            $empAttendance = $attendanceData->get($emp->employee_id, collect());
            $empLeaves = $leaveRequests->get($emp->employee_id, collect());
            
            $summary = [
                'present' => 0,
                'absent' => 0,
                'late' => 0,
                'half_day' => 0,
                'on_leave' => 0,
                'overtime' => 0,
                'total_working_days' => 0,
                'not_joined' => 0
            ];
            
            $start = Carbon::parse($fromDate);
            $end = Carbon::parse($toDate);
            
            for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
                $dateStr = $date->toDateString();
                
                if ($emp->joining_date && $dateStr < $emp->joining_date) {
                    $summary['not_joined']++;
                    continue;
                }
                
                if ($date->isSunday()) {
                    continue; // Skip sundays from working days count for now
                }
                
                $summary['total_working_days']++;
                
                $att = $empAttendance->where('date', $dateStr)->first();
                if ($att) {
                    $status = str_replace('-', '_', $att->status);
                    if (isset($summary[$status])) {
                        $summary[$status]++;
                    } else {
                        $summary['present']++; // Fallback
                    }
                } else {
                    // Check if on leave
                    $onLeave = $empLeaves->filter(function($lr) use ($dateStr) {
                        return $lr->start_date <= $dateStr && $lr->end_date >= $dateStr;
                    })->isNotEmpty();
                    
                    if ($onLeave) {
                        $summary['on_leave']++;
                    } else {
                        $summary['absent']++;
                    }
                }
            }
            
            return [
                'employee_id' => $emp->id,
                'employee_code' => $emp->employee_id,
                'name' => $emp->first_name . ' ' . $emp->last_name,
                'department' => $emp->department->name ?? 'N/A',
                'designation' => $emp->designation->name ?? 'N/A',
                'joining_date' => $emp->joining_date,
                'summary' => $summary
            ];
        });
        
        return response()->json([
            'status' => 'success',
            'data' => $report,
            'meta' => [
                'from_date' => $fromDate,
                'to_date' => $toDate
            ]
        ]);
    }
}
