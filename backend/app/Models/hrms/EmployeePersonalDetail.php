<?php

namespace App\Models\hrms;

use App\Traits\HasIsDeletedSoftDelete;
use Illuminate\Database\Eloquent\Model;

class EmployeePersonalDetail extends Model
{
    use HasIsDeletedSoftDelete;

    protected $table = 'hrms_employee_personal_details';

    protected $fillable = [
        'cms_admin_id',
        'branch_id',
        'employee_id',
        'father_name',
        'mother_name',
        'spouse_name',
        'nationality',
        'aadhaar_number',
        'pan_number',
        'passport_number',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relation',
        'middle_name',
        'religion',
        'caste',
        'identification_mark',
        'physically_challenged',
    ];

    protected $casts = [
        'aadhaar_number' => 'encrypted',
        'pan_number' => 'encrypted',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
