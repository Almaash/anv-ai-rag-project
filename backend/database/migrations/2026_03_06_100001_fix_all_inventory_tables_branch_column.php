<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'inventory_vendors',
            'inventory_categories',
            'inventory_taxes',
            'inventory_brands',
            'inventory_attributes',
        ];

        foreach ($tables as $table) {
            if (!Schema::hasColumn($table, 'branch')) {
                Schema::table($table, function (Blueprint $blueprint) {
                    $blueprint->string('branch')->default('default')->after('id');
                    $blueprint->index('branch');
                });
            }
        }
        
        foreach ($tables as $table) {
            if ($table === 'inventory_vendors') continue;

            $index = $table . '_name_unique';
            try {
                Schema::table($table, function (Blueprint $blueprint) use ($index) {
                    $blueprint->dropUnique($index);
                });
            } catch (\Exception $e) {}

            try {
                Schema::table($table, function (Blueprint $blueprint) use ($table) {
                    $blueprint->unique(['branch', 'name'], $table . '_branch_name_unique');
                });
            } catch (\Exception $e) {}
        }
    }

    public function down(): void
    {
        $tables = ['inventory_vendors', 'inventory_categories', 'inventory_taxes', 'inventory_brands', 'inventory_attributes'];

        foreach ($tables as $table) {
            if (Schema::hasColumn($table, 'branch')) {
                Schema::table($table, function (Blueprint $blueprint) {
                    $blueprint->dropIndex(['branch']);
                    $blueprint->dropColumn('branch');
                });
            }
        }
    }
};
