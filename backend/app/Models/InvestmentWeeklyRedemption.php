<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvestmentWeeklyRedemption extends Model
{
    use HasFactory;

    protected $fillable = [
        'unique_id',
        'branch',
        'branch_id',
        'cms_admin',
        'cms_admin_id',
        'investment_unique_id',
        'weekly_schedule_id',
        'week_number',
        'redemption_amount',
        'self_bonus_redeemed',
        'referral_bonus_redeemed',
        'redemption_type',
        'status',
        'transaction_id',
        'payment_document',
        'remarks',
        'redemption_date',
        'requested_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'redemption_amount' => 'decimal:2',
        'self_bonus_redeemed' => 'decimal:2',
        'referral_bonus_redeemed' => 'decimal:2',
        'redemption_date' => 'date',
        'approved_at' => 'datetime',
    ];

    public function weeklySchedule(): BelongsTo
    {
        return $this->belongsTo(InvestmentWeeklySchedule::class, 'weekly_schedule_id');
    }

    public function investorInvestment(): BelongsTo
    {
        return $this->belongsTo(InvestorInvestment::class, 'investment_unique_id', 'unique_id');
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'requested_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by');
    }

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($redemption) {
            if (empty($redemption->unique_id)) {
                $redemption->unique_id = self::generateUniqueId();
            }
        });
    }

    public static function generateUniqueId(): string
    {
        $yearMonth = date('Ym');
        $prefix = 'INVRED' . $yearMonth;
        
        $lastRedemption = self::where('unique_id', 'like', $prefix . '%')
            ->orderBy('unique_id', 'desc')
            ->first();
        
        if ($lastRedemption) {
            $lastNumber = (int) substr($lastRedemption->unique_id, -6);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        
        return $prefix . str_pad($newNumber, 6, '0', STR_PAD_LEFT);
    }
}