<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    protected $table = 'inventory_sales_order_items';

    protected $fillable = [
        'unique_id',
        'invoice_id',
        'invoice_unique_id',
        'product_id',
        'product_unique_id',
        'purchase_item_id',
        'purchase_item_unique_id',
        'cms_admin',
        'cms_admin_id',
        'branch_id',
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
        'is_deleted',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id', 'invoice_no');
    }

    public function product()
    {
        return $this->belongsTo(ProductMaster::class, 'product_id', 'unique_id')->withTrashed();
    }
}
