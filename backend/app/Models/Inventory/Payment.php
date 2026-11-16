<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\BelongsToBranch;

class Payment extends Model
{
    use BelongsToBranch;

    protected $table = 'inventory_payments';

    protected $fillable = [
        'branch',
        'invoice_id',
        'amount',
        'payment_date',
        'payment_method',
        'transaction_id',
        'payment_screenshot',
        'notes',
        'branch_id',
        'cms_admin_id',
        'cms_admin',
    ];

    protected $appends = ['payment_screenshot_url'];

    public function getPaymentScreenshotUrlAttribute()
    {
        if (!$this->payment_screenshot) {
            return null;
        }
        
        return url($this->payment_screenshot);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id', 'invoice_no');
    }
}
