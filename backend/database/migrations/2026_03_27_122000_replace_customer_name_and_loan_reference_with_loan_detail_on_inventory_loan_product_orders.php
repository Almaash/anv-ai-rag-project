<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_loan_product_orders', function (Blueprint $table) {
            $table->json('loan_detail')->nullable()->after('stock_after_order');
            $table->dropColumn(['loan_reference', 'customer_name']);
        });
    }

    public function down(): void
    {
        Schema::table('inventory_loan_product_orders', function (Blueprint $table) {
            $table->string('loan_reference')->nullable()->after('stock_after_order');
            $table->string('customer_name')->nullable()->after('loan_reference');
            $table->dropColumn('loan_detail');
        });
    }
};
