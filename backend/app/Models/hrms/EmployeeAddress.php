<?php

namespace App\Models\hrms;

use App\Traits\HasIsDeletedSoftDelete;
use Illuminate\Database\Eloquent\Model;

class EmployeeAddress extends Model
{
    use HasIsDeletedSoftDelete;

    protected $table = 'hrms_employee_addresses';

    protected $fillable = [
        'cms_admin_id',
        'branch_id',
        'employee_id',
        'type',
        'address_line_1',
        'address_line_2',
        'city',
        'state',
        'country',
        'pincode',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
