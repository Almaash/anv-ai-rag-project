<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoanApplication extends Model
{
    protected $fillable = [
        'loan_application_id', 'customer_unique_id', 'user_id', 'branch_id', 'cms_admin_id',
        'loan_amount', 'loan_purpose',
        'loan_tenure_months', 'interest_rate', 'monthly_income', 'employment_type',
        'company_name', 'work_experience_years', 'existing_loans', 'collateral_details',
        'salary_slip_document', 'bank_statement_document', 'identity_proof_document',
        'address_proof_document', 'other_document_1', 'other_document_2',
        'application_status', 'rejection_reason', 'revision_reason', 'status_history',
        'loan_started', 'is_disbursed', 'apply_processing_fee', 'apply_gst',
        'processing_fee_type', 'processing_fee_percent', 'processing_fee_amount',
        'gst_percentage', 'gst_amount'
    ];

    protected $casts = [
        'status_history' => 'array',
        'loan_started' => 'boolean',
        'is_disbursed' => 'boolean',
        'apply_processing_fee' => 'boolean',
        'apply_gst' => 'boolean'
    ];

    public function customer()
    {
        return $this->belongsTo(Loan\LoanCustomer::class, 'customer_unique_id', 'customer_unique_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'customer_unique_id', 'user_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'customer_unique_id', 'user_id');
    }

    public function loan()
    {
        return $this->hasOne(Loan\Loan::class, 'loan_application_id', 'loan_application_id');
    }

    public function pdInformation()
    {
        return $this->hasOne(Loan\PdInformation::class, 'loan_application_id', 'loan_application_id');
    }

    public function creditApplicationForm()
    {
        return $this->hasOne(Loan\CreditApplicationForm::class, 'loan_application_id', 'loan_application_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'code');
    }
}
