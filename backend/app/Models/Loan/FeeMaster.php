<?php

namespace App\Models\Loan;

use Illuminate\Database\Eloquent\Model;

class FeeMaster extends Model
{
    protected $table = 'loan_fee_masters';

    protected $fillable = [
        'processing_fee',
        'gst_percentage',
        'user_id',
        'branch_id',
        'cms_admin_id',
    ];

    protected $casts = [
        'processing_fee' => 'decimal:2',
        'gst_percentage' => 'decimal:2',
    ];
}
