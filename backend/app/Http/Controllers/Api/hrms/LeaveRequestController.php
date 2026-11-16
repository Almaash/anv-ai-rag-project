<?php

namespace App\Http\Controllers\Api\Hrms;

use App\Http\Controllers\Controller;
use App\Models\hrms\LeaveRequest;
use App\Models\hrms\Employee;
use App\Models\hrms\Attendance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LeaveRequestController extends Controller
{
    private function getAdmin(Request $request)
    {
        return $request->user();
    }

    private function scopedEmployeeQuery(Request $request)
    {
        return Employee::query()->forAdmin($this->getAdmin($request));
    }

    private function scopedLeaveRequestQuery(Request $request)
    {
        $user = $this->getAdmin($request);
        if ($user instanceof Employee) {
            return LeaveRequest::query()->where('employee_id', $user->employee_id);
        }

        return LeaveRequest::query()->whereHas('employee', function ($q) use ($request) {
            $q->forAdmin($this->getAdmin($request));
        });
    }

    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $isEmployee = $user instanceof Employee;
            $perPage = min((int) $request->input('per_page', 15), 100);
            $search = $request->input('search');

            $query = $this->scopedLeaveRequestQuery($request)
                ->with(['employee:employee_id,first_name,last_name,employee_id', 'leaveType:leave_type_id,name', 'approvedBy:id,name'])
                ->where('is_deleted', 0);

            if ($isEmployee) {
                $query->where('employee_id', $user->employee_id);
            } elseif ($request->employee_id) {
                if ($this->scopedEmployeeQuery($request)->where('employee_id', $request->employee_id)->exists()) {
                    $query->where('employee_id', $request->employee_id);
                } else {
                    return response()->json(['message' => 'Forbidden employee access'], 403);
                }
            }

            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->whereHas('employee', function($eq) use ($search) {
                        $eq->where('first_name', 'like', "%{$search}%")
                           ->orWhere('last_name', 'like', "%{$search}%")
                           ->orWhere('employee_id', 'like', "%{$search}%");
                    })->orWhere('reason', 'like', "%{$search}%");
                });
            }

            if ($request->status) {
                $query->where('status', $request->status);
            }

            $paginated = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'data'   => $paginated->items(),
                'meta'   => [
                    'current_page' => $paginated->currentPage(),
                    'last_page'    => $paginated->lastPage(),
                    'per_page'     => $paginated->perPage(),
                    'total'        => $paginated->total(),
                ],
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $isEmployee = $user instanceof \App\Models\hrms\Employee;

        // Map numeric IDs from frontend to custom string IDs
        if ($request->has('employee_id') && is_numeric($request->employee_id)) {
            $emp = Employee::find($request->employee_id);
            if ($emp) {
                $request->merge(['employee_id' => $emp->employee_id]);
            }
        }

        if ($request->has('leave_type_id') && is_numeric($request->leave_type_id)) {
            $lt = \App\Models\hrms\LeaveType::find($request->leave_type_id);
            if ($lt) {
                $request->merge(['leave_type_id' => $lt->leave_type_id]);
            }
        }

        $validated = $request->validate([
            'employee_id' => $isEmployee ? 'nullable' : 'required|exists:hrms_employees,employee_id',
            'leave_type_id' => 'required|exists:hrms_leave_types,leave_type_id',
            'leave_category' => 'required|in:sick,casual,maternity,paid',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'nullable|string',
        ]);

        $employeeId = $isEmployee ? $user->employee_id : $request->employee_id;
        $employee = $this->scopedEmployeeQuery($request)->where('employee_id', $employeeId)->firstOrFail();
        
        $startDate = Carbon::parse($validated['start_date']);
        $endDate = Carbon::parse($validated['end_date']);
        $totalDays = $startDate->diffInDays($endDate) + 1;

        $leaveCategory = $validated['leave_category'];
        $isPaidLeave = false;

        if ($leaveCategory !== 'paid') {
            $availableLeaves = $employee->{$leaveCategory . '_leave_days'};
            
            if ($availableLeaves < $totalDays) {
                $isPaidLeave = true;
                $leaveCategory = 'paid';
            }
        } else {
            $isPaidLeave = true;
        }

        $leaveRequest = LeaveRequest::create([
            'cms_admin_id' => $employee->cms_admin_id,
            'branch_id' => $employee->branch_id,
            'employee_id' => $employee->employee_id,
            'leave_type_id' => $validated['leave_type_id'],
            'leave_category' => $leaveCategory,
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'total_days' => $totalDays,
            'is_paid_leave' => $isPaidLeave,
            'reason' => $validated['reason'] ?? null,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Leave request created successfully',
            'data' => $leaveRequest->load(['employee', 'leaveType'])
        ], 201);
    }

    public function show($id)
    {
        $leaveRequest = $this->scopedLeaveRequestQuery(request())
            ->with(['employee', 'leaveType', 'approvedBy', 'attendances'])
            ->where('is_deleted', 0)
            ->findOrFail($id);

        return response()->json($leaveRequest);
    }

    public function approve(Request $request, $id)
    {
        $validated = $request->validate([
            'remarks' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $leaveRequest = $this->scopedLeaveRequestQuery($request)->findOrFail($id);
            
            if ($leaveRequest->status !== 'pending') {
                return response()->json(['message' => 'Leave request already processed'], 400);
            }

            $employee = Employee::where('employee_id', $leaveRequest->employee_id)->firstOrFail();

            if (!$leaveRequest->is_paid_leave) {
                $leaveField = $leaveRequest->leave_category . '_leave_days';
                
                if ($employee->$leaveField < $leaveRequest->total_days) {
                    return response()->json(['message' => 'Insufficient leave balance'], 400);
                }

                $employee->$leaveField -= $leaveRequest->total_days;
                $employee->save();
            }

            $leaveRequest->update([
                'status' => 'approved',
                'approved_by' => $request->user() instanceof \App\Models\User ? $request->user()->id : null,
                'remarks' => $validated['remarks'] ?? null,
            ]);

            $this->createAttendanceRecords($leaveRequest);

            DB::commit();

            return response()->json([
                'message' => 'Leave request approved successfully',
                'data' => $leaveRequest->load(['employee', 'leaveType', 'approvedBy'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to approve leave request', 'error' => $e->getMessage()], 500);
        }
    }

    public function reject(Request $request, $id)
    {
        $validated = $request->validate([
            'remarks' => 'required|string',
        ]);

        $leaveRequest = $this->scopedLeaveRequestQuery($request)->findOrFail($id);
        
        if ($leaveRequest->status !== 'pending') {
            return response()->json(['message' => 'Leave request already processed'], 400);
        }

        $leaveRequest->update([
            'status' => 'rejected',
            'approved_by' => $request->user() instanceof \App\Models\User ? $request->user()->id : null,
            'remarks' => $validated['remarks'],
        ]);

        return response()->json([
            'message' => 'Leave request rejected successfully',
            'data' => $leaveRequest->load(['employee', 'leaveType', 'approvedBy'])
        ]);
    }

    public function cancel(Request $request, $id)
    {
        $validated = $request->validate([
            'remarks' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $leaveRequest = $this->scopedLeaveRequestQuery($request)->findOrFail($id);
            
            if ($leaveRequest->status === 'approved') {
                $employee = Employee::findOrFail($leaveRequest->employee_id);
                
                if (!$leaveRequest->is_paid_leave) {
                    $leaveField = $leaveRequest->leave_category . '_leave_days';
                    $employee->$leaveField += $leaveRequest->total_days;
                    $employee->save();
                }

                Attendance::where('leave_request_id', $leaveRequest->id)->delete();
            }

            $leaveRequest->update([
                'status' => 'rejected',
                'remarks' => $validated['remarks'] ?? 'Cancelled by user',
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Leave request cancelled successfully',
                'data' => $leaveRequest
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to cancel leave request', 'error' => $e->getMessage()], 500);
        }
    }

    private function createAttendanceRecords($leaveRequest)
    {
        $startDate = Carbon::parse($leaveRequest->start_date);
        $endDate = Carbon::parse($leaveRequest->end_date);

        $currentDate = $startDate->copy();
        
        while ($currentDate->lte($endDate)) {
            Attendance::updateOrCreate(
                [
                    'employee_id' => $leaveRequest->employee_id,
                    'date' => $currentDate->format('Y-m-d'),
                ],
                [
                    'leave_request_id' => $leaveRequest->id,
                    'status' => 'absent',
                    'remarks' => 'On Leave - ' . ucfirst($leaveRequest->leave_category) . ' Leave' . 
                                ($leaveRequest->is_paid_leave ? ' (Paid)' : ''),
                    'note' => $leaveRequest->reason,
                ]
            );
            
            $currentDate->addDay();
        }
    }

    public function getAttendanceCalendar(Request $request, $employeeId)
    {
        $admin = $request->user();
        
        // Use the forAdmin scope to check permission
        // $employeeId can be numeric ID or employee_id string
        $employee = Employee::query()
            ->forAdmin($admin)
            ->where(function($q) use ($employeeId) {
                $q->where('id', $employeeId)
                  ->orWhere('employee_id', $employeeId);
            })
            ->first();
            
        if (!$employee) {
            return response()->json(['message' => 'Forbidden employee access or unauthorized branch'], 403);
        }

        $year = $request->input('year', date('Y'));
        $month = $request->input('month');
        $joiningDate = $employee->joining_date;

        $query = Attendance::where('employee_id', $employee->employee_id)
            ->whereYear('date', $year);

        if ($month) {
            $query->whereMonth('date', $month);
        }

        $attendances = $query->select(['id', 'date', 'status', 'note'])->get()->keyBy('date');

        // Include approved leaves in calendar if no attendance record exists
        $leaves = LeaveRequest::where('employee_id', $employee->employee_id)
            ->where('status', 'approved')
            ->where('is_deleted', 0)
            ->where(function($q) use ($year, $month) {
                if ($month) {
                    $q->whereMonth('start_date', '<=', $month)
                      ->whereMonth('end_date', '>=', $month)
                      ->whereYear('start_date', '<=', $year)
                      ->whereYear('end_date', '>=', $year);
                } else {
                    $q->whereYear('start_date', '<=', $year)
                      ->whereYear('end_date', '>=', $year);
                }
            })
            ->get();

        $calendar = [];
        
        // Add attendance records
        foreach ($attendances as $date => $record) {
            // Check if date is before joining date
            if ($joiningDate && $date < $joiningDate) {
                continue; // Skip attendance records before joining if any exist (though unlikely in good data)
            }

            $isSunday = Carbon::parse($date)->isSunday();
            $status = $record->status;
            
            // If it's a Sunday and marked as 'absent' in database, treat it as 'sunday' visually
            // to avoid confusing users in the attendance calendar
            if ($isSunday && $status === 'absent') {
                $status = 'sunday';
            }

            $calendar[] = [
                'date' => $date,
                'status' => $status,
                'count' => in_array($record->status, ['present', 'overtime']) ? 1 : 0,
                'level' => ($status === 'sunday') ? 0 : $this->getActivityLevel($record->status),
                'remarks' => $record->note ?? $record->remarks,
            ];
        }

        // Add leave records for dates not already in calendar
        foreach ($leaves as $leave) {
            $start = Carbon::parse($leave->start_date);
            $end = Carbon::parse($leave->end_date);
            
            for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
                $dateStr = $d->toDateString();
                // Filter by month/year if params were provided
                if ($month && $d->month != $month) continue;
                if ($d->year != $year) continue;

                // Also respect joining date here
                if ($joiningDate && $dateStr < $joiningDate) continue;

                if (!isset($attendances[$dateStr])) {
                    $calendar[] = [
                        'date' => $dateStr,
                        'status' => 'on-leave',
                        'count' => 0,
                        'level' => 0,
                        'remarks' => 'Approved leave: ' . $leave->leave_category,
                    ];
                }
            }
        }

        return response()->json(collect($calendar)->sortBy('date')->values());
    }

    private function getActivityLevel($status)
    {
        return match($status) {
            'present' => 4,
            'late' => 3,
            'half-day' => 2,
            'absent', 'on-leave' => 0,
            default => 1,
        };
    }
}
