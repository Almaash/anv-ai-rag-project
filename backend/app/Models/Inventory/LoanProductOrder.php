<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;

class LoanProductOrder extends Model
{
    protected $table = 'inventory_loan_product_orders';

    protected $fillable = [
        'order_code',
        'loan_application_id',
        'customer_unique_id',
        'total_cost',
        'loan_detail',
        'products',
        'notes',
        'status',
        'branch',
    ];

    protected $casts = [
        'loan_detail' => 'array',
        'products'    => 'array',
        'total_cost'  => 'float',
    ];
}
