<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE loan_cam MODIFY COLUMN status ENUM('branch_manager', 'credit_manager', 'reverted_to_pd') DEFAULT 'branch_manager'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE loan_cam MODIFY COLUMN status ENUM('branch_manager', 'credit_manager') DEFAULT 'branch_manager'");
    }
};
