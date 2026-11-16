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
        if (!Schema::hasTable('inventory_sales')) {
            return;
        }

        DB::statement('ALTER TABLE inventory_sales MODIFY product_id VARCHAR(100) NOT NULL');

        if (Schema::hasColumn('inventory_sales', 'purchase_item_id')) {
            DB::statement('ALTER TABLE inventory_sales MODIFY purchase_item_id VARCHAR(100) NULL');
        }

        DB::statement(
            "UPDATE inventory_sales s
             LEFT JOIN inventory_product_masters pm ON pm.id = CAST(s.product_id AS UNSIGNED)
             SET s.product_id = pm.unique_id
             WHERE s.product_id IS NOT NULL
               AND s.product_id <> ''
               AND s.product_id REGEXP '^[0-9]+$'"
        );

        if (Schema::hasColumn('inventory_sales', 'purchase_item_id')) {
            DB::statement(
                "UPDATE inventory_sales
                 SET purchase_item_id = CONCAT('INV-PI-', LPAD(CAST(purchase_item_id AS CHAR), 6, '0'))
                 WHERE purchase_item_id IS NOT NULL
                   AND purchase_item_id <> ''
                   AND purchase_item_id REGEXP '^[0-9]+$'"
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('inventory_sales')) {
            return;
        }

        DB::statement(
            "UPDATE inventory_sales s
             LEFT JOIN inventory_product_masters pm ON pm.unique_id = s.product_id
             SET s.product_id = CAST(pm.id AS CHAR)
             WHERE s.product_id IS NOT NULL
               AND s.product_id <> ''
               AND s.product_id REGEXP '^INV-PM-[0-9]+$'"
        );

        if (Schema::hasColumn('inventory_sales', 'purchase_item_id')) {
            DB::statement(
                "UPDATE inventory_sales
                 SET purchase_item_id = CAST(CAST(SUBSTRING_INDEX(purchase_item_id, '-', -1) AS UNSIGNED) AS CHAR)
                 WHERE purchase_item_id IS NOT NULL
                   AND purchase_item_id <> ''
                   AND purchase_item_id REGEXP '^INV-PI-[0-9]+$'"
            );

            DB::statement('ALTER TABLE inventory_sales MODIFY purchase_item_id BIGINT UNSIGNED NULL');
        }

        DB::statement('ALTER TABLE inventory_sales MODIFY product_id BIGINT UNSIGNED NOT NULL');
    }
};
