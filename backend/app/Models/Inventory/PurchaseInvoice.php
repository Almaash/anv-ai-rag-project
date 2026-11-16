<?php

namespace App\Models\Inventory;

use App\Models\Traits\BelongsToBranch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class PurchaseInvoice extends Model
{
    use BelongsToBranch;

    protected $table = 'inventory_purchase_orders';

    protected $fillable = [
        'unique_id',
        'cms_admin',
        'cms_admin_id',
        'vendor_id',
        'invoice_no',
        'purchase_date',
        'vendor_name',
        'vendor_phone',
        'vendor_address',
        'total_amount',
        'discount_amount',
        'discount_type',
        'discount_value',
        'paid_amount',
        'due_amount',
        'payment_method',
        'payment_status',
        'upi_reference_no',
        'payment_screenshot',
        'payment_note',
        'status',
        'branch',
        'branch_id',
    ];

    protected $appends = ['payment_screenshot_url'];

    public function getPaymentScreenshotUrlAttribute()
    {
        if (!$this->payment_screenshot) {
            return null;
        }
        
        return url($this->payment_screenshot);
    }

    public function purchase()
    {
        return $this->belongsTo(Purchase::class, 'unique_id', 'unique_id');
    }

    public function items()
    {
        return $this->hasMany(PurchaseInvoiceItem::class, 'purchase_id', 'unique_id');
    }
}

