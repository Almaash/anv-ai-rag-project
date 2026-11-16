<?php

namespace App\Models\Loan;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasIsDeletedSoftDelete;

class CAM extends Model
{
    use HasFactory, HasIsDeletedSoftDelete;

    protected $table = 'loan_cam';

    protected $fillable = [
        'loan_application_id',
        'pd_id',
        'cam_unique_id',
        'status',
        'branch_id',
        'customer_unique_id',
        'cms_admin_id',
        'income_details',
        'expenditure_details',
        'net_surplus',
        'credit_decision',
        'remarks',
        'status_history',
        'is_verified',
        'is_disbursement_created',
        'is_deleted',
        'pd_checked',
        'cam_checked',
        'tvr_applicant_contacts',
        'tvr_observation',
        'deviation_if_any',
        'deviation_approved_by',
        'deviation_status',
        'reason_for_rejected',
        'credit_sanction_status',
        'sanction_remarks',
        'verification_documents',
    ];

    protected $casts = [
        'income_details' => 'array',
        'expenditure_details' => 'array',
        'net_surplus' => 'array',
        'status_history' => 'array',
        'verification_documents' => 'array',
        'is_verified' => 'boolean',
        'is_disbursement_created' => 'boolean',
        'is_deleted' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relationship with CreditApplicationForm model.
     */
    public function loanApplication()
    {
        return $this->belongsTo(CreditApplicationForm::class, 'loan_application_id', 'loan_application_id');
    }

    /**
     * Relationship with PdInformation model.
     */
    public function pdInformation()
    {
        return $this->belongsTo(PdInformation::class, 'pd_id', 'pd_application_id');
    }

    /**
     * Relationship with LoanCustomer model.
     */
    public function customer()
    {
        return $this->belongsTo(LoanCustomer::class, 'customer_unique_id', 'customer_unique_id');
    }
}
