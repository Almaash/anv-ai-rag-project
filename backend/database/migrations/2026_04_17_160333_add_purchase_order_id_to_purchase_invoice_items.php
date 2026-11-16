<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Add purchase_order_id column (nullable first for backfill)
        Schema::table('inventory_purchase_invoice_items', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_purchase_invoice_items', 'purchase_order_id')) {
                $table->unsignedBigInteger('purchase_order_id')->nullable()->after('id');
            }
        });

        // Step 2: Backfill purchase_order_id using invoice -> purchase link
        // inventory_purchase_invoice_items.purchase_invoice_id = inventory_purchase_invoices.invoice_no
        // inventory_purchase_invoices.purchase_id = inventory_purchases.unique_id
        DB::statement("
            UPDATE inventory_purchase_invoice_items AS items
            INNER JOIN inventory_purchase_invoices AS inv
                ON items.purchase_invoice_id = inv.invoice_no
            INNER JOIN inventory_purchases AS pur
                ON inv.purchase_id = pur.unique_id
            SET items.purchase_order_id = pur.id
            WHERE items.purchase_order_id IS NULL
        ");

        // Step 3: Add index for performance (no FK constraint — avoids issues with existing dirty data)
        Schema::table('inventory_purchase_invoice_items', function (Blueprint $table) {
            $table->index('purchase_order_id', 'idx_pii_purchase_order_id');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_purchase_invoice_items', function (Blueprint $table) {
            $table->dropIndex('idx_pii_purchase_order_id');
            $table->dropColumn('purchase_order_id');
        });
    }
};
