<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = [
        'hrms_designations',
        'hrms_departments',
        'hrms_leave_types',
        'hrms_holidays',
        'hrms_attendance',
        'hrms_leave_requests',
        'hrms_salary_structures',
        'hrms_salaries',
        'hrms_employee_personal_details',
        'hrms_employee_addresses',
        'hrms_employee_bank_details',
        'hrms_employee_documents',
        'hrms_employee_leave_balances',
    ];

    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (!Schema::hasColumn($tableName, 'admin_user_id')) {
                    $table->string('admin_user_id')->nullable()->after('id');
                    $table->index('admin_user_id');
                }
                if (!Schema::hasColumn($tableName, 'branch_id')) {
                    $table->unsignedBigInteger('branch_id')->nullable()->after('admin_user_id');
                    $table->index('branch_id');
                }
            });
        }

        // Backfill employee-linked HRMS tables from employee tenancy fields.
        $employeeLinkedTables = [
            'hrms_attendance',
            'hrms_leave_requests',
            'hrms_salary_structures',
            'hrms_salaries',
            'hrms_employee_personal_details',
            'hrms_employee_addresses',
            'hrms_employee_bank_details',
            'hrms_employee_documents',
            'hrms_employee_leave_balances',
        ];

        foreach ($employeeLinkedTables as $tableName) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }
            DB::statement("
                UPDATE {$tableName} t
                JOIN hrms_employees e ON e.id = t.employee_id
                SET t.admin_user_id = e.admin_user_id,
                    t.branch_id = e.branch_id
                WHERE (t.admin_user_id IS NULL OR t.branch_id IS NULL)
            ");
        }

        // Backfill master tables from the first available HRMS user.
        $defaultOwner = DB::table('users')
            ->select('user_id', 'branch')
            ->where('department', 'hrms')
            ->orderBy('id')
            ->first();

        if ($defaultOwner) {
            $branchId = DB::table('branches')->where('code', $defaultOwner->branch)->value('id');
            foreach (['hrms_designations', 'hrms_departments', 'hrms_leave_types', 'hrms_holidays'] as $tableName) {
                if (!Schema::hasTable($tableName)) {
                    continue;
                }
                DB::table($tableName)
                    ->whereNull('admin_user_id')
                    ->update([
                        'admin_user_id' => $defaultOwner->user_id,
                        'branch_id' => $branchId,
                    ]);
            }
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $tableName) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (Schema::hasColumn($tableName, 'branch_id')) {
                    $table->dropIndex(['branch_id']);
                    $table->dropColumn('branch_id');
                }
                if (Schema::hasColumn($tableName, 'admin_user_id')) {
                    $table->dropIndex(['admin_user_id']);
                    $table->dropColumn('admin_user_id');
                }
            });
        }
    }
};

