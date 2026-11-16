<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('loan_emi_schedules', function (Blueprint $table) {
            DB::statement("ALTER TABLE `loan_emi_schedules` MODIFY `status` ENUM('pending', 'pending_at_admin', 'paid', 'partial', 'overdue') NOT NULL DEFAULT 'pending'");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_emi_schedules', function (Blueprint $table) {
            DB::statement("ALTER TABLE `loan_emi_schedules` MODIFY `status` ENUM('pending', 'paid', 'overdue', 'partial') NOT NULL DEFAULT 'pending'");
        });
    }
};
