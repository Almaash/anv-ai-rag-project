<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Investment extends Model
{
    use HasFactory;

    protected $fillable = [
        'unique_id',
        'investor_id',
        'investor_unique_id',
        'self_amount',
        'referral_amount',
        'total_amount',
        'investment_start_date',
        'lockin_years',
        'annual_roi',
        'allocation_charges',
        'total_earnings',
        'maturity_amount',
    ];

    protected $casts = [
        'self_amount' => 'decimal:2',
        'referral_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'annual_roi' => 'decimal:2',
        'allocation_charges' => 'decimal:2',
        'total_earnings' => 'decimal:2',
        'maturity_amount' => 'decimal:2',
        'investment_start_date' => 'date',
    ];

    public function weeklySchedules(): HasMany
    {
        return $this->hasMany(InvestmentWeeklySchedule::class, 'investment_unique_id', 'unique_id');
    }

    public function getWeeklySelfBonusAttribute(): float
    {
        return round(($this->self_amount * $this->annual_roi / 100) / 52, 2);
    }

    public function getWeeklyReferralBonusAttribute(): float
    {
        return round(($this->referral_amount * $this->annual_roi / 100) / 52, 2);
    }

    public function getWeeklyTotalEarningAttribute(): float
    {
        return round($this->weekly_self_bonus + $this->weekly_referral_bonus, 2);
    }

    public function getTotalWeeksAttribute(): int
    {
        return $this->lockin_years * 52;
    }

    public function getAllocationChargesTotalAttribute(): float
    {
        return round($this->total_amount * $this->allocation_charges / 100 * $this->lockin_years, 2);
    }

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($investment) {
            if (empty($investment->unique_id)) {
                $investment->unique_id = self::generateInvestmentUniqueId();
            }
            if (empty($investment->investor_unique_id)) {
                $investment->investor_unique_id = self::generateUniqueId();
            }
        });
    }

    public static function generateInvestmentUniqueId(): string
    {
        $yearMonth = date('Ym');
        $prefix = 'ANVINV' . $yearMonth;
        
        $lastInvestment = self::where('unique_id', 'like', $prefix . '%')
            ->orderBy('unique_id', 'desc')
            ->first();
        
        if ($lastInvestment) {
            $lastNumber = (int) substr($lastInvestment->unique_id, -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        
        return $prefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    public static function generateUniqueId(): string
    {
        $yearMonth = date('Ym');
        $prefix = 'INV' . $yearMonth;
        
        $lastInvestment = self::where('investor_unique_id', 'like', $prefix . '%')
            ->orderBy('investor_unique_id', 'desc')
            ->first();
        
        if ($lastInvestment) {
            $lastNumber = (int) substr($lastInvestment->investor_unique_id, -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        
        return $prefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }
}