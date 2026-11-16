<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Change purchase_order_id from int to string (to store unique_id like INV-PUR-0001)
        Schema::table('inventory_purchase_invoice_items', function (Blueprint $table) {
            $table->dropIndex('idx_pii_purchase_order_id');
            $table->string('purchase_order_id', 50)->nullable()->change();
        });

        // Step 2: Update purchase_order_id from numeric id to unique_id string
        DB::statement("
            UPDATE inventory_purchase_invoice_items AS items
            INNER JOIN inventory_purchases AS pur ON pur.id = CAST(items.purchase_order_id AS UNSIGNED)
            SET items.purchase_order_id = pur.unique_id
            WHERE items.purchase_order_id REGEXP '^[0-9]+$'
        ");

        // Step 3: Re-add index
        Schema::table('inventory_purchase_invoice_items', function (Blueprint $table) {
            $table->index('purchase_order_id', 'idx_pii_purchase_order_id');
        });

        // Step 4: Rename tables
        Schema::rename('inventory_purchases', 'inventory_purchase_orders');
        Schema::rename('inventory_purchase_invoice_items', 'inventory_purchase_order_items');
    }

    public function down(): void
    {
        // Reverse renames
        Schema::rename('inventory_purchase_orders', 'inventory_purchases');
        Schema::rename('inventory_purchase_order_items', 'inventory_purchase_invoice_items');

        // Revert purchase_order_id back to numeric
        DB::statement("
            UPDATE inventory_purchase_invoice_items AS items
            INNER JOIN inventory_purchases AS pur ON pur.unique_id = items.purchase_order_id
            SET items.purchase_order_id = pur.id
        ");

        Schema::table('inventory_purchase_invoice_items', function (Blueprint $table) {
            $table->dropIndex('idx_pii_purchase_order_id');
            $table->unsignedBigInteger('purchase_order_id')->nullable()->change();
            $table->index('purchase_order_id', 'idx_pii_purchase_order_id');
        });
    }
};
