<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_units', function (Blueprint $table) {
            // Drop global unique constraints if they exist
            try {
                $table->dropUnique('inventory_units_unit_name_unique');
            } catch (\Throwable $e) {
                // index might not exist; ignore
            }

            try {
                $table->dropUnique('inventory_units_short_name_unique');
            } catch (\Throwable $e) {
                // index might not exist; ignore
            }

            // Add per-branch unique constraints
            $table->unique(['branch', 'unit_name'], 'inventory_units_branch_unit_name_unique');
            $table->unique(['branch', 'short_name'], 'inventory_units_branch_short_name_unique');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_units', function (Blueprint $table) {
            try {
                $table->dropUnique('inventory_units_branch_unit_name_unique');
            } catch (\Throwable $e) {
            }

            try {
                $table->dropUnique('inventory_units_branch_short_name_unique');
            } catch (\Throwable $e) {
            }

            // Optionally restore global uniques
            $table->unique('unit_name', 'inventory_units_unit_name_unique');
            $table->unique('short_name', 'inventory_units_short_name_unique');
        });
    }
};
