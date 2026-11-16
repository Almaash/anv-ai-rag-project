<?php

namespace App\Models\Finance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class CashBook extends Model
{
    protected $table = 'finance_cash_book';

    protected $fillable = [
        'cash_book_id',
        'date',
        'opening_balance',
        'cash_in',
        'cash_out',
        'closing_balance',
        'payment_mode',
        'description',
        'note',
        'branch',
        'cms_admin_id',
        'created_by',
    ];

    protected $casts = [
        'date'            => 'date',
        'opening_balance' => 'decimal:2',
        'cash_in'         => 'decimal:2',
        'cash_out'        => 'decimal:2',
        'closing_balance' => 'decimal:2',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (CashBook $model) {
            if (empty($model->cash_book_id)) {
                $last = self::orderBy('id', 'desc')->first();
                $next = $last ? ($last->id + 1) : 1;
                $model->cash_book_id = 'CB-' . str_pad($next, 4, '0', STR_PAD_LEFT);
            }

            // Auto-compute closing balance
            $model->closing_balance = $model->opening_balance + $model->cash_in - $model->cash_out;
        });

        static::updating(function (CashBook $model) {
            $model->closing_balance = $model->opening_balance + $model->cash_in - $model->cash_out;
        });
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id')->select(['id', 'user_id', 'name']);
    }
}
