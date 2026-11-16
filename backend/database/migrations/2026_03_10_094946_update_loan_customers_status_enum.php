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
        // 1. Convert to string temporarily to allow ANY value
        DB::statement("ALTER TABLE loan_customers MODIFY COLUMN status VARCHAR(255) DEFAULT 'customer_executive'");
        
        // 2. Update all existing data to the new default
        DB::table('loan_customers')->update(['status' => 'customer_executive']);

        // 3. Set the new ENUM values
        DB::statement("ALTER TABLE loan_customers MODIFY COLUMN status ENUM('customer_executive', 'branch_manager') DEFAULT 'customer_executive'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_customers', function (Blueprint $table) {
             DB::statement("ALTER TABLE loan_customers MODIFY COLUMN status ENUM('active', 'inactive') DEFAULT 'active'");
        });
    }
};
