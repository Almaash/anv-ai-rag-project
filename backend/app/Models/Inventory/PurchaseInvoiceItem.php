<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;

class PurchaseInvoiceItem extends Model
{
    protected $table = 'inventory_purchase_line_items';

    protected $fillable = [
        'unique_id',
        'purchase_id',
        'product_master_id',
        'branch',
        'cms_admin',
        'branch_id',
        'cms_admin_id',
        'product_name',
        'quantity',
        'purchase_price',
        'selling_price',
        'line_total',
        'tax_percent',
        'tax_amount',
        'attribute_summary',
        'attachments',
    ];

    // Direct FK relation to purchase order via unique_id
    public function purchaseOrder()
    {
        return $this->belongsTo(Purchase::class, 'purchase_id', 'unique_id');
    }

    // Legacy relation via invoice_no
    public function purchaseInvoice()
    {
        return $this->belongsTo(PurchaseInvoice::class, 'purchase_id', 'unique_id');
    }

    public function productMaster()
    {
        return $this->belongsTo(ProductMaster::class, 'product_master_id', 'unique_id');
    }
}

