<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferralTransaction extends Model
{
    use HasFactory;

    protected $table = 'investor_referral_transactions';

    protected $fillable = [
        'unique_id',
        'referrer_unique_id',
        'referee_unique_id', 
        'investment_unique_id',
        'investment_amount',
        'referral_percentage',
        'referral_amount',
        'status',
        'credited_at',
        'remarks'
    ];

    protected $casts = [
        'investment_amount' => 'decimal:2',
        'referral_percentage' => 'decimal:2',
        'referral_amount' => 'decimal:2',
        'credited_at' => 'datetime'
    ];

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($transaction) {
            if (empty($transaction->unique_id)) {
                $transaction->unique_id = self::generateUniqueId();
            }
        });
    }

    public static function generateUniqueId(): string
    {
        $yearMonth = date('Ym');
        $prefix = 'REFTRX' . $yearMonth;
        
        $lastTransaction = self::where('unique_id', 'like', $prefix . '%')
            ->orderBy('unique_id', 'desc')
            ->first();
        
        if ($lastTransaction) {
            $lastNumber = (int) substr($lastTransaction->unique_id, -6);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        
        return $prefix . str_pad($newNumber, 6, '0', STR_PAD_LEFT);
    }

    public function referrer(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Investor\BasicInformation::class, 'referrer_unique_id', 'unique_id');
    }

    public function referee(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Investor\BasicInformation::class, 'referee_unique_id', 'unique_id');
    }

    public function investment(): BelongsTo
    {
        return $this->belongsTo(InvestorInvestment::class, 'investment_unique_id', 'unique_id');
    }
}