<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;

class AdvanceBookingItem extends Model
{
    protected $table = 'inventory_advance_booking_items';

    protected $fillable = [
        'unique_id',
        'booking_id',
        'product_id',
        'product_unique_id',
        'purchase_item_id',
        'purchase_item_unique_id',
        'product_name',
        'attribute_summary',
        'quantity',
        'price',
        'discount_type',
        'discount_value',
        'discount_amount',
        'tax_type',
        'tax_value',
        'tax_amount',
        'total',
        'branch_id',
        'cms_admin_id',
        'is_deleted',
    ];

    public function booking()
    {
        return $this->belongsTo(AdvanceBooking::class, 'booking_id', 'booking_no');
    }
}
