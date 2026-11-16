<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class InvestmentWeeklySchedule extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'unique_id',
        'investment_unique_id',
        'week_number',
        'date',
        'self_bonus',
        'referral_bonus',
        'total_earning',
        'redemption_value',
        'redeem',
        'closing_balance',
        'redemption_status',
        'total_redeemed',
    ];

    protected $casts = [
        'self_bonus' => 'decimal:2',
        'referral_bonus' => 'decimal:2',
        'total_earning' => 'decimal:2',
        'redemption_value' => 'decimal:2',
        'redeem' => 'decimal:2',
        'closing_balance' => 'decimal:2',
        'total_redeemed' => 'decimal:2',
        'date' => 'date',
    ];

    public function investorInvestment(): BelongsTo
    {
        return $this->belongsTo(InvestorInvestment::class, 'investment_unique_id', 'unique_id');
    }

    public function redemptions()
    {
        return $this->hasMany(InvestmentWeeklyRedemption::class, 'weekly_schedule_id');
    }

    public function getOpeningBalanceAttribute(): float
    {
        if ($this->week_number === 1) {
            return $this->investment->total_amount;
        }
        
        $previousWeek = self::where('investment_unique_id', $this->investment_unique_id)
            ->where('week_number', $this->week_number - 1)
            ->first();
            
        return $previousWeek ? $previousWeek->closing_balance : $this->investment->total_amount;
    }

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($schedule) {
            if (empty($schedule->unique_id)) {
                $schedule->unique_id = self::generateUniqueId();
            }
        });
    }

    public static function generateUniqueId(): string
    {
        $yearMonth = date('Ym');
        $prefix = 'INVSCH' . $yearMonth;

        $lastSchedule = self::withTrashed()
            ->where('unique_id', 'like', $prefix . '%')
            ->orderBy('unique_id', 'desc')
            ->first();

        $newNumber = $lastSchedule ? ((int) substr($lastSchedule->unique_id, -6)) + 1 : 1;

        // Keep incrementing until we find a truly unused ID
        do {
            $candidate = $prefix . str_pad($newNumber, 6, '0', STR_PAD_LEFT);
            $newNumber++;
        } while (self::withTrashed()->where('unique_id', $candidate)->exists());

        return $candidate;
    }
}