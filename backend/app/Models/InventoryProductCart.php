<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryProductCart extends Model
{
    protected $table = 'inventory_product_cart';

    protected $fillable = [
        'unique_id',
        'customer_name',
        'customer_phone',
        'customer_email',
        'product_id',
        'branch_id',
        'cms_admin_id',
        'price',
        'selling_price',
        'buying_price',
        'selected_variant',
        'verified_by_fe',
        'attributes'
    ];

    protected $casts = [
        'attributes' => 'array',
        'verified_by_fe' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $last = static::orderBy('id', 'desc')->first();
            $lastNumber = 0;

            if ($last && !empty($last->unique_id)) {
                if (preg_match('/(\d+)$/', (string) $last->unique_id, $matches)) {
                    $lastNumber = (int) ($matches[1] ?? 0);
                }
            }

            $number = $lastNumber + 1;
            $model->unique_id = 'INQ-ANV-' . str_pad((string) $number, 4, '0', STR_PAD_LEFT);
        });
    }
}
