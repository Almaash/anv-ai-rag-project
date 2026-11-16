<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;

class InventorySale extends Model
{
    protected $table = 'inventory_direct_sales';

    protected $fillable = [
        'product_id',
        'purchase_item_id',
        'product_name',
        'attribute_summary',
        'quantity',
        'selling_price',
        'total_amount',
        'sale_source',
        'customer_reference',
        'sale_date',
        'branch',
        'branch_id',
        'cms_admin',
        'cms_admin_id',
    ];

    protected $casts = [
        'sale_date' => 'datetime',
        'quantity' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function product()
    {
        return $this->belongsTo(ProductMaster::class, 'product_id', 'unique_id');
    }

    public function purchaseItem()
    {
        return $this->belongsTo(PurchaseItem::class, 'purchase_item_id', 'id');
    }
}
