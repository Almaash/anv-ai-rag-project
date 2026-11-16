<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_direct_sales', function (Blueprint $table) {
            $table->id();
            $table->string('product_id', 50)->nullable();
            $table->string('purchase_item_id', 50)->nullable();
            $table->string('product_name', 255)->nullable();
            $table->string('attribute_summary', 255)->nullable();
            $table->decimal('quantity', 15, 2)->default(0);
            $table->decimal('selling_price', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->string('sale_source', 100)->nullable();
            $table->string('customer_reference', 255)->nullable();
            $table->timestamp('sale_date')->nullable();
            $table->string('branch', 50)->nullable();
            $table->string('branch_id', 50)->nullable();
            $table->string('cms_admin', 50)->nullable();
            $table->string('cms_admin_id', 50)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_direct_sales');
    }
};
