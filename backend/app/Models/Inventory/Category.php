<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\BelongsToBranch;

class Category extends Model
{
    use BelongsToBranch;
    protected $table = 'inventory_categories';

    protected $fillable = [
        'unique_id',
        'name',
        'description',
        'status',
        'branch',
        'branch_id',
        'cms_admin',
        'cms_admin_id',
    ];
}
