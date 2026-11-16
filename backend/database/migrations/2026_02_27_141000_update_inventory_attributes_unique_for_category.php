<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_attributes', function (Blueprint $table) {
            try {
                $table->dropUnique('inventory_attributes_branch_name_unique');
            } catch (\Throwable $e) {
                // index might already be changed or not exist
            }

            $table->unique(['branch', 'category_id', 'name'], 'inventory_attributes_branch_category_name_unique');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_attributes', function (Blueprint $table) {
            try {
                $table->dropUnique('inventory_attributes_branch_category_name_unique');
            } catch (\Throwable $e) {
                // ignore
            }

            $table->unique(['branch', 'name'], 'inventory_attributes_branch_name_unique');
        });
    }
};
