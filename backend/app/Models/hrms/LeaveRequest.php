<?php

namespace App\Models\hrms;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use App\Traits\GeneratesUniqueId;
use App\Traits\HasIsDeletedSoftDelete;

class LeaveRequest extends Model
{
    use GeneratesUniqueId, HasIsDeletedSoftDelete;

    public function getUniqueIdColumn(): string
    {
        return 'request_id';
    }

    public function getUniqueIdPrefix(): string
    {
        return 'LRQ';
    }

    protected $table = 'hrms_leave_requests';

    protected $fillable = [
        'cms_admin_id',
        'branch_id',
        'request_id',
        'employee_id',
        'leave_type_id',
        'leave_category',
        'start_date',
        'end_date',
        'total_days',
        'is_paid_leave',
        'reason',
        'status',
        'approved_by',
        'remarks',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'employee_id');
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class, 'leave_type_id', 'leave_type_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'leave_request_id');
    }

    /**
     * Scope to filter by the authenticated admin's branch.
     */
    public function scopeForAdmin($query, $admin)
    {
        if (!$admin) return $query;

        // If employee, they only see their own leave requests
        if ($admin instanceof \App\Models\hrms\Employee) {
            return $query->where('employee_id', $admin->id);
        }

        // Superadmin sees everything
        if (strtolower((string) $admin->role) === 'superadmin') {
            return $query;
        }

        // Branch scoping for Admin/Operator
        if (!empty($admin->branch)) {
            $query->where('branch_id', $admin->branch);
        }

        // Tenant scoping
        if (!empty($admin->cms_admin)) {
            $query->where('cms_admin_id', $admin->cms_admin);
        }

        return $query;
    }
}
