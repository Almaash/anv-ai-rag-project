<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add investment_unique_id column if it doesn't exist
        if (!Schema::hasColumn('investment_weekly_schedules', 'investment_unique_id')) {
            Schema::table('investment_weekly_schedules', function (Blueprint $table) {
                $table->string('investment_unique_id')->after('investment_id');
            });
        }
        
        // Add new indexes
        Schema::table('investment_weekly_schedules', function (Blueprint $table) {
            $table->index(['investment_unique_id', 'week_number'], 'iws_unique_id_week_idx');
            $table->index(['investment_unique_id', 'date'], 'iws_unique_id_date_idx');
        });
    }

    public function down(): void
    {
        Schema::table('investment_weekly_schedules', function (Blueprint $table) {
            $table->dropIndex('iws_unique_id_week_idx');
            $table->dropIndex('iws_unique_id_date_idx');
            $table->dropColumn('investment_unique_id');
        });
    }
};