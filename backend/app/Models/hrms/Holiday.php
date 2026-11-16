<?php

namespace App\Models\hrms;

use App\Models\Branch;
use App\Models\User;
use App\Traits\GeneratesUniqueId;
use App\Traits\HasIsDeletedSoftDelete;
use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    use GeneratesUniqueId, HasIsDeletedSoftDelete;

    public function getUniqueIdColumn(): string
    {
        return 'holiday_id';
    }

    public function getUniqueIdPrefix(): string
    {
        return 'HOL';
    }

    protected $table = 'hrms_holidays';

    protected $fillable = [
        'cms_admin_id',
        'branch_id',
        'holiday_id',
        'name',
        'date',
        'description',
        'recurring',
    ];

    public function scopeForAdmin($query, $admin)
    {
        if (!$admin) {
            return $query;
        }

        if ($admin instanceof User) {
            if (in_array(strtolower((string) $admin->role), ['superadmin'])) {
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
}
