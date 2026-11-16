<?php

namespace App\Models\hrms;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use App\Traits\GeneratesUniqueId;
use App\Traits\HasIsDeletedSoftDelete;

class Employee extends Authenticatable
{
    use HasApiTokens, GeneratesUniqueId, HasIsDeletedSoftDelete;

    protected $appends = ['branch'];

    public function getUniqueIdColumn(): string
    {
        return 'employee_id';
    }

    public function getUniqueIdPrefix(): string
    {
        return 'EMP';
    }

    protected $table = 'hrms_employees';

    protected $fillable = [
        'cms_admin_id',
        'user_id',
        'employee_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'password',
        'role',
        'designation_id',
        'department_id',
        'branch_id',
        'reporting_manager_id',
        'joining_date',
        'probation_end_date',
        'dob',
        'gender',
        'marital_status',
        'blood_group',
        'profile_photo',
        'employment_type',
        'basic_salary',
        'status',
        'annual_leave_quota',
        'annual_leave_used',
        'annual_leave_balance',
        'leave_cycle_year',
        'sick_leave_days',
        'casual_leave_days',
        'maternity_leave_days',
        'paid_leave_days',
    ];

    protected $casts = [
        'password' => 'hashed',
    ];

    /**
     * Scope to filter by the authenticated admin's branch.
     */
    public function scopeForAdmin($query, $admin)
    {
        if ($admin instanceof \App\Models\hrms\Employee) {
            return $query->where('id', $admin->id);
        }

        if (!$admin || !($admin instanceof \App\Models\User)) {
            return $query;
        }

        $role = strtolower((string) ($admin->role ?? ''));
        if (in_array($role, ['superadmin', 'super_admin'])) {
            return $query;
        }

        // Filter by cms_admin_id using the user's cms_admin string (e.g. anv_9)
        if (!empty($admin->cms_admin)) {
            $query->where('cms_admin_id', $admin->cms_admin);
        }

        // Filter by branch — user table stores branch as string code in 'branch' column
        $branchCode = null;
        if (isset($admin->branch)) {
            $branchCode = $admin->branch;
        } elseif (isset($admin->branch_id)) {
            $branchCode = $admin->branch_id;
        }
        
        if (!empty($branchCode)) {
            $query->where('branch_id', $branchCode);
        }

        return $query;
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'admin_user_id', 'user_id');
    }

    public function designation()
    {
        return $this->belongsTo(Designation::class, 'designation_id', 'designation_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id', 'id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'code');
    }

    public function attendance()
    {
        return $this->hasMany(Attendance::class, 'employee_id', 'employee_id');
    }

    public function leaveRequests()
    {
        return $this->hasMany(LeaveRequest::class, 'employee_id', 'employee_id');
    }

    public function salaryStructure()
    {
        return $this->hasOne(SalaryStructure::class, 'employee_id', 'employee_id');
    }

    public function salaries()
    {
        return $this->hasMany(Salary::class, 'employee_id');
    }

    public function personalDetail()
    {
        return $this->hasOne(EmployeePersonalDetail::class, 'employee_id');
    }

    public function addresses()
    {
        return $this->hasMany(EmployeeAddress::class, 'employee_id');
    }

    public function bankDetails()
    {
        return $this->hasOne(EmployeeBankDetail::class, 'employee_id');
    }

    public function leaveBalances()
    {
        return $this->hasMany(EmployeeLeaveBalance::class, 'employee_id');
    }

    public function documents()
    {
        return $this->hasMany(EmployeeDocument::class, 'employee_id');
    }
}
