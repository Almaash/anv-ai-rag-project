<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\BelongsToBranch;

class Purchase extends Model
{
    use BelongsToBranch;

    protected $table = 'inventory_purchase_orders';

    protected $fillable = [
        'unique_id',
        'vendor_id',
        'vendor_name',
        'vendor_phone',
        'vendor_address',
        'invoice_no',
        'cms_admin',
        'cms_admin_id',
        'purchase_date',
        'total_amount',
        'discount_type',
        'discount_value',
        'discount_amount',
        'paid_amount',
        'due_amount',
        'payment_status',
        'payment_method',
        'upi_reference_no',
        'payment_screenshot',
        'payment_note',
        'status',
        'branch',
        'branch_id',
        'investor_investment_id',
        'investor_unique_id',
    ];

    protected $appends = ['payment_screenshot_url'];

    public function getPaymentScreenshotUrlAttribute()
    {
        if (!$this->payment_screenshot) return null;
        return url($this->payment_screenshot);
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class, 'vendor_id', 'unique_id');
    }

    // Line items — inventory_purchase_line_items
    public function items()
    {
        return $this->hasMany(PurchaseItem::class, 'purchase_id', 'unique_id');
    }

    public function lineItems()
    {
        return $this->items();
    }

    /**
     * Backward-compatible alias used by purchase APIs after table consolidation.
     */
    public function latestInvoice()
    {
        return $this->hasOne(self::class, 'id', 'id');
    }
}
