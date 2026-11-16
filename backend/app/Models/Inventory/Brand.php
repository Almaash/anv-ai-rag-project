<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\BelongsToBranch;

class Brand extends Model
{
    protected $table = 'inventory_brands';

    use BelongsToBranch;

    protected $fillable = ['unique_id', 'name', 'description', 'logo', 'status', 'branch', 'branch_id', 'cms_admin', 'cms_admin_id'];
}
