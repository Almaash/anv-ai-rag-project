<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\BelongsToBranch;

class Vendor extends Model
{
    use BelongsToBranch, SoftDeletes;

    protected $table = 'inventory_vendors';

    protected $fillable = [
        'unique_id',
        'name', 'business_name',
        'profile_photo', 'email',
        'phone',
        'address',
        'gst_number',
        'status',
        'branch',
        'branch_id',
        'cms_admin',
        'cms_admin_id',
    ];
}
