<?php

namespace App\Models\Finance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class FinanceTransaction extends Model
{
    use SoftDeletes;

    protected $table = 'finance_transactions';

    protected $fillable = [
        'transaction_id',
        'payment_reference_id',
        'payment_mode',
        'amount',
        'transaction_type',
        'transaction_date',
        'description',
        'attachment',
        'created_by',
        'branch',
        'branch_id',
        'cms_admin',
        'cms_admin_id',
    ];

    protected $casts = [
        'amount'           => 'decimal:2',
        'transaction_date' => 'date',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (FinanceTransaction $transaction) {
            if (empty($transaction->transaction_id)) {
                $transaction->transaction_id = self::generateTransactionId();
            }
        });
    }

    private static function generateTransactionId(): string
    {
        $last = self::withTrashed()->orderBy('id', 'desc')->first();
        $next = $last ? ($last->id + 1) : 1;
        return 'TXN-' . str_pad($next, 4, '0', STR_PAD_LEFT);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by')->select(['id', 'user_id', 'name']);
    }
}
