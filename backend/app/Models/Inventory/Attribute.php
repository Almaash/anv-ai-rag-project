<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\BelongsToBranch;
use App\Models\Inventory\Category;

class Attribute extends Model
{
    protected $table = 'inventory_attributes';

    use BelongsToBranch;

    protected $fillable = ['unique_id', 'name', 'values', 'status', 'branch', 'branch_id', 'category_id', 'cms_admin', 'cms_admin_id'];

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id', 'unique_id');
    }
}
