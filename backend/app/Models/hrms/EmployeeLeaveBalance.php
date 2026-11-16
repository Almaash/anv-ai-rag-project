<?php

namespace App\Models\hrms;

use App\Traits\HasIsDeletedSoftDelete;
use Illuminate\Database\Eloquent\Model;

class EmployeeLeaveBalance extends Model
{
    use HasIsDeletedSoftDelete;

    protected $table = 'hrms_employee_leave_balances';

    protected $fillable = [
        'cms_admin_id',
        'branch_id',
        'employee_id',
        'leave_type_id',
        'total_allocated',
        'used',
        'remaining',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class, 'leave_type_id');
    }
}
