<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sales order master (customer invoice)
        Schema::rename('inventory_invoices', 'inventory_sales_orders');

        // Sales order line items
        Schema::rename('inventory_invoice_items', 'inventory_sales_order_items');
    }

    public function down(): void
    {
        Schema::rename('inventory_sales_orders', 'inventory_invoices');
        Schema::rename('inventory_sales_order_items', 'inventory_invoice_items');
    }
};
