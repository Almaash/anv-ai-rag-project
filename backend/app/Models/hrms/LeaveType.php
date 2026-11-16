<?php

namespace App\Models\hrms;

use App\Models\Branch;
use App\Models\User;
use App\Traits\GeneratesUniqueId;
use App\Traits\HasIsDeletedSoftDelete;
use Illuminate\Database\Eloquent\Model;

class LeaveType extends Model
{
    use GeneratesUniqueId, HasIsDeletedSoftDelete;

    public function getUniqueIdColumn(): string
    {
        return 'leave_type_id';
    }

    public function getUniqueIdPrefix(): string
    {
        return 'LT';
    }

    protected $table = 'hrms_leave_types';

    protected $fillable = [
        'cms_admin_id',
        'branch_id',
        'leave_type_id',
        'name',
        'description',
        'limit_days',
        'status',
    ];

    public function scopeForAdmin($query, $admin)
    {
        if (!$admin) {
            return $query;
        }

        if ($admin instanceof User) {
            $role = strtolower((string) $admin->role);
            if (in_array($role, ['superadmin'])) {
                return $query;
            }
            
            // Priority: cms_admin > user_id for HRMS scoping
            $adminId = $admin->cms_admin ?? $admin->user_id;
            if (!empty($adminId)) {
                $query->where('cms_admin_id', $adminId);
            }
            if (!empty($admin->branch)) {
                $query->where('branch_id', $admin->branch);
            }
            return $query;
        }

        if ($admin instanceof Employee) {
            return $query
                ->where('cms_admin_id', $admin->admin_user_id)
                ->where('branch_id', $admin->branch_id);
        }

        return $query;
    }

    public function leaveRequests()
    {
        return $this->hasMany(LeaveRequest::class, 'leave_type_id');
    }
}
