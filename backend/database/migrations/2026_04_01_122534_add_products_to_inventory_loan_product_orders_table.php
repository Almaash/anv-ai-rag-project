<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_loan_product_orders', function (Blueprint $table) {
            $table->string('loan_application_id')->nullable()->after('order_code');
            $table->string('customer_unique_id')->nullable()->after('loan_application_id');
            $table->json('products')->nullable()->after('loan_detail')
                ->comment('All products in this order for multi-product support');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_loan_product_orders', function (Blueprint $table) {
            $table->dropColumn(['loan_application_id', 'customer_unique_id', 'products']);
        });
    }
};
