<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add foreign keys to hrms_employees
        try {
            Schema::table('hrms_employees', function (Blueprint $table) {
                $table->foreign('branch_id')->references('code')->on('branches')->onDelete('cascade');
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('hrms_employees', function (Blueprint $table) {
                $table->foreign('department_id', 'hrms_employees_department_id_foreign_new')->references('dept_id')->on('hrms_departments')->onDelete('cascade');
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('hrms_employees', function (Blueprint $table) {
                $table->foreign('designation_id', 'hrms_employees_designation_id_foreign_new')->references('designation_id')->on('hrms_designations')->onDelete('cascade');
            });
        } catch (\Exception $e) {}

        // Add foreign key to hrms_attendance
        try {
            Schema::table('hrms_attendance', function (Blueprint $table) {
                $table->foreign('employee_id')->references('employee_id')->on('hrms_employees')->onDelete('cascade');
            });
        } catch (\Exception $e) {}

        // Add foreign keys to hrms_leave_requests
        try {
            Schema::table('hrms_leave_requests', function (Blueprint $table) {
                $table->foreign('employee_id')->references('employee_id')->on('hrms_employees')->onDelete('cascade');
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('hrms_leave_requests', function (Blueprint $table) {
                $table->foreign('leave_type_id', 'hrms_leave_requests_leave_type_id_foreign_new')->references('leave_type_id')->on('hrms_leave_types')->onDelete('cascade');
            });
        } catch (\Exception $e) {}

        // Add foreign keys to hrms_salaries
        try {
            Schema::table('hrms_salaries', function (Blueprint $table) {
                $table->foreign('employee_id')->references('employee_id')->on('hrms_employees')->onDelete('cascade');
            });
        } catch (\Exception $e) {}

        // Add foreign keys to hrms_salary_structures
        try {
            Schema::table('hrms_salary_structures', function (Blueprint $table) {
                $table->foreign('employee_id')->references('employee_id')->on('hrms_employees')->onDelete('cascade');
            });
        } catch (\Exception $e) {}
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hrms_employees', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropForeign(['department_id']);
            $table->dropForeign(['designation_id']);
        });

        Schema::table('hrms_attendance', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
        });

        Schema::table('hrms_leave_requests', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
            $table->dropForeign(['leave_type_id']);
        });

        Schema::table('hrms_salaries', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
        });

        Schema::table('hrms_salary_structures', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
        });
    }
};
