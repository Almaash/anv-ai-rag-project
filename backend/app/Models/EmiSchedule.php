<?php

namespace App\Models;

use App\Traits\HasIsDeletedSoftDelete;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmiSchedule extends Model
{
    use HasIsDeletedSoftDelete;

    protected $table = 'loan_emi_schedules';
    
    protected $fillable = [
        'emi_id',
        'loan_id',
        'branch',
        'branch_id',
        'cms_admin',
        'cms_admin_id',
        'emi_number',
        'due_date',
        'emi_amount',
        'principal_amount',
        'interest_amount',
        'remaining_balance',
        'status',
        'paid_amount',
        'paid_date',
        'installment_no',
        'installment_date',
        'frequency',
        'principal_due',
        'interest_due',
        'installment_amount',
        'outstanding_balance',
        'is_deleted',
    ];

    protected $casts = [
        'due_date' => 'date',
        'installment_date' => 'date',
        'paid_date' => 'date',
        'emi_amount' => 'decimal:2',
        'principal_amount' => 'decimal:2',
        'interest_amount' => 'decimal:2',
        'remaining_balance' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'principal_due' => 'decimal:2',
        'interest_due' => 'decimal:2',
        'installment_amount' => 'decimal:2',
        'outstanding_balance' => 'decimal:2',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->emi_id)) {
                $model->emi_id = 'EMI' . time() . str_pad(rand(0, 9999), 4, '0', STR_PAD_LEFT);
            }
        });
    }

    public function loan(): BelongsTo
    {
        return $this->belongsTo(Loan::class, 'loan_id', 'loan_number');
    }
}