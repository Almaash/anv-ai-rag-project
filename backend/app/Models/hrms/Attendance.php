<?php

namespace App\Models\hrms;

use App\Traits\HasIsDeletedSoftDelete;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasIsDeletedSoftDelete;

    protected $table = 'hrms_attendance';

    protected $fillable = [
        'cms_admin_id',
        'branch_id',
        'employee_id',
        'leave_request_id',
        'date',
        'clock_in',
        'clock_out',
        'status',
        'note',
        'remarks',
        'total_hours',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'employee_id');
    }

    public function leaveRequest()
    {
        return $this->belongsTo(LeaveRequest::class, 'leave_request_id');
    }

    /**
     * Scope to filter by the authenticated admin's branch.
     */
    public function scopeForAdmin($query, $admin)
    {
        if (!$admin) return $query;

        // If employee, they only see their own attendance
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
