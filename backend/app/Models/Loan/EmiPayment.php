<?php

namespace App\Models\Loan;

use Illuminate\Database\Eloquent\Model;

class EmiPayment extends Model
{
    protected $table = 'loan_emi_payments';

    protected $fillable = [
        'is_deleted', 'emi_schedule_id', 'loan_id', 'user_id', 'branch_id', 'cms_admin_id', 'payment_amount', 'payment_date',
        'payment_method', 'transaction_id', 'payment_image', 'payment_status',
        'approval_status', 'receipt_number', 'approved_by', 'approved_at', 'is_pre_close'
    ];

    public function emiSchedule()
    {
        return $this->belongsTo(EmiSchedule::class, 'emi_schedule_id', 'emi_id');
    }

    public function loan()
    {
        return $this->belongsTo(Loan::class, 'loan_id', 'loan_number');
    }

    public function user()
    {
        return $this->belongsTo(LoanCustomer::class, 'user_id', 'customer_unique_id');
    }
}
