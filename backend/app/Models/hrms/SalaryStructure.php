<?php

namespace App\Models\hrms;

use App\Traits\HasIsDeletedSoftDelete;
use Illuminate\Database\Eloquent\Model;

class SalaryStructure extends Model
{
    use HasIsDeletedSoftDelete;

    protected $table = 'hrms_salary_structures';

    protected $fillable = [
        'employee_id',
        'basic_salary',
        'house_rent_allowance',
        'medical_allowance',
        'transport_allowance',
        'other_allowance',
        'provident_fund',
        'tax_deduction',
        'other_deduction',
        'net_salary',
        'status',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'employee_id');
    }
}
