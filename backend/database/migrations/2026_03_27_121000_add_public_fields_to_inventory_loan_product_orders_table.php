<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_loan_product_orders', function (Blueprint $table) {
            $table->string('product_unique_id')->nullable()->after('product_master_id');
            $table->decimal('unit_price', 15, 2)->default(0)->after('unit_name');
            $table->decimal('total_cost', 15, 2)->default(0)->after('unit_price');
            $table->unsignedInteger('stock_before_order')->default(0)->after('total_cost');
            $table->unsignedInteger('stock_after_order')->default(0)->after('stock_before_order');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_loan_product_orders', function (Blueprint $table) {
            $table->dropColumn([
                'product_unique_id',
                'unit_price',
                'total_cost',
                'stock_before_order',
                'stock_after_order',
            ]);
        });
    }
};
