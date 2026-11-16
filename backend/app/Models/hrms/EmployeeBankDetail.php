<?php

namespace App\Models\hrms;

use App\Traits\HasIsDeletedSoftDelete;
use Illuminate\Database\Eloquent\Model;

class EmployeeBankDetail extends Model
{
    use HasIsDeletedSoftDelete;

    protected $table = 'hrms_employee_bank_details';

    protected $fillable = [
        'cms_admin_id',
        'branch_id',
        'employee_id',
        'bank_name',
        'account_holder_name',
        'account_number',
        'ifsc_code',
        'branch_name',
        'is_primary',
    ];

    protected $casts = [
        'account_number' => 'encrypted',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
