<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MoneyPool extends Model
{
    use HasFactory;

    protected $fillable = [
        'unique_id',
        'branch_id',
        'cms_admin_id',
        'name',
        'limit_from',
        'limit_to',
        'notes',
        'status',
    ];

    protected $casts = [
        'limit_from' => 'decimal:2',
        'limit_to' => 'decimal:2',
        'status' => 'boolean',
    ];
}
