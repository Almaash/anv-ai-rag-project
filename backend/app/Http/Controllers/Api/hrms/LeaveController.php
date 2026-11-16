<?php

namespace App\Http\Controllers\Api\hrms;

use App\Http\Controllers\Controller;
use App\Models\hrms\Employee;
use App\Models\hrms\EmployeeLeaveBalance;
use App\Models\hrms\LeaveRequest;
use App\Models\hrms\LeaveType;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;

class LeaveController extends Controller
{
    private function getAdmin(Request $request)
    {
        return $request->user();
    }

    private function getAdminScopePayload($admin): array
    {
        $branchId = null;
        if ($admin instanceof \App\Models\User) {
            $branchId = $admin->branch ?? $admin->branch_id;
        } elseif ($admin instanceof \App\Models\hrms\Employee) {
            $branchId = $admin->branch_id;
        }

        // Fallback: If still null/empty, use the first available branch
        if (empty($branchId)) {
            $branchId = \App\Models\Branch::value('code');
        }

        // Use cms_admin mapping if provided in login data, else fallback to user_id
        $adminUserId = $admin->cms_admin ?? $admin->user_id ?? $admin->admin_user_id ?? $admin->id ?? null;

        return [
            'cms_admin_id' => $adminUserId,
            'branch_id' => $branchId,
        ];
    }

    private function syncEmployeeLeaveSummary(Employee $employee): void
    {
        $employee->load('leaveBalances.leaveType');

        $annualQuota = 15;
        $annualUsed = min((int) $employee->leaveBalances->sum('used'), $annualQuota);
        $annualBalance = max($annualQuota - $annualUsed, 0);

        $sickDays = 0;
        $casualDays = 0;
        $maternityDays = 0;

        foreach ($employee->leaveBalances as $balance) {
            $name = strtolower((string) optional($balance->leaveType)->name);

            if (str_contains($name, 'sick')) {
                $sickDays += (int) $balance->remaining;
            }
            if (str_contains($name, 'casual')) {
                $casualDays += (int) $balance->remaining;
            }
            if (str_contains($name, 'maternity') || str_contains($name, 'marital')) {
                $maternityDays += (int) $balance->remaining;
            }
        }

        $employee->update([
            'annual_leave_quota' => $annualQuota,
            'annual_leave_used' => $annualUsed,
            'annual_leave_balance' => $annualBalance,
            'leave_cycle_year' => $employee->leave_cycle_year ?? now()->year,
            'sick_leave_days' => $sickDays,
            'casual_leave_days' => $casualDays,
            'maternity_leave_days' => $maternityDays,
        ]);
    }

