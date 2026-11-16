<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Migrate existing single-product data into products JSON before dropping columns
        DB::table('inventory_loan_product_orders')
            ->whereNull('products')
            ->get()
            ->each(function ($row) {
                DB::table('inventory_loan_product_orders')
                    ->where('id', $row->id)
                    ->update([
                        'products' => json_encode([[
                            'product_master_id'  => $row->product_master_id,
                            'product_unique_id'  => $row->product_unique_id,
                            'product_name'       => $row->product_name,
                            'product_sku_code'   => $row->product_sku_code,
                            'attribute_summary'  => $row->attribute_summary,
                            'quantity'           => $row->quantity,
                            'unit_name'          => $row->unit_name,
                            'unit_price'         => $row->unit_price,
                            'total_cost'         => $row->total_cost,
                            'credit_applied_for' => $row->total_cost,
                            'stock_before'       => $row->stock_before_order,
                            'stock_after'        => $row->stock_after_order,
                        ]]),
                    ]);
            });

        Schema::table('inventory_loan_product_orders', function (Blueprint $table) {
            $table->dropForeign(['product_master_id']);
            $table->dropColumn([
                'product_master_id',
                'product_unique_id',
                'product_name',
                'product_sku_code',
                'attribute_summary',
                'quantity',
                'unit_name',
                'unit_price',
                'stock_before_order',
                'stock_after_order',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('inventory_loan_product_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('product_master_id')->nullable();
            $table->string('product_unique_id')->nullable();
            $table->string('product_name')->nullable();
            $table->string('product_sku_code')->nullable();
            $table->string('attribute_summary')->nullable();
            $table->integer('quantity')->nullable();
            $table->string('unit_name')->nullable();
            $table->decimal('unit_price', 12, 2)->nullable();
            $table->integer('stock_before_order')->nullable();
            $table->integer('stock_after_order')->nullable();
        });
    }
};
