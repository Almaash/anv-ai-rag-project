<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Tables that already have branch_id as bigint (need type change to varchar)
    private array $hasBigintBranchId = [
        'inventory_vendors',
        'inventory_units',
        'inventory_categories',
        'inventory_brands',
        'inventory_attributes',
    ];

    // All inventory tables that need branch_id (varchar) + cms_admin_id
    private array $tables = [
        'inventory_vendors',
        'inventory_units',
        'inventory_categories',
        'inventory_brands',
        'inventory_attributes',
        'inventory_product_masters',
        'inventory_purchases',
        'inventory_purchase_items',
        'inventory_purchase_invoices',
        'inventory_purchase_invoice_items',
        'inventory_invoices',
        'inventory_invoice_items',
        'inventory_sales',
        'inventory_payments',
    ];

    public function up(): void
    {
        // Step 1: Fix tables that have branch_id as bigint — change to varchar
        foreach ($this->hasBigintBranchId as $table) {
            if (!Schema::hasTable($table)) continue;
            // Drop index first if exists, then change column type
            DB::statement("ALTER TABLE `{$table}` MODIFY COLUMN `branch_id` VARCHAR(255) NULL");
        }

        // Step 2: Add branch_id / cms_admin_id where missing
        foreach ($this->tables as $table) {
            if (!Schema::hasTable($table)) continue;

            Schema::table($table, function (Blueprint $t) use ($table) {
                if (!Schema::hasColumn($table, 'branch_id')) {
                    $t->string('branch_id')->nullable()->index();
                }
                if (!Schema::hasColumn($table, 'cms_admin_id')) {
                    $t->string('cms_admin_id')->nullable()->index();
                }
                if (!Schema::hasColumn($table, 'cms_admin')) {
                    $t->string('cms_admin')->nullable()->index();
                }
            });
        }

        // Step 3: Backfill branch_id from branch, cms_admin_id from cms_admin
        foreach ($this->tables as $table) {
            if (!Schema::hasTable($table)) continue;

            if (Schema::hasColumn($table, 'branch')) {
                DB::statement("UPDATE `{$table}` SET `branch_id` = `branch` WHERE `branch_id` IS NULL AND `branch` IS NOT NULL AND `branch` != '' AND `branch` != 'default'");
            }

            if (Schema::hasColumn($table, 'cms_admin')) {
                DB::statement("UPDATE `{$table}` SET `cms_admin_id` = `cms_admin` WHERE `cms_admin_id` IS NULL AND `cms_admin` IS NOT NULL AND `cms_admin` != '' AND `cms_admin` != 'SYSTEM'");
            }
        }
    }

    public function down(): void
    {
        // NO-OP or Safe down logic to avoid type mismatch errors if branch_id contains UUID/String
        return;
        
        // Restore bigint branch_id on tables that originally had it
        foreach ($this->hasBigintBranchId as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'branch_id')) {
                DB::statement("ALTER TABLE `{$table}` MODIFY COLUMN `branch_id` BIGINT UNSIGNED NULL");
            }
        }

        // Drop newly added columns on tables that didn't have them
        $hadBranchId = array_flip($this->hasBigintBranchId);
        foreach ($this->tables as $table) {
            if (!Schema::hasTable($table)) continue;
            Schema::table($table, function (Blueprint $t) use ($table, $hadBranchId) {
                if (!isset($hadBranchId[$table]) && Schema::hasColumn($table, 'branch_id')) {
                    $t->dropColumn('branch_id');
                }
                if (Schema::hasColumn($table, 'cms_admin_id')) {
                    $t->dropColumn('cms_admin_id');
                }
            });
        }
    }
};
