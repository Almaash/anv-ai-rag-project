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
        // 1. Convert back to string temporarily to allow rename
        DB::statement("ALTER TABLE loan_customers MODIFY COLUMN status VARCHAR(255)");
        
        // 2. Rename old value to new value
        DB::table('loan_customers')
            ->where('status', 'customer_executive')
            ->update(['status' => 'field_executive']);

        // 3. Set the final ENUM values
        DB::statement("ALTER TABLE loan_customers MODIFY COLUMN status ENUM('field_executive', 'branch_manager') DEFAULT 'field_executive'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE loan_customers MODIFY COLUMN status VARCHAR(255)");
        
        DB::table('loan_customers')
            ->where('status', 'field_executive')
            ->update(['status' => 'customer_executive']);

        DB::statement("ALTER TABLE loan_customers MODIFY COLUMN status ENUM('customer_executive', 'branch_manager') DEFAULT 'customer_executive'");
    }
};
