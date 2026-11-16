<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\BelongsToBranch;

class Unit extends Model
{
    use HasFactory, BelongsToBranch;

    protected $table = 'inventory_units';

    protected $fillable = [
        'unique_id',
        'admin_user_id',
        'unit_name',
        'short_name',
        'description',
        'status',
        'branch',
        'branch_id',
        'cms_admin',
        'cms_admin_id',
    ];
}

