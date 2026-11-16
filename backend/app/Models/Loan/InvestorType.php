<?php

namespace App\Models\Loan;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvestorType extends Model
{
    use HasFactory;

    protected $table = 'loan_investor_types';

    protected $fillable = [
        'unique_id',
        'branch_id',
        'cms_admin_id',
        'name',
        'description',
        'status',
    ];
}
