<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_weekly_schedules', function (Blueprint $table) {
            // Make investment_id nullable since we're using investment_unique_id now
            $table->unsignedBigInteger('investment_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('investment_weekly_schedules', function (Blueprint $table) {
            // Revert investment_id back to NOT NULL
            $table->unsignedBigInteger('investment_id')->nullable(false)->change();
        });
    }
};