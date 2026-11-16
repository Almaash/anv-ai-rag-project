<?php

namespace App\Models\Loan;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasIsDeletedSoftDelete;

class PdInformation extends Model
{
    use HasFactory, HasIsDeletedSoftDelete;

    protected $table = 'loan_pd_information';

    protected $fillable = [
        'pd_application_id',
        'loan_application_id',
        'customer_unique_id',
        'branch_id',
        'cms_admin_id',
        'house_verification_photo',
        'business_verification_photo',
        'pd_information',
        'obligation_details',
        'verification_status',
        'verification_notes',
        'status',
        'status_history',
        'is_verified',
        'is_cam_created',
        'is_disbursement_created',
        'is_deleted'
    ];

    protected $casts = [
        'pd_information' => 'json',
        'obligation_details' => 'json',
        'status_history' => 'json',
        'is_verified' => 'boolean',
        'is_cam_created' => 'boolean',
        'is_disbursement_created' => 'boolean',
        'is_deleted' => 'boolean'
    ];

    /**
     * Get the customer associated with the PD information.
     */
    public function customer()
    {
        return $this->belongsTo(\App\Models\Loan\LoanCustomer::class, 'customer_unique_id', 'customer_unique_id');
    }

    /**
     * Get the loan application (CAF) associated with the PD information.
     */
    public function loanApplication()
    {
        return $this->belongsTo(\App\Models\Loan\CreditApplicationForm::class, 'loan_application_id', 'loan_application_id');
    }
}
