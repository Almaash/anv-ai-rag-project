<?php

namespace App\Models\Loan;

use Illuminate\Database\Eloquent\Model;

class InterestMaster extends Model
{
    protected $table = 'loan_interest_masters';

    protected $fillable = [
        'loan_type',
        'interest_rate',
        'user_id',
        'branch_id',
        'cms_admin_id'
    ];

    protected $casts = [
        'interest_rate' => 'decimal:2'
    ];
}
