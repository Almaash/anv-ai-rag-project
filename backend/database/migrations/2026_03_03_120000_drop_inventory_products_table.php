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
        Schema::dropIfExists('inventory_products');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('inventory_products', function (Blueprint $table) {
            $table->id();
            $table->string('branch')->nullable()->index();
            $table->string('unique_id')->unique();
            $table->string('name');
            $table->string('sku_code');
            $table->unique(['branch', 'sku_code'], 'inventory_products_branch_sku_code_unique');
            $table->foreignId('brand_id')->nullable()->constrained('inventory_brands')->nullOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('inventory_categories')->nullOnDelete();
            $table->foreignId('attribute_id')->nullable()->constrained('inventory_attributes')->nullOnDelete();
            $table->string('attribute_value')->nullable();
            $table->foreignId('unit_id')->nullable()->constrained('inventory_units')->nullOnDelete();
            $table->foreignId('tax_id')->nullable()->constrained('inventory_taxes')->nullOnDelete();
            $table->string('image')->nullable();
            $table->text('description')->nullable();
            $table->decimal('purchase_price', 15, 2)->default(0);
            $table->decimal('selling_price', 15, 2)->default(0);
            $table->integer('opening_stock')->default(0);
            $table->integer('low_stock_quantity')->default(0);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });
    }
};
