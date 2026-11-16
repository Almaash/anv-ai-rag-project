<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $tables = [
            'inventory_attributes',
            'inventory_invoice_items',
            'inventory_purchases',
            'inventory_purchase_invoices',
            'inventory_purchase_invoice_items',
            'inventory_sales',
        ];

        foreach ($tables as $table) {
            if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'cms_admin')) {
                continue;
            }

            DB::table($table)
                ->whereNull('cms_admin')
                ->orWhere('cms_admin', '')
                ->update(['cms_admin' => 'SYSTEM']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // keep data-safe; no reverse update
    }
};
