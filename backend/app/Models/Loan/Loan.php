<?php

namespace App\Models\Loan;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasIsDeletedSoftDelete;

class Loan extends Model
{
    use HasIsDeletedSoftDelete;
    
    protected $table = 'loan_loans';

    protected $fillable = [
        'loan_number',
        'loan_application_id',
        'customer_unique_id',
        'branch_id',
        'cms_admin_id',
        'agent_unique_id',
        'disbursement_id',
        'loan_amount',
        'interest_rate',
        'tenure_months',
        'frequency',
        'emi_amount',
        'processing_fee',
        'gst_amount',
        'insurance_amount',
        'disbursement_amount',
        'loan_start_date',
        'installment_start_date',
        'is_deleted',
    ];

    protected $casts = [
        'is_deleted' => 'integer',
        'loan_amount' => 'decimal:2',
        'interest_rate' => 'decimal:2',
        'emi_amount' => 'decimal:2',
        'processing_fee' => 'decimal:2',
        'gst_amount' => 'decimal:2',
        'insurance_amount' => 'decimal:2',
        'disbursement_amount' => 'decimal:2',
        'loan_start_date' => 'date',
        'installment_start_date' => 'date',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($loan) {
            if (empty($loan->loan_number)) {
                $loan->loan_number = self::generateLoanNumber();
            }
        });
    }

    private static function generateLoanNumber()
    {
        $lastLoan = self::withoutGlobalScope('not_deleted')->orderBy('id', 'desc')->first();
        $number = $lastLoan ? $lastLoan->id + 1001 : 1001;
        return 'LN' . str_pad($number, 6, '0', STR_PAD_LEFT);
    }

    public function emiSchedules(): HasMany
    {
        return $this->hasMany(EmiSchedule::class, 'loan_id', 'loan_number');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(LoanCustomer::class, 'customer_unique_id', 'customer_unique_id');
    }

    public function loanApplication(): BelongsTo
    {
        return $this->belongsTo(\App\Models\LoanApplication::class, 'loan_application_id', 'loan_application_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Branch::class, 'branch_id', 'code');
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(LoanAgent::class, 'agent_unique_id', 'agent_unique_id');
    }
}