    // Leave Types
    public function getLeaveTypes(Request $request)
    {
        try {
            $admin = $this->getAdmin($request);
            $perPage = min((int) $request->input('per_page', 25), 100);
            $search = $request->input('search');

            $query = LeaveType::query()->forAdmin($admin);

            if ($search) {
                $query->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
            }

            $query->orderByDesc('id');

            if ($request->boolean('all')) {
                return response()->json(['status' => 'success', 'data' => $query->get()], 200);
            }

            $paginated = $query->paginate($perPage);

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
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function storeLeaveType(Request $request)
    {
        try {
            $admin = $this->getAdmin($request);
            $scope = $this->getAdminScopePayload($admin);

            // Priority: payload cms_admin > token user object cms_admin
            $cmsAdminId = $request->input('cms_admin') ?? $scope['cms_admin_id'];

            $name = trim((string) $request->input('name'));
            if ($name === '') {
                return response()->json(['status' => 'error', 'message' => 'Leave type name is required'], 422);
            }

            $exists = LeaveType::query()
                ->forAdmin($admin)
                ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                ->exists();
            if ($exists) {
                return response()->json(['status' => 'error', 'message' => 'Leave type already exists'], 422);
            }

            $type = LeaveType::create([
                'name' => $name,
                'description' => $request->input('description'),
                'limit_days' => (int) $request->input('limit_days', 0),
                'status' => (bool) $request->input('status', true),
                'cms_admin_id' => $cmsAdminId,
                'branch_id' => $request->input('branch_id') ?? $scope['branch_id'],
            ]);
            return response()->json(['status' => 'success', 'data' => $type], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function updateLeaveType(Request $request, $id)
    {
        try {
            $admin = $this->getAdmin($request);
            $type = LeaveType::query()->forAdmin($admin)
                ->where(function($q) use ($id) {
                    $q->where('id', $id)->orWhere('leave_type_id', $id);
                })->firstOrFail();

            if ($request->filled('name')) {
                $name = trim((string) $request->input('name'));
                $exists = LeaveType::query()
                    ->forAdmin($admin)
                    ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                    ->where('id', '!=', $type->id)
                    ->exists();
                if ($exists) {
                    return response()->json(['status' => 'error', 'message' => 'Leave type already exists'], 422);
                }
            }

            $type->update($request->only(['name', 'description', 'limit_days', 'status']));
            return response()->json(['status' => 'success', 'data' => $type], 200);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function destroyLeaveType(Request $request, $id)
    {
        try {
            $admin = $this->getAdmin($request);
            $type = LeaveType::query()->forAdmin($admin)
                ->where(function($q) use ($id) {
                    $q->where('id', $id)->orWhere('leave_type_id', $id);
                })->firstOrFail();
            $type->delete();
            return response()->json(['status' => 'success', 'message' => 'Leave type deleted'], 200);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // Leave Requests
    public function index()
    {
        try {
            $requests = LeaveRequest::with(['employee', 'leaveType', 'approvedBy'])->get();
            return response()->json([
                'status' => 'success',
                'data' => $requests,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $leaveRequest = LeaveRequest::create($request->all());
            return response()->json([
                'status' => 'success',
                'message' => 'Leave request submitted successfully',
                'data' => $leaveRequest,
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
        DB::beginTransaction();
        try {
            $leaveRequest = LeaveRequest::findOrFail($id);
            $oldStatus = $leaveRequest->status;
            $newStatus = $request->status;

            $leaveDays = max(0, (int) $leaveRequest->total_days);
            $employee = Employee::findOrFail($leaveRequest->employee_id);
            $leaveType = LeaveType::findOrFail($leaveRequest->leave_type_id);

            $employeeLeaveBalance = EmployeeLeaveBalance::firstOrCreate(
                [
                    'employee_id' => $employee->id,
                    'leave_type_id' => $leaveType->id,
                ],
                [
                    'total_allocated' => (int) $leaveType->limit_days,
                    'used' => 0,
                    'remaining' => (int) $leaveType->limit_days,
                ]
            );

            $becameApproved = $oldStatus !== 'approved' && $newStatus === 'approved';
            $wasApprovedButChanged = $oldStatus === 'approved' && $newStatus !== 'approved';

            if ($becameApproved) {
                if ($employeeLeaveBalance->remaining < $leaveDays) {
                    DB::rollBack();
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Insufficient leave balance for this leave type',
                    ], 422);
                }

                $employeeLeaveBalance->used += $leaveDays;
                $employeeLeaveBalance->remaining -= $leaveDays;
                $employeeLeaveBalance->save();
            }

            if ($wasApprovedButChanged) {
                $employeeLeaveBalance->used = max(0, (int) $employeeLeaveBalance->used - $leaveDays);
                $employeeLeaveBalance->remaining = min(
                    (int) $employeeLeaveBalance->total_allocated,
                    (int) $employeeLeaveBalance->remaining + $leaveDays
                );
                $employeeLeaveBalance->save();
            }

            $leaveRequest->update([
                'status' => $newStatus,
                'approved_by' => auth()->id(),
                'remarks' => $request->remarks,
            ]);

            if ($becameApproved || $wasApprovedButChanged) {
                $this->syncEmployeeLeaveSummary($employee);
            }

            DB::commit();
            return response()->json([
                'status' => 'success',
                'message' => 'Leave request status updated',
                'data' => $leaveRequest,
            ], 200);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Status update failed',
            ], 500);
        }
    }
}
