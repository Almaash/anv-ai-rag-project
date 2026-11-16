<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('inventory_purchase_items')) {
            return;
        }

        $databaseName = DB::getDatabaseName();
        $foreignKeys = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', $databaseName)
            ->where('TABLE_NAME', 'inventory_purchase_items')
            ->whereIn('COLUMN_NAME', ['purchase_id', 'product_master_id'])
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->pluck('CONSTRAINT_NAME')
            ->unique()
            ->values();

        foreach ($foreignKeys as $foreignKey) {
            DB::statement("ALTER TABLE inventory_purchase_items DROP FOREIGN KEY {$foreignKey}");
        }

        DB::statement('ALTER TABLE inventory_purchase_items MODIFY purchase_id VARCHAR(100) NOT NULL');
        DB::statement('ALTER TABLE inventory_purchase_items MODIFY product_master_id VARCHAR(100) NOT NULL');

        DB::statement(
            "UPDATE inventory_purchase_items pi
             LEFT JOIN inventory_purchases p ON p.id = CAST(pi.purchase_id AS UNSIGNED)
             SET pi.purchase_id = p.unique_id
             WHERE pi.purchase_id IS NOT NULL
               AND pi.purchase_id <> ''
               AND pi.purchase_id REGEXP '^[0-9]+$'"
        );

        DB::statement(
            "UPDATE inventory_purchase_items pi
             LEFT JOIN inventory_product_masters pm ON pm.id = CAST(pi.product_master_id AS UNSIGNED)
             SET pi.product_master_id = pm.unique_id
             WHERE pi.product_master_id IS NOT NULL
               AND pi.product_master_id <> ''
               AND pi.product_master_id REGEXP '^[0-9]+$'"
        );

        Schema::table('inventory_purchase_items', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_purchase_items', 'branch')) {
                $table->string('branch')->nullable()->after('line_total');
            }
            if (!Schema::hasColumn('inventory_purchase_items', 'cms_admin')) {
                $table->string('cms_admin')->nullable()->after('branch');
            }
        });

        DB::statement(
            "UPDATE inventory_purchase_items pi
             LEFT JOIN inventory_purchases p
                ON p.unique_id COLLATE utf8mb4_unicode_ci = pi.purchase_id COLLATE utf8mb4_unicode_ci
             SET pi.branch = COALESCE(pi.branch, p.branch),
                 pi.cms_admin = COALESCE(pi.cms_admin, p.cms_admin)
             WHERE pi.branch IS NULL OR pi.branch = '' OR pi.cms_admin IS NULL OR pi.cms_admin = ''"
        );

        Schema::table('inventory_purchase_items', function (Blueprint $table) {
            $table->index('purchase_id', 'inv_purchase_items_purchase_uid_idx');
            $table->index('product_master_id', 'inv_purchase_items_product_uid_idx');
            if (Schema::hasColumn('inventory_purchase_items', 'branch')) {
                $table->index('branch', 'inv_purchase_items_branch_idx');
            }
            if (Schema::hasColumn('inventory_purchase_items', 'cms_admin')) {
                $table->index('cms_admin', 'inv_purchase_items_cms_admin_idx');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Forward-only migration for safety.
    }
};
