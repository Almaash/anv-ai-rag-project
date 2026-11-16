<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $hrmsTables = [
        'hrms_designations',
        'hrms_departments',
        'hrms_employees',
        'hrms_attendance',
        'hrms_leave_types',
        'hrms_leave_requests',
        'hrms_salary_structures',
        'hrms_salaries',
        'hrms_holidays',
        'hrms_employee_personal_details',
        'hrms_employee_addresses',
        'hrms_employee_bank_details',
        'hrms_employee_leave_balances',
        'hrms_employee_documents',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->hrmsTables as $tableName) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (!Schema::hasColumn($tableName, 'is_deleted')) {
                    $table->unsignedTinyInteger('is_deleted')->default(0)->after('id');
                    $table->index('is_deleted');
                }
            });
        }

        // Relax strict DB uniqueness so active-only uniqueness can be enforced in app logic.
        $this->dropUniqueIndexIfExists('hrms_designations', 'name');
        $this->dropUniqueIndexIfExists('hrms_departments', 'name');
        $this->dropUniqueIndexIfExists('hrms_leave_types', 'name');
        $this->dropUniqueIndexIfExists('hrms_employees', 'email');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->createUniqueIfMissing('hrms_designations', 'name', 'hrms_designations_name_unique');
        $this->createUniqueIfMissing('hrms_departments', 'name', 'hrms_departments_name_unique');
        $this->createUniqueIfMissing('hrms_leave_types', 'name', 'hrms_leave_types_name_unique');
        $this->createUniqueIfMissing('hrms_employees', 'email', 'hrms_employees_email_unique');

        foreach ($this->hrmsTables as $tableName) {
            if (!Schema::hasTable($tableName) || !Schema::hasColumn($tableName, 'is_deleted')) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) {
                $table->dropIndex(['is_deleted']);
                $table->dropColumn('is_deleted');
            });
        }
    }

    private function dropUniqueIndexIfExists(string $table, string $column): void
    {
        if (!Schema::hasTable($table) || !Schema::hasColumn($table, $column)) {
            return;
        }

        $indexes = DB::select("SHOW INDEX FROM `{$table}` WHERE Column_name = ? AND Non_unique = 0", [$column]);

        foreach ($indexes as $index) {
            $keyName = $index->Key_name ?? null;
            if (!$keyName || $keyName === 'PRIMARY') {
                continue;
            }
            DB::statement("ALTER TABLE `{$table}` DROP INDEX `{$keyName}`");
        }
    }

    private function createUniqueIfMissing(string $table, string $column, string $indexName): void
    {
        if (!Schema::hasTable($table) || !Schema::hasColumn($table, $column)) {
            return;
        }

        $indexes = DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$indexName]);
        if (!empty($indexes)) {
            return;
        }

        DB::statement("ALTER TABLE `{$table}` ADD UNIQUE `{$indexName}` (`{$column}`)");
    }
};

