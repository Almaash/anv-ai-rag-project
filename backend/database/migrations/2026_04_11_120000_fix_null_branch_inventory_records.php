<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Fix records with null/empty/default branch - assign to HZB-4401
        $tables = [
            'inventory_vendors',
            'inventory_product_masters',
            'inventory_categories',
            'inventory_brands',
            'inventory_units',
            'inventory_purchases',
            'inventory_invoices',
            'inventory_purchase_items',
        ];

        foreach ($tables as $table) {
            try {
                DB::statement("UPDATE `{$table}` SET branch='HZB-4401' WHERE branch IS NULL OR branch='' OR branch='default'");
                if (DB::getSchemaBuilder()->hasColumn($table, 'branch_id')) {
                    DB::statement("UPDATE `{$table}` SET branch_id='HZB-4401' WHERE branch_id IS NULL OR branch_id='' OR branch_id='default'");
                }
            } catch (\Exception $e) {
                // skip if table doesn't exist
            }
        }
    }

    public function down(): void {}
};
