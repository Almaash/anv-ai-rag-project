<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_emi_payments', function (Blueprint $table) {
            $table->tinyInteger('is_pre_close')->default(0)->after('is_deleted');
        });

        DB::statement("ALTER TABLE `loan_emi_schedules` MODIFY COLUMN `status` ENUM('pending','paid','overdue','partial','pending_at_admin','closed','pre_closed') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        Schema::table('loan_emi_payments', function (Blueprint $table) {
            $table->dropColumn('is_pre_close');
        });

        DB::statement("ALTER TABLE `loan_emi_schedules` MODIFY COLUMN `status` ENUM('pending','paid','overdue','partial','pending_at_admin') NOT NULL DEFAULT 'pending'");
    }
};
