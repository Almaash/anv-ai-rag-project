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
        // First drop existing foreign key
        try {
            Schema::table('inventory_invoice_items', function (Blueprint $table) {
                // Determine existing foreign key name. Usually 'inventory_invoice_items_product_id_foreign'
                $table->dropForeign(['product_id']);
            });
        } catch (\Exception $e) {
            // If it fails, maybe it already doesn't exist or is named differently
            \Log::warning("Could not drop foreign key on inventory_invoice_items: " . $e->getMessage());
        }

        // Add the new foreign key pointing to inventory_product_masters
        Schema::table('inventory_invoice_items', function (Blueprint $table) {
            $table->foreign('product_id')
                  ->references('id')
                  ->on('inventory_product_masters')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_invoice_items', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            
            $table->foreign('product_id')
                  ->references('id')
                  ->on('inventory_products')
                  ->onDelete('cascade');
        });
    }
};
