<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $indexes = \DB::select("SHOW INDEX FROM inventory_brands WHERE Key_name IN ('inventory_brands_name_unique', 'inventory_brands_branch_name_unique')");
        $existing = array_unique(array_column($indexes, 'Key_name'));

        Schema::table('inventory_brands', function (Blueprint $table) use ($existing) {
            if (in_array('inventory_brands_name_unique', $existing)) {
                $table->dropUnique('inventory_brands_name_unique');
            }
            if (in_array('inventory_brands_branch_name_unique', $existing)) {
                $table->dropUnique('inventory_brands_branch_name_unique');
            }
        });
    }

    public function down(): void
    {
        Schema::table('inventory_brands', function (Blueprint $table) {
            $table->unique(['branch', 'name'], 'inventory_brands_branch_name_unique');
        });
    }
};
