<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_loan_product_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_code')->unique();
            $table->foreignId('product_master_id')->nullable()->constrained('inventory_product_masters')->nullOnDelete();
            $table->string('product_name');
            $table->string('product_sku_code');
            $table->string('attribute_summary')->nullable();
            $table->unsignedInteger('quantity');
            $table->string('unit_name')->nullable();
            $table->string('loan_reference')->nullable();
            $table->string('customer_name')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('loan_booked');
            $table->string('branch')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_loan_product_orders');
    }
};
