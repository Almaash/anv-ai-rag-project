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
        Schema::create('inventory_product_masters', function (Blueprint $table) {
            $table->id();
            $table->string('unique_id')->unique();
            $table->string('name');
            $table->string('sku_code');
            $table->foreignId('category_id')->nullable()->constrained('inventory_categories')->onDelete('set null');
            $table->foreignId('brand_id')->nullable()->constrained('inventory_brands')->onDelete('set null');
            $table->foreignId('unit_id')->nullable()->constrained('inventory_units')->onDelete('set null');
            $table->decimal('gst_percent', 5, 2)->default(0); // simple GST % stored here itself
            $table->decimal('selling_price', 15, 2)->default(0);
            $table->integer('stock')->default(0);
            $table->text('description')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->string('branch')->nullable();
            $table->timestamps();

            $table->unique(['branch', 'sku_code'], 'inventory_product_masters_branch_sku_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_product_masters');
    }
};
