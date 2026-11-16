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
        // 1. hrms_employees
        try {
            Schema::table('hrms_employees', function (Blueprint $table) {
                $table->dropForeign(['branch_id']);
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('hrms_employees', function (Blueprint $table) {
                $table->dropForeign(['department_id']);
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('hrms_employees', function (Blueprint $table) {
                $table->dropForeign(['designation_id']);
            });
        } catch (\Exception $e) {}

        Schema::table('hrms_employees', function (Blueprint $table) {
            $table->string('branch_id')->change();
            $table->string('department_id')->change();
            $table->string('designation_id')->change();
        });

        // 2. hrms_attendance
        try {
            Schema::table('hrms_attendance', function (Blueprint $table) {
                $table->dropForeign(['employee_id']);
            });
        } catch (\Exception $e) {}

        Schema::table('hrms_attendance', function (Blueprint $table) {
            $table->string('employee_id')->change();
        });

        // 3. hrms_leave_requests
        try {
            Schema::table('hrms_leave_requests', function (Blueprint $table) {
                $table->dropForeign(['employee_id']);
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('hrms_leave_requests', function (Blueprint $table) {
                $table->dropForeign(['leave_type_id']);
            });
        } catch (\Exception $e) {}

        Schema::table('hrms_leave_requests', function (Blueprint $table) {
            $table->string('employee_id')->change();
            $table->string('leave_type_id')->change();
        });

        // 4. hrms_salaries
        try {
            Schema::table('hrms_salaries', function (Blueprint $table) {
                $table->dropForeign(['employee_id']);
            });
        } catch (\Exception $e) {}

        Schema::table('hrms_salaries', function (Blueprint $table) {
            $table->string('employee_id')->change();
        });

        // 5. hrms_salary_structures
        try {
            Schema::table('hrms_salary_structures', function (Blueprint $table) {
                $table->dropForeign(['employee_id']);
            });
        } catch (\Exception $e) {}

        Schema::table('hrms_salary_structures', function (Blueprint $table) {
            $table->string('employee_id')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverting back to unsignedBigInteger and numeric IDs would require knowing the original IDs, 
        // which might not be possible simply through a down migration if data has changed.
    }
};
