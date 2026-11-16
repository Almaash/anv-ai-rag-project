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
        $databaseName = DB::getDatabaseName();

        // Drop dynamic foreign keys before converting id columns to unique-id text.
        foreach ([
            ['table' => 'inventory_purchases', 'columns' => ['vendor_id']],
            ['table' => 'inventory_purchase_invoices', 'columns' => ['purchase_id']],
            ['table' => 'inventory_purchase_invoice_items', 'columns' => ['purchase_invoice_id', 'product_master_id']],
        ] as $meta) {
            if (!Schema::hasTable($meta['table'])) {
                continue;
            }

            $foreignKeys = DB::table('information_schema.KEY_COLUMN_USAGE')
                ->where('TABLE_SCHEMA', $databaseName)
                ->where('TABLE_NAME', $meta['table'])
                ->whereIn('COLUMN_NAME', $meta['columns'])
                ->whereNotNull('REFERENCED_TABLE_NAME')
                ->pluck('CONSTRAINT_NAME')
                ->unique()
                ->values();

            foreach ($foreignKeys as $foreignKey) {
                DB::statement("ALTER TABLE {$meta['table']} DROP FOREIGN KEY {$foreignKey}");
            }
        }

        // Convert identity columns to unique-id storage.
        if (Schema::hasTable('inventory_purchases') && Schema::hasColumn('inventory_purchases', 'vendor_id')) {
            DB::statement('ALTER TABLE inventory_purchases MODIFY vendor_id VARCHAR(100) NOT NULL');
        }

        if (Schema::hasTable('inventory_purchase_invoices') && Schema::hasColumn('inventory_purchase_invoices', 'purchase_id')) {
            DB::statement('ALTER TABLE inventory_purchase_invoices MODIFY purchase_id VARCHAR(100) NOT NULL');
        }

        if (Schema::hasTable('inventory_purchase_invoice_items')) {
            if (Schema::hasColumn('inventory_purchase_invoice_items', 'purchase_invoice_id')) {
                DB::statement('ALTER TABLE inventory_purchase_invoice_items MODIFY purchase_invoice_id VARCHAR(150) NOT NULL');
            }
            if (Schema::hasColumn('inventory_purchase_invoice_items', 'product_master_id')) {
                DB::statement('ALTER TABLE inventory_purchase_invoice_items MODIFY product_master_id VARCHAR(100) NULL');
            }
        }

        // Backfill unique-id values.
        if (Schema::hasTable('inventory_purchases') && Schema::hasColumn('inventory_purchases', 'vendor_id')) {
            DB::statement(
                "UPDATE inventory_purchases p
                 LEFT JOIN inventory_vendors v ON v.id = CAST(p.vendor_id AS UNSIGNED)
                 SET p.vendor_id = v.unique_id
                 WHERE p.vendor_id IS NOT NULL
                   AND p.vendor_id <> ''
                   AND p.vendor_id REGEXP '^[0-9]+$'"
            );
        }

        if (Schema::hasTable('inventory_purchase_invoices') && Schema::hasColumn('inventory_purchase_invoices', 'purchase_id')) {
            DB::statement(
                "UPDATE inventory_purchase_invoices pi
                 LEFT JOIN inventory_purchases p ON p.id = CAST(pi.purchase_id AS UNSIGNED)
                 SET pi.purchase_id = p.unique_id
                 WHERE pi.purchase_id IS NOT NULL
                   AND pi.purchase_id <> ''
                   AND pi.purchase_id REGEXP '^[0-9]+$'"
            );
        }

        if (Schema::hasTable('inventory_purchase_invoice_items')) {
            if (Schema::hasColumn('inventory_purchase_invoice_items', 'purchase_invoice_id')) {
                DB::statement(
                    "UPDATE inventory_purchase_invoice_items pii
                     LEFT JOIN inventory_purchase_invoices pi ON pi.id = CAST(pii.purchase_invoice_id AS UNSIGNED)
                     SET pii.purchase_invoice_id = pi.invoice_no
                     WHERE pii.purchase_invoice_id IS NOT NULL
                       AND pii.purchase_invoice_id <> ''
                       AND pii.purchase_invoice_id REGEXP '^[0-9]+$'"
                );
            }

            if (Schema::hasColumn('inventory_purchase_invoice_items', 'product_master_id')) {
                DB::statement(
                    "UPDATE inventory_purchase_invoice_items pii
                     LEFT JOIN inventory_product_masters pm ON pm.id = CAST(pii.product_master_id AS UNSIGNED)
                     SET pii.product_master_id = pm.unique_id
                     WHERE pii.product_master_id IS NOT NULL
                       AND pii.product_master_id <> ''
                       AND pii.product_master_id REGEXP '^[0-9]+$'"
                );
            }
        }

        // Add cms_admin / branch where missing.
        if (Schema::hasTable('inventory_purchases')) {
            Schema::table('inventory_purchases', function (Blueprint $table) {
                if (!Schema::hasColumn('inventory_purchases', 'cms_admin')) {
                    $table->string('cms_admin')->nullable()->after('branch');
                }
            });
        }

        if (Schema::hasTable('inventory_purchase_invoices')) {
            Schema::table('inventory_purchase_invoices', function (Blueprint $table) {
                if (!Schema::hasColumn('inventory_purchase_invoices', 'cms_admin')) {
                    $table->string('cms_admin')->nullable()->after('branch');
                }
            });
        }

        if (Schema::hasTable('inventory_purchase_invoice_items')) {
            Schema::table('inventory_purchase_invoice_items', function (Blueprint $table) {
                if (!Schema::hasColumn('inventory_purchase_invoice_items', 'branch')) {
                    $table->string('branch')->nullable()->after('amount');
                }
                if (!Schema::hasColumn('inventory_purchase_invoice_items', 'cms_admin')) {
                    $table->string('cms_admin')->nullable()->after('branch');
                }
            });
        }

        // Backfill branch and cms_admin values from parents where possible.
        if (Schema::hasTable('inventory_purchase_invoices')) {
            DB::statement(
                "UPDATE inventory_purchase_invoices pi
                 LEFT JOIN inventory_purchases p ON p.unique_id = pi.purchase_id
                 SET pi.cms_admin = COALESCE(pi.cms_admin, p.cms_admin)
                 WHERE pi.cms_admin IS NULL OR pi.cms_admin = ''"
            );
        }

        if (Schema::hasTable('inventory_purchase_invoice_items')) {
            DB::statement(
                "UPDATE inventory_purchase_invoice_items pii
                 LEFT JOIN inventory_purchase_invoices pi ON pi.invoice_no = pii.purchase_invoice_id
                 SET pii.branch = COALESCE(pii.branch, pi.branch),
                     pii.cms_admin = COALESCE(pii.cms_admin, pi.cms_admin)
                 WHERE pii.branch IS NULL OR pii.branch = '' OR pii.cms_admin IS NULL OR pii.cms_admin = ''"
            );
        }

        // Helpful indexes.
        if (Schema::hasTable('inventory_purchases')) {
            Schema::table('inventory_purchases', function (Blueprint $table) {
                $table->index('vendor_id', 'inv_purchases_vendor_uid_idx');
                if (Schema::hasColumn('inventory_purchases', 'cms_admin')) {
                    $table->index('cms_admin', 'inv_purchases_cms_admin_idx');
                }
            });
        }

        if (Schema::hasTable('inventory_purchase_invoices')) {
            Schema::table('inventory_purchase_invoices', function (Blueprint $table) {
                $table->index('purchase_id', 'inv_purchase_invoices_purchase_uid_idx');
                if (Schema::hasColumn('inventory_purchase_invoices', 'cms_admin')) {
                    $table->index('cms_admin', 'inv_purchase_invoices_cms_admin_idx');
                }
            });
        }

        if (Schema::hasTable('inventory_purchase_invoice_items')) {
            Schema::table('inventory_purchase_invoice_items', function (Blueprint $table) {
                $table->index('purchase_invoice_id', 'inv_purchase_invoice_items_invoice_uid_idx');
                $table->index('product_master_id', 'inv_purchase_invoice_items_product_uid_idx');
                if (Schema::hasColumn('inventory_purchase_invoice_items', 'branch')) {
                    $table->index('branch', 'inv_purchase_invoice_items_branch_idx');
                }
                if (Schema::hasColumn('inventory_purchase_invoice_items', 'cms_admin')) {
                    $table->index('cms_admin', 'inv_purchase_invoice_items_cms_admin_idx');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Intentionally keep as forward-only data-shape migration for safety.
    }
};
