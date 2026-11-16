<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\BelongsToBranch;
use App\Models\Inventory\PurchaseItem;

class ProductMaster extends Model
{
    use BelongsToBranch, SoftDeletes;

    protected $table = 'inventory_product_masters';

    protected $fillable = [
        'unique_id',
        'name',
        'sku_code',
        'category_id',
        'brand_id',
        'unit_id',
        'gst_percent',
        'selling_price',
        'stock',
        'description',
        'product_images',
        'status',
        'branch',
        'branch_id',
        'cms_admin',
        'cms_admin_id',
    ];

    protected $casts = [
        'product_images' => 'array',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id', 'unique_id');
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class, 'brand_id', 'unique_id');
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class, 'unit_id', 'unique_id');
    }

    public function purchaseItems()
    {
        return $this->hasMany(PurchaseItem::class, 'product_master_id', 'unique_id');
    }

    public function lastPurchaseItem()
    {
        return $this->hasOne(PurchaseItem::class, 'product_master_id', 'unique_id')->latestOfMany();
    }
}
