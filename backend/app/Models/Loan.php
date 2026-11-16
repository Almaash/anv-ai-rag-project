<?php

namespace App\Models;

use App\Models\Loan\LoanCustomer;
use App\Traits\HasIsDeletedSoftDelete;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        'loan_amount' => 'decimal:2',
        'interest_rate' => 'decimal:2',
        'emi_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'processing_fee_percent' => 'decimal:2',
        'processing_fee_amount' => 'decimal:2',
        'gst_percentage' => 'decimal:2',
        'gst_amount' => 'decimal:2',
        'loan_start_date' => 'date',
        'loan_end_date' => 'date',
        'apply_processing_fee' => 'boolean',
        'apply_gst' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($loan) {
            if (empty($loan->loan_number)) {
                $loan->loan_number = self::generateLoanNumber($loan->branch_id);
            }
        });
    }

    private static function generateLoanNumber($branchId = null)
    {
        // Get branch code from branch_id
        $branchCode = 'UNK'; // Default fallback
        
        if ($branchId) {
            $branch = \App\Models\Branch::where('id', $branchId)
                ->orWhere('code', $branchId)
                ->first();
            
            if ($branch && $branch->code) {
                $branchCode = $branch->code;
            } else {
                // If branch not found but branchId looks like a code, use it directly
                if (is_string($branchId) && strlen($branchId) <= 10) {
                    $branchCode = $branchId;
                }
            }
        }
        
        // Find the last loan number for this branch including soft-deleted records
        $prefix = 'LN-' . $branchCode . '-';
        $lastLoan = self::withoutGlobalScope('not_deleted')
            ->where('loan_number', 'LIKE', $prefix . '%')
            ->orderBy('loan_number', 'desc')
            ->first();
        
        $nextNumber = 1;
        if ($lastLoan && $lastLoan->loan_number) {
            // Extract the number part from the last loan number
            $lastNumber = str_replace($prefix, '', $lastLoan->loan_number);
            $nextNumber = (int)$lastNumber + 1;
        }
        
        $loanNumber = $prefix . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);
        
        // Log for debugging
        \Illuminate\Support\Facades\Log::info('Generated loan number', [
            'branch_id' => $branchId,
            'branch_code' => $branchCode,
            'prefix' => $prefix,
            'last_loan_number' => $lastLoan ? $lastLoan->loan_number : null,
            'next_number' => $nextNumber,
            'generated_loan_number' => $loanNumber
        ]);
        
        return $loanNumber;
    }

    public function emiSchedules(): HasMany
    {
        return $this->hasMany(EmiSchedule::class, 'loan_id', 'loan_number');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(LoanCustomer::class, 'customer_unique_id', 'customer_unique_id');
    }
}