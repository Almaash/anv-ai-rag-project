<?php

namespace App\Models\Loan;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasIsDeletedSoftDelete;

class Disbursement extends Model
{
    use HasIsDeletedSoftDelete;

    protected $table = 'loan_disbursements';

    protected $fillable = [
        'is_deleted',
        'disbursement_id',
        'loan_application_id',
        'pd_application_id',
        'cam_unique_id',
        'branch_id',
        'cms_admin_id',
        'customer_unique_id',
        'date_of_disbursement',
        'booking_date',
        'disbursement_status',
        'dfa_document',
        'cfa_document',
        'dpn_document',
        'vernacular_document',
        'disbursement_video'
    ];

    protected $casts = [
        'is_deleted' => 'integer',
        'date_of_disbursement' => 'date',
        'booking_date' => 'date',
    ];

    public function loanApplication()
    {
        return $this->belongsTo(\App\Models\LoanApplication::class, 'loan_application_id', 'loan_application_id');
    }

    public function cam()
    {
        return $this->belongsTo(\App\Models\Loan\CAM::class, 'loan_application_id', 'loan_application_id');
    }

    public function customer()
    {
        return $this->belongsTo(\App\Models\Loan\LoanCustomer::class, 'customer_unique_id', 'customer_unique_id');
    }

    public function branch()
    {
        return $this->belongsTo(\App\Models\Branch::class, 'branch_id', 'code');
    }
}
