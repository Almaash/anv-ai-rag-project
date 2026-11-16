<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Add missing columns to inventory_purchase_line_items
        Schema::table('inventory_purchase_line_items', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_purchase_line_items', 'product_name')) {
                $table->string('product_name', 255)->nullable()->after('product_master_id');
            }
            if (!Schema::hasColumn('inventory_purchase_line_items', 'unique_id')) {
                $table->string('unique_id', 50)->nullable()->after('id');
            }
        });

        // Step 2: Backfill product_name from inventory_product_masters
        DB::statement("
            UPDATE inventory_purchase_line_items AS li
            INNER JOIN inventory_product_masters AS pm
                ON li.product_master_id COLLATE utf8mb4_unicode_ci = pm.unique_id COLLATE utf8mb4_unicode_ci
            SET li.product_name = pm.name
            WHERE li.product_name IS NULL OR li.product_name = ''
        ");

        // Step 3: Generate unique_id for each line item (INV-PLI-XXXXX)
        $items = DB::table('inventory_purchase_line_items')
            ->whereNull('unique_id')
            ->orWhere('unique_id', '')
            ->orderBy('id')
            ->pluck('id');

        foreach ($items as $id) {
            DB::table('inventory_purchase_line_items')
                ->where('id', $id)
                ->update(['unique_id' => 'INV-PLI-' . str_pad($id, 5, '0', STR_PAD_LEFT)]);
        }

        // Step 4: Add index on purchase_id for fast parent-child lookup
        $indexExists = collect(DB::select("SHOW INDEX FROM inventory_purchase_line_items WHERE Key_name = 'idx_pli_purchase_id'"))->isNotEmpty();
        if (!$indexExists) {
            Schema::table('inventory_purchase_line_items', function (Blueprint $table) {
                $table->index('purchase_id', 'idx_pli_purchase_id');
            });
        }
    }

    public function down(): void
    {
        Schema::table('inventory_purchase_line_items', function (Blueprint $table) {
            $table->dropIndex('idx_pli_purchase_id');
            $table->dropColumn(['product_name', 'unique_id']);
        });
    }
};
