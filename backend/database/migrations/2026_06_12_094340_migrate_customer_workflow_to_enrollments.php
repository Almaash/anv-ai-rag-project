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
        DB::statement("
        INSERT INTO customer_enrollments (
            enrollment_number,
            customer_unique_id,
            enrollment_date,
            enrolled_by,
            branch_id,
            cms_admin_id,
            status,
            status_history,
            verification_status,
            verified_by,
            verified_at,
            verification_notes,
            created_at,
            updated_at
        )
        SELECT
            enrollment_number,
            customer_unique_id,
            DATE(
                COALESCE(enrollment_date, created_at)
            ),
            user_id,
            branch_id,
            cms_admin_id,
            status,
            status_history,
            verification_status,
            verified_by,
            verified_at,
            verification_notes,
            NOW(),
            NOW()
        FROM loan_customers
        WHERE enrollment_number IS NOT NULL
    ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            //
        });
    }
};
