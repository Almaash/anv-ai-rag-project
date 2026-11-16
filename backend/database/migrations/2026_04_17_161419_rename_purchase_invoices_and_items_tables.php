<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // inventory_purchase_invoices = payment receipts/snapshots
        Schema::rename('inventory_purchase_invoices', 'inventory_purchase_receipts');

        // inventory_purchase_items = actual purchased line items (stock)
        Schema::rename('inventory_purchase_items', 'inventory_purchase_line_items');
    }

    public function down(): void
    {
        Schema::rename('inventory_purchase_receipts', 'inventory_purchase_invoices');
        Schema::rename('inventory_purchase_line_items', 'inventory_purchase_items');
    }
};
