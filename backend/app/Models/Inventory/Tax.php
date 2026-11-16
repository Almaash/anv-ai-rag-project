<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\BelongsToBranch;

class Tax extends Model
{
    protected $table = 'inventory_taxes';
    use BelongsToBranch;

    protected $fillable = ['unique_id', 'name', 'rate', 'status', 'branch'];
}
