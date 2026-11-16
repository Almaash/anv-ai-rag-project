<?php

namespace App\Models\Loan;

use Illuminate\Database\Eloquent\Model;

class CreditApplicationForm extends Model
{
    protected $table = 'loan_credit_application_forms';

    protected $fillable = [
        'loan_application_id',
        'customer_unique_id',
        'enrollment_number',
        'branch_id',
        'cms_admin_id',
        'agent_unique_id',
        'credit_mode',
        'credit_applied_for',
        'products',
        'frequency',
        'tenure_option',
        'repayment_day',
        'applicant_type',
        'applicant_income',
        'income_sources',
        'other_sources_income',
        'income_proof_name',
        'family_dependents',
        'total_income_yearly',
        'expense_details',
        'travel_expense_monthly',
        'other_obligations_monthly',
        'total_monthly_expenses',
        'total_yearly_expenses',
        'obligation_rows',
        'total_obligation_amount',
        'total_installment_amount',
        'net_surplus',
        'down_payment',
        'discount',
        'business_type',
        'business_nature',
        'entitled',
        'business_address',
        'business_ownership',
        'business_vintage',
        'business_photo_name',
        'business_proof_name',
        'reference1_name',
        'reference1_contact',
        'reference1_address',
        'reference2_name',
        'reference2_contact',
        'reference2_address',
        'partners',
        'bank_first_name',
        'bank_middle_name',
        'bank_last_name',
        'bank_name',
        'account_number',
        'ifsc_code',
        'passbook_image',
        'status',
        'is_verified',
        'is_pd_created',
        'is_cam_created',
        'is_disbursement_created',
        'status_history',
        'is_deleted',
        'is_delete_requested',
    ];

    protected static function booted()
    {
        // Global scope to exclude soft deleted records by default
        static::addGlobalScope('notDeleted', function ($builder) {
            $builder->where('is_deleted', 0);
        });

        static::creating(function ($caf) {
            // Set is_deleted to 0 by default
            if (!isset($caf->is_deleted)) {
                $caf->is_deleted = 0;
            }
        });
    }

    protected $casts = [
        'income_sources' => 'array',
        'expense_details' => 'array',
        'obligation_rows' => 'array',
        'partners' => 'array',
        'products' => 'array',
        'status_history' => 'array',
        'is_verified' => 'boolean',
        'is_pd_created' => 'boolean',
        'is_cam_created' => 'boolean',
        'is_disbursement_created' => 'boolean',
        'is_delete_requested' => 'boolean',
        'credit_applied_for' => 'decimal:2',
        'applicant_income' => 'decimal:2',
        'other_sources_income' => 'decimal:2',
        'total_income_yearly' => 'decimal:2',
        'travel_expense_monthly' => 'decimal:2',
        'other_obligations_monthly' => 'decimal:2',
        'total_monthly_expenses' => 'decimal:2',
        'total_yearly_expenses' => 'decimal:2',
        'total_obligation_amount' => 'decimal:2',
        'total_installment_amount' => 'decimal:2',
        'net_surplus' => 'decimal:2',
        'down_payment' => 'decimal:2',
        'discount' => 'decimal:2'
    ];

    public function customer()
    {
        return $this->belongsTo(LoanCustomer::class, 'customer_unique_id', 'customer_unique_id');
    }

    public function pd()
    {
        return $this->hasOne(PdInformation::class, 'loan_application_id', 'loan_application_id');
    }

    public function cam()
    {
        return $this->hasOne(CAM::class, 'loan_application_id', 'loan_application_id');
    }

    public function disbursements()
    {
        return $this->hasMany(Disbursement::class, 'loan_application_id', 'loan_application_id');
    }

    /**
     * Get only soft deleted records (is_deleted = 1)
     */
    public static function onlyTrashed()
    {
        return static::withoutGlobalScope('notDeleted')->where('is_deleted', 1);
    }

    /**
     * Get all records including soft deleted ones
     */
    public static function withTrashed()
    {
        return static::withoutGlobalScope('notDeleted');
    }

    /**
     * Soft delete the model by setting is_deleted = 1
     */
    public function softDelete()
    {
        return $this->update(['is_deleted' => 1]);
    }

    /**
     * Restore the soft deleted model by setting is_deleted = 0
     */
    public function restore()
    {
        return $this->update(['is_deleted' => 0]);
    }

    /**
     * Check if the model is soft deleted
     */
    public function isTrashed()
    {
        return $this->is_deleted == 1;
    }
    public function enrollment()
    {
        return $this->belongsTo(
            \App\Models\Loan\CustomerEnrollment::class,
            'enrollment_number',
            'enrollment_number'
        );
    }
}
