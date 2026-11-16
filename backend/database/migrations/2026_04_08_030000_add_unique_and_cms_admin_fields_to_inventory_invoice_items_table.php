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
        Schema::table('inventory_invoice_items', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_invoice_items', 'unique_id')) {
                $table->string('unique_id')->nullable()->after('id');
            }
            if (!Schema::hasColumn('inventory_invoice_items', 'invoice_unique_id')) {
                $table->string('invoice_unique_id')->nullable()->after('invoice_id');
            }
            if (!Schema::hasColumn('inventory_invoice_items', 'product_unique_id')) {
                $table->string('product_unique_id')->nullable()->after('product_id');
            }
            if (!Schema::hasColumn('inventory_invoice_items', 'purchase_item_unique_id')) {
                $table->string('purchase_item_unique_id')->nullable()->after('purchase_item_id');
            }
            if (!Schema::hasColumn('inventory_invoice_items', 'cms_admin')) {
                $table->string('cms_admin')->nullable()->after('purchase_item_unique_id');
            }
        });

        if (Schema::hasColumn('inventory_invoice_items', 'invoice_id')) {
            DB::statement(
                "UPDATE inventory_invoice_items ii
                 INNER JOIN inventory_invoices i ON i.id = ii.invoice_id
                 SET ii.invoice_unique_id = i.invoice_no
                 WHERE ii.invoice_unique_id IS NULL OR ii.invoice_unique_id = ''"
            );
        }

        if (Schema::hasColumn('inventory_invoice_items', 'product_id')) {
            DB::statement(
                "UPDATE inventory_invoice_items ii
                 INNER JOIN inventory_product_masters pm ON pm.id = ii.product_id
                 SET ii.product_unique_id = pm.unique_id
                 WHERE ii.product_unique_id IS NULL OR ii.product_unique_id = ''"
            );
        }

        if (Schema::hasColumn('inventory_invoice_items', 'purchase_item_id')) {
            DB::statement(
                "UPDATE inventory_invoice_items
                 SET purchase_item_unique_id = CONCAT('INV-PI-', LPAD(CAST(purchase_item_id AS CHAR), 6, '0'))
                 WHERE purchase_item_id IS NOT NULL
                   AND (purchase_item_unique_id IS NULL OR purchase_item_unique_id = '')"
            );
        }

        if (Schema::hasColumn('inventory_invoice_items', 'id')) {
            DB::statement(
                "UPDATE inventory_invoice_items
                 SET unique_id = CONCAT('INV-ITEM-', LPAD(CAST(id AS CHAR), 6, '0'))
                 WHERE unique_id IS NULL OR unique_id = ''"
            );
        }

        Schema::table('inventory_invoice_items', function (Blueprint $table) {
            if (Schema::hasColumn('inventory_invoice_items', 'unique_id')) {
                $table->unique('unique_id', 'inventory_invoice_items_unique_id_unique');
            }
            if (Schema::hasColumn('inventory_invoice_items', 'invoice_unique_id')) {
                $table->index('invoice_unique_id', 'inv_invoice_items_invoice_uid_idx');
            }
            if (Schema::hasColumn('inventory_invoice_items', 'product_unique_id')) {
                $table->index('product_unique_id', 'inv_invoice_items_product_uid_idx');
            }
            if (Schema::hasColumn('inventory_invoice_items', 'purchase_item_unique_id')) {
                $table->index('purchase_item_unique_id', 'inv_invoice_items_purchase_uid_idx');
            }
            if (Schema::hasColumn('inventory_invoice_items', 'cms_admin')) {
                $table->index('cms_admin', 'inv_invoice_items_cms_admin_idx');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_invoice_items', function (Blueprint $table) {
            try {
                $table->dropUnique('inventory_invoice_items_unique_id_unique');
            } catch (\Throwable $e) {
            }

            foreach ([
                'inv_invoice_items_invoice_uid_idx',
                'inv_invoice_items_product_uid_idx',
                'inv_invoice_items_purchase_uid_idx',
                'inv_invoice_items_cms_admin_idx',
            ] as $indexName) {
                try {
                    $table->dropIndex($indexName);
                } catch (\Throwable $e) {
                }
            }

            foreach ([
                'unique_id',
                'invoice_unique_id',
                'product_unique_id',
                'purchase_item_unique_id',
                'cms_admin',
            ] as $column) {
                if (Schema::hasColumn('inventory_invoice_items', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
