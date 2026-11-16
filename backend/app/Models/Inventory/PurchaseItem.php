<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;

class PurchaseItem extends Model
{
    protected $table = 'inventory_purchase_line_items';

    protected $fillable = [
        'unique_id',
        'purchase_id',
        'product_master_id',
        'product_name',
        'branch',
        'cms_admin',
        'branch_id',
        'cms_admin_id',
        'tax_id',
        'tax_percent',
        'tax_amount',
        'quantity',
        'purchase_price',
        'selling_price',
        'line_total',
        'attribute_summary',
        'attachments',
    ];

    protected $casts = [
        'attachments' => 'array',
        'tax_percent' => 'decimal:2',
        'tax_amount' => 'decimal:2',
    ];

    public function purchase()
    {
        return $this->belongsTo(Purchase::class, 'purchase_id', 'unique_id');
    }

    public function productMaster()
    {
        return $this->belongsTo(ProductMaster::class, 'product_master_id', 'unique_id')->withTrashed();
    }
}
