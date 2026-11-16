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
        if (!Schema::hasTable('inventory_product_masters')) {
            return;
        }

        $databaseName = DB::getDatabaseName();

        $foreignKeys = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', $databaseName)
            ->where('TABLE_NAME', 'inventory_product_masters')
            ->whereIn('COLUMN_NAME', ['category_id', 'brand_id', 'unit_id'])
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->pluck('CONSTRAINT_NAME')
            ->unique()
            ->values();

        foreach ($foreignKeys as $foreignKey) {
            DB::statement("ALTER TABLE inventory_product_masters DROP FOREIGN KEY {$foreignKey}");
        }

        DB::statement('ALTER TABLE inventory_product_masters MODIFY category_id VARCHAR(100) NULL');
        DB::statement('ALTER TABLE inventory_product_masters MODIFY brand_id VARCHAR(100) NULL');
        DB::statement('ALTER TABLE inventory_product_masters MODIFY unit_id VARCHAR(100) NULL');

        DB::statement(
            "UPDATE inventory_product_masters pm
             LEFT JOIN inventory_categories c ON c.id = CAST(pm.category_id AS UNSIGNED)
             SET pm.category_id = c.unique_id
             WHERE pm.category_id IS NOT NULL
               AND pm.category_id <> ''
               AND pm.category_id REGEXP '^[0-9]+$'"
        );

        DB::statement(
            "UPDATE inventory_product_masters pm
             LEFT JOIN inventory_brands b ON b.id = CAST(pm.brand_id AS UNSIGNED)
             SET pm.brand_id = b.unique_id
             WHERE pm.brand_id IS NOT NULL
               AND pm.brand_id <> ''
               AND pm.brand_id REGEXP '^[0-9]+$'"
        );

        DB::statement(
            "UPDATE inventory_product_masters pm
             LEFT JOIN inventory_units u ON u.id = CAST(pm.unit_id AS UNSIGNED)
             SET pm.unit_id = u.unique_id
             WHERE pm.unit_id IS NOT NULL
               AND pm.unit_id <> ''
               AND pm.unit_id REGEXP '^[0-9]+$'"
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Forward-only migration for safety.
    }
};
