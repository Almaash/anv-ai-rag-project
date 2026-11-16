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
        DB::statement("ALTER TABLE loan_customers MODIFY COLUMN status ENUM('field_executive', 'branch_manager', 'branch_support_executive') DEFAULT 'field_executive'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE loan_customers MODIFY COLUMN status ENUM('field_executive', 'branch_manager') DEFAULT 'field_executive'");
    }
};
