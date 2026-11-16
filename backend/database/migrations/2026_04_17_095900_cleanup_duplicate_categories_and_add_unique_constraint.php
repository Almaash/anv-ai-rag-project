<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // First, identify and remove duplicate categories
        // Keep the oldest record for each branch-name combination
        $duplicates = DB::select("
            SELECT branch, name, MIN(id) as keep_id
            FROM inventory_categories 
            WHERE branch IS NOT NULL AND name IS NOT NULL
            GROUP BY branch, name 
            HAVING COUNT(*) > 1
        ");

        foreach ($duplicates as $duplicate) {
            // Delete all records except the one we want to keep
            DB::delete("
                DELETE FROM inventory_categories 
                WHERE branch = ? AND name = ? AND id != ?
            ", [$duplicate->branch, $duplicate->name, $duplicate->keep_id]);
        }

        // Check if unique constraint already exists before adding it
        $constraintExists = DB::select("
            SELECT COUNT(*) as count 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'inventory_categories_branch_name_unique' 
            AND table_name = 'inventory_categories'
        ");

        if ($constraintExists[0]->count == 0) {
            Schema::table('inventory_categories', function (Blueprint $table) {
                $table->unique(['branch', 'name'], 'inventory_categories_branch_name_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::table('inventory_categories', function (Blueprint $table) {
            try {
                $table->dropUnique('inventory_categories_branch_name_unique');
            } catch (\Throwable $e) {
                // Ignore if constraint doesn't exist
            }
        });
    }
};