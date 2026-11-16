<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('money_pools', function (Blueprint $table) {
            // Drop the existing unique constraint on name
            $table->dropUnique(['name']);
            
            // Add a composite unique constraint on name and branch_id
            $table->unique(['name', 'branch_id'], 'money_pools_name_branch_unique');
        });
    }

    public function down(): void
    {
        Schema::table('money_pools', function (Blueprint $table) {
            // Drop the composite unique constraint
            $table->dropUnique('money_pools_name_branch_unique');
            
            // Restore the original unique constraint on name only
            $table->unique('name');
        });
    }
};