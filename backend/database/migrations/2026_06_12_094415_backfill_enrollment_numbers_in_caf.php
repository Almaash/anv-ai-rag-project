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
        UPDATE loan_credit_application_forms caf
        JOIN customer_enrollments ce
            ON ce.customer_unique_id = caf.customer_unique_id
        SET caf.enrollment_number = ce.enrollment_number
        WHERE caf.enrollment_number IS NULL
    ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('caf', function (Blueprint $table) {
            //
        });
    }
};
