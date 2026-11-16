<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InvestorInvestment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'unique_id',
        'branch',
        'branch_id',
        'cms_admin',
        'cms_admin_id',
        'investor_id',
        'investor_unique_id',
        'investor_type_id',
        'investor_type_unique_id',
        'pool_id',
        'pool_unique_id',
        'amount',
        'remaining_pool_balance',
        'payment_history',
        'self_amount',
        'referral_amount',
        'total_amount',
        'date',
        'rate',
        'referral_commission',
        'allocation_charges',
        'yearly',
        'maturity',
        'lockin',
        'declaration_text',
        'declaration_accepted',
        'referral_amount_earned',
        'referral_history',
        'used_referral_bonus',
    ];

    protected $casts = [
        'referral_history' => 'array',
        'payment_history' => 'array',
        'declaration_accepted' => 'boolean',
    ];

    public function investor()
    {
        return $this->belongsTo(\App\Models\Investor\BasicInformation::class, 'investor_id');
    }

    public function investor_type()
    {
        return $this->belongsTo(\App\Models\Loan\InvestorType::class, 'investor_type_id', 'unique_id');
    }

    public function pool()
    {
        return $this->belongsTo(\App\Models\MoneyPool::class, 'pool_id', 'unique_id');
    }
    public function investment_weekly_schedules()
    {
        return $this->hasMany(\App\Models\InvestmentWeeklySchedule::class, 'investment_unique_id', 'unique_id');
    }

    public function referralTransactions()
    {
        return $this->hasMany(ReferralTransaction::class, 'investment_unique_id', 'unique_id');
    }

    public function referralEarnings()
    {
        return $this->hasMany(ReferralTransaction::class, 'referrer_unique_id', 'investor_unique_id');
    }
}
