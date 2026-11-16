<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AdvanceBooking extends Model
{
    use SoftDeletes;

    protected $table = 'inventory_advance_bookings';

    protected $fillable = [
        'booking_no',
        'customer_name',
        'customer_phone',
        'customer_address',
        'booking_date',
        'expected_delivery_date',
        'subtotal',
        'tax_type',
        'tax_value',
        'tax_amount',
        'discount_type',
        'discount_value',
        'discount_amount',
        'grand_total',
        'advance_paid',
        'paid_amount',
        'balance_amount',
        'payment_method',
        'upi_reference_no',
        'payment_screenshot',
        'notes',
        'status',
        'is_deleted',
        'branch',
        'branch_id',
        'cms_admin_id',
    ];

    protected $casts = [
        'is_deleted' => 'integer',
    ];

    protected $appends = ['payment_screenshot_url'];

    public function getPaymentScreenshotUrlAttribute(): ?string
    {
        return $this->payment_screenshot ? url($this->payment_screenshot) : null;
    }

    public function items()
    {
        return $this->hasMany(AdvanceBookingItem::class, 'booking_id', 'booking_no');
    }
}
