<?php

namespace App\Models\Loan;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoanCustomerVerificationHistory extends Model
{
    use HasFactory;

    protected $table = 'loan_customer_verification_history';

    protected $fillable = [
        'customer_unique_id',
        'enrollment_number',
        'reason',
        'status',
        'occupation_details_applicant',
        'occupation_details_nominee',
        'house_details',
        'assets_details',
        'admin_id',
        'admin_name',
    ];

    protected $casts = [
        'occupation_details_applicant' => 'boolean',
        'occupation_details_nominee' => 'boolean',
        'house_details' => 'boolean',
        'assets_details' => 'boolean',
    ];

    public function customer()
    {
        return $this->belongsTo(LoanCustomer::class, 'customer_unique_id', 'customer_unique_id');
    }
}