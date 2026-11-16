<?php

namespace App\Models\hrms;

use App\Traits\HasIsDeletedSoftDelete;
use Illuminate\Database\Eloquent\Model;

class EmployeeDocument extends Model
{
    use HasIsDeletedSoftDelete;

    protected $table = 'hrms_employee_documents';

    protected $fillable = [
        'cms_admin_id',
        'branch_id',
        'employee_id',
        'document_type',
        'file_path',
        'verified',
        'uploaded_at',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
