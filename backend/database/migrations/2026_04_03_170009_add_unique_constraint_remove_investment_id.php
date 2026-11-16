<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // First drop investment_id if it exists
        if (Schema::hasColumn('investment_weekly_schedules', 'investment_id')) {
            Schema::table('investment_weekly_schedules', function (Blueprint $table) {
                // Drop foreign key first
                $table->dropForeign(['investment_id']);
                $table->dropColumn('investment_id');
            });
        }
        
        // Then try to add unique constraint to unique_id in a separate call
        try {
            Schema::table('investment_weekly_schedules', function (Blueprint $table) {
                $table->unique('unique_id');
            });
        } catch (\Exception $e) {
            // Ignore error if index already exists
        }
    }

    public function down(): void
    {
        Schema::table('investment_weekly_schedules', function (Blueprint $table) {
            // Add back investment_id column
            $table->unsignedBigInteger('investment_id')->nullable()->after('id');
            
            // Remove unique constraint
            $table->dropUnique(['unique_id']);
        });
    }
};