<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('inventory_sales', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('purchase_item_id')->nullable();
            $table->string('product_name');
            $table->string('attribute_summary')->nullable();
            $table->decimal('quantity', 15, 2);
            $table->decimal('selling_price', 15, 2);
            $table->decimal('total_amount', 15, 2);
            $table->string('sale_source')->default('inventory');
            $table->string('customer_reference')->nullable();
            $table->timestamp('sale_date')->useCurrent();
            $table->string('branch')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_sales');
    }
};
