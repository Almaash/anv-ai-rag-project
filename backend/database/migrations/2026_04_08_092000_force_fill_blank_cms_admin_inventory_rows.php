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
            'inventory_purchase_items',
            'inventory_purchase_invoices',
            'inventory_purchase_invoice_items',
            'inventory_invoice_items',
            'inventory_attributes',
            'inventory_sales',
        ];

        foreach ($tables as $table) {
            if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'cms_admin')) {
                continue;
            }

            DB::statement(
                "UPDATE {$table}
                 SET cms_admin = 'SYSTEM'
                 WHERE cms_admin IS NULL OR TRIM(cms_admin) = ''"
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
