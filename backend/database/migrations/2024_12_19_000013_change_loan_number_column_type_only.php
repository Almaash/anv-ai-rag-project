<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if the table and column exist before attempting modification
        if (Schema::hasTable('loan_emi_schedules')) {
            $columnName = Schema::hasColumn('loan_emi_schedules', 'loan_number') ? 'loan_number' : (Schema::hasColumn('loan_emi_schedules', 'loan_id') ? 'loan_id' : null);
            
            if ($columnName) {
                // Drop foreign key if it's loan_id to allow type change
                if ($columnName === 'loan_id') {
                    try {
                        DB::statement("ALTER TABLE loan_emi_schedules DROP FOREIGN KEY emi_schedules_loan_id_foreign");
                    } catch (\Exception $e) {
                        // Ignore if doesn't exist
                    }
                }
                
                DB::statement("ALTER TABLE loan_emi_schedules MODIFY $columnName VARCHAR(255) NOT NULL");
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('loan_emi_schedules')) {
            $columnName = Schema::hasColumn('loan_emi_schedules', 'loan_number') ? 'loan_number' : (Schema::hasColumn('loan_emi_schedules', 'loan_id') ? 'loan_id' : null);

            if ($columnName) {
                // Change back to BIGINT
                DB::statement("ALTER TABLE loan_emi_schedules MODIFY $columnName BIGINT(20) UNSIGNED NOT NULL");
                
                // Restore original foreign key if possible
                if (Schema::hasTable('loan_loans')) {
                    DB::statement("ALTER TABLE loan_emi_schedules ADD CONSTRAINT emi_schedules_loan_id_foreign FOREIGN KEY ($columnName) REFERENCES loan_loans(id)");
                }
            }
        }
    }
};