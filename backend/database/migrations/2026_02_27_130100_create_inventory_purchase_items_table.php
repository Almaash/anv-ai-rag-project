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
        Schema::create('inventory_purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained('inventory_purchases')->onDelete('cascade');
            $table->foreignId('product_master_id')->constrained('inventory_product_masters')->onDelete('cascade');
            $table->foreignId('tax_id')->nullable()->constrained('inventory_taxes')->nullOnDelete();
            $table->integer('quantity')->default(0);
            $table->decimal('purchase_price', 15, 2)->default(0);
            $table->decimal('line_total', 15, 2)->default(0);
            $table->text('attribute_summary')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_purchase_items');
    }
};
