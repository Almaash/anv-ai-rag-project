<?php

namespace App\Models\hrms;

use App\Models\Branch;
use App\Models\User;
use App\Traits\GeneratesUniqueId;
use App\Traits\HasIsDeletedSoftDelete;
use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    use GeneratesUniqueId, HasIsDeletedSoftDelete;

    public function getUniqueIdColumn(): string
    {
        return 'dept_id';
    }

    public function getUniqueIdPrefix(): string
    {
        return 'DPT';
    }

    protected $table = 'hrms_departments';

    protected $fillable = [
        'cms_admin_id',
        'branch_id',
        'dept_id',
        'name',
        'description',
        'status',
    ];

    public function scopeForAdmin($query, $admin)
    {
        if (!$admin) {
            return $query;
        }

        if ($admin instanceof User) {
            $role = strtolower((string) ($admin->role ?? ''));
            if (in_array($role, ['superadmin', 'super_admin'])) {
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

    public function employees()
    {
        return $this->hasMany(Employee::class, 'department_id');
    }
}
