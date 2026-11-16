<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\BelongsToBranch;

class Invoice extends Model
{
    use BelongsToBranch, SoftDeletes;
    protected $table = 'inventory_sales_orders';

    protected $fillable = [
        'invoice_no',
        'customer_name',
        'customer_phone',
        'customer_address',
        'invoice_date',
        'subtotal',
        'tax_type',
        'tax_value',
        'tax_amount',
        'discount_type',
        'discount_value',
        'discount_amount',
        'grand_total',
        'paid_amount',
        'balance_amount',
        'payment_status',
        'payment_method',
        'upi_reference_no',
        'payment_screenshot',
        'notes',
        'status',
        'is_deleted',
        'branch',
        'branch_id',
        'cms_admin',
        'cms_admin_id',
    ];

    protected $casts = [
        'is_deleted' => 'integer',
    ];

    protected $appends = ['payment_screenshot_url'];

    public function getPaymentScreenshotUrlAttribute()
    {
        if (!$this->payment_screenshot) {
            return null;
        }
        
        return url($this->payment_screenshot);
    }

    public function items()
    {
        return $this->hasMany(InvoiceItem::class, 'invoice_id', 'invoice_no');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'invoice_id', 'invoice_no');
    }
}
