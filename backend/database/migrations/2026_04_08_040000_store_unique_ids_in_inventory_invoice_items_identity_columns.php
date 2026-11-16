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
        $databaseName = DB::getDatabaseName();

        $foreignKeys = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', $databaseName)
            ->where('TABLE_NAME', 'inventory_invoice_items')
            ->whereIn('COLUMN_NAME', ['invoice_id', 'product_id', 'purchase_item_id'])
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->pluck('CONSTRAINT_NAME')
            ->unique()
            ->values();

        foreach ($foreignKeys as $foreignKey) {
            DB::statement("ALTER TABLE inventory_invoice_items DROP FOREIGN KEY {$foreignKey}");
        }

        DB::statement('ALTER TABLE inventory_invoice_items MODIFY invoice_id VARCHAR(100) NULL');
        DB::statement('ALTER TABLE inventory_invoice_items MODIFY product_id VARCHAR(100) NULL');

        if (Schema::hasColumn('inventory_invoice_items', 'purchase_item_id')) {
            DB::statement('ALTER TABLE inventory_invoice_items MODIFY purchase_item_id VARCHAR(100) NULL');
        }

        DB::statement(
            "UPDATE inventory_invoice_items
             SET invoice_id = invoice_unique_id
             WHERE (invoice_id IS NULL OR invoice_id = '' OR invoice_id REGEXP '^[0-9]+$')
               AND invoice_unique_id IS NOT NULL
               AND invoice_unique_id <> ''"
        );

        DB::statement(
            "UPDATE inventory_invoice_items
             SET product_id = product_unique_id
             WHERE (product_id IS NULL OR product_id = '' OR product_id REGEXP '^[0-9]+$')
               AND product_unique_id IS NOT NULL
               AND product_unique_id <> ''"
        );

        if (Schema::hasColumn('inventory_invoice_items', 'purchase_item_id') && Schema::hasColumn('inventory_invoice_items', 'purchase_item_unique_id')) {
            DB::statement(
                "UPDATE inventory_invoice_items
                 SET purchase_item_id = purchase_item_unique_id
                 WHERE (purchase_item_id IS NULL OR purchase_item_id = '' OR purchase_item_id REGEXP '^[0-9]+$')
                   AND purchase_item_unique_id IS NOT NULL
                   AND purchase_item_unique_id <> ''"
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement(
            "UPDATE inventory_invoice_items ii
             LEFT JOIN inventory_invoices i ON i.invoice_no = ii.invoice_id
             SET ii.invoice_id = CAST(i.id AS CHAR)
             WHERE ii.invoice_id IS NOT NULL
               AND ii.invoice_id <> ''
               AND ii.invoice_id REGEXP '^INV-[0-9]{8}-[0-9]{4}$'"
        );

        DB::statement(
            "UPDATE inventory_invoice_items ii
             LEFT JOIN inventory_product_masters pm ON pm.unique_id = ii.product_id
             SET ii.product_id = CAST(pm.id AS CHAR)
             WHERE ii.product_id IS NOT NULL
               AND ii.product_id <> ''
               AND ii.product_id REGEXP '^INV-PM-[0-9]+$'"
        );

        if (Schema::hasColumn('inventory_invoice_items', 'purchase_item_id')) {
            DB::statement(
                "UPDATE inventory_invoice_items
                 SET purchase_item_id = CAST(CAST(SUBSTRING_INDEX(purchase_item_id, '-', -1) AS UNSIGNED) AS CHAR)
                 WHERE purchase_item_id IS NOT NULL
                   AND purchase_item_id <> ''
                   AND purchase_item_id REGEXP '^INV-PI-[0-9]+$'"
            );

            DB::statement('ALTER TABLE inventory_invoice_items MODIFY purchase_item_id BIGINT UNSIGNED NULL');
        }

        DB::statement('ALTER TABLE inventory_invoice_items MODIFY invoice_id BIGINT UNSIGNED NOT NULL');
        DB::statement('ALTER TABLE inventory_invoice_items MODIFY product_id BIGINT UNSIGNED NOT NULL');
    }
};
