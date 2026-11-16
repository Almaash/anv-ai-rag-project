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
        Schema::table('hrms_holidays', function (Blueprint $table) {
            $table->string('branch_id')->change();
        });

        Schema::table('hrms_leave_types', function (Blueprint $table) {
            $table->string('branch_id')->change();
        });
        
        // Also ensure others are definitely strings
        if (Schema::hasColumn('hrms_departments', 'branch_id')) {
            Schema::table('hrms_departments', function (Blueprint $table) {
                $table->string('branch_id')->change();
            });
        }
        
        if (Schema::hasColumn('hrms_designations', 'branch_id')) {
            Schema::table('hrms_designations', function (Blueprint $table) {
                $table->string('branch_id')->change();
            });
        }

        if (Schema::hasColumn('hrms_attendance', 'branch_id')) {
            Schema::table('hrms_attendance', function (Blueprint $table) {
                $table->string('branch_id')->change();
            });
        }

        if (Schema::hasColumn('hrms_leave_requests', 'branch_id')) {
            Schema::table('hrms_leave_requests', function (Blueprint $table) {
                $table->string('branch_id')->change();
            });
        }

        if (Schema::hasColumn('hrms_salaries', 'branch_id')) {
            Schema::table('hrms_salaries', function (Blueprint $table) {
                $table->string('branch_id')->change();
            });
        }

        if (Schema::hasColumn('hrms_salary_structures', 'branch_id')) {
            Schema::table('hrms_salary_structures', function (Blueprint $table) {
                $table->string('branch_id')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No easy rollback for string branch_id
    }
};
