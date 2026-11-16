<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $tables = [
        'hrms_employees',
        'hrms_departments',
        'hrms_designations',
        'hrms_attendance',
        'hrms_leave_requests',
        'hrms_salaries',
        'hrms_salary_structures',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (!Schema::hasTable($table)) continue;
            if (!Schema::hasColumn($table, 'branch_id')) continue;

            // Drop foreign key if exists
            try {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropForeign(['branch_id']);
                });
            } catch (\Exception $e) {
                // No FK, continue
            }

            // Change to varchar to store branch code e.g. BR0001
            DB::statement("ALTER TABLE `{$table}` MODIFY COLUMN `branch_id` VARCHAR(50) NULL");
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            if (!Schema::hasTable($table)) continue;
            if (!Schema::hasColumn($table, 'branch_id')) continue;
            DB::statement("ALTER TABLE `{$table}` MODIFY COLUMN `branch_id` BIGINT UNSIGNED NULL");
        }
    }
};
