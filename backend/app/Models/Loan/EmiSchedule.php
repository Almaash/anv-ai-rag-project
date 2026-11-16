<?php

namespace App\Models\Loan;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasIsDeletedSoftDelete;

class EmiSchedule extends Model
{
    use HasIsDeletedSoftDelete;
    
    protected $table = 'loan_emi_schedules';

    protected $fillable = [
        'is_deleted',
        'admin_user_id',
        'emi_id',
        'loan_id',
        'branch_id',
        'cms_admin_id',
        'installment_no',
        'installment_date',
        'principal_due',
        'interest_due',
        'installment_amount',
        'outstanding_balance',
        'status',
        'paid_date',
        'paid_amount'
    ];

    protected $casts = [
        'is_deleted' => 'integer',
        'installment_date' => 'date',
        'paid_date' => 'date',
        'principal_due' => 'decimal:2',
        'interest_due' => 'decimal:2',
        'installment_amount' => 'decimal:2',
        'outstanding_balance' => 'decimal:2',
        'paid_amount' => 'decimal:2',
    ];

    public function loan(): BelongsTo
    {
        return $this->belongsTo(Loan::class, 'loan_id', 'loan_number');
    }
}