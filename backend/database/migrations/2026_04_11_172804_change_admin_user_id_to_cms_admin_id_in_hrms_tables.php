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
        $tables = [
            'hrms_departments',
            'hrms_designations',
            'hrms_holidays',
            'hrms_leave_types',
            'hrms_leave_requests',
            'hrms_attendance',
            'hrms_employees',
            'hrms_salaries',
        ];

        foreach ($tables as $table) {
            if (Schema::hasColumn($table, 'admin_user_id')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->renameColumn('admin_user_id', 'cms_admin_id');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = [
            'hrms_departments',
            'hrms_designations',
            'hrms_holidays',
            'hrms_leave_types',
            'hrms_leave_requests',
            'hrms_attendance',
            'hrms_employees',
            'hrms_salaries',
        ];

        foreach ($tables as $table) {
            if (Schema::hasColumn($table, 'cms_admin_id')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->renameColumn('cms_admin_id', 'admin_user_id');
                });
            }
        }
    }
};
