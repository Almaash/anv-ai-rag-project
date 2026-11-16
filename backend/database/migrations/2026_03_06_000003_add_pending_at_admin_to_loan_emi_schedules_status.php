<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `loan_emi_schedules` MODIFY `status` ENUM('pending', 'pending_at_admin', 'paid', 'partial', 'overdue') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `loan_emi_schedules` MODIFY `status` ENUM('pending', 'paid', 'partial', 'overdue') NOT NULL DEFAULT 'pending'");
    }
};
