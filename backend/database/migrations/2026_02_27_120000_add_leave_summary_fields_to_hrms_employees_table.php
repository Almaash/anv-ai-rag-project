<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('hrms_employees', function (Blueprint $table) {
            if (!Schema::hasColumn('hrms_employees', 'annual_leave_quota')) {
                $table->unsignedInteger('annual_leave_quota')->default(0)->after('status');
            }

            if (!Schema::hasColumn('hrms_employees', 'annual_leave_used')) {
                $table->unsignedInteger('annual_leave_used')->default(0)->after('annual_leave_quota');
            }

            if (!Schema::hasColumn('hrms_employees', 'annual_leave_balance')) {
                $table->unsignedInteger('annual_leave_balance')->default(0)->after('annual_leave_used');
            }

            if (!Schema::hasColumn('hrms_employees', 'leave_cycle_year')) {
                $table->unsignedSmallInteger('leave_cycle_year')->nullable()->after('annual_leave_balance');
            }
        });

        $employeeIds = DB::table('hrms_employees')->pluck('id');

        foreach ($employeeIds as $employeeId) {
            $totals = DB::table('hrms_employee_leave_balances')
                ->selectRaw('COALESCE(SUM(total_allocated), 0) as allocated, COALESCE(SUM(used), 0) as used, COALESCE(SUM(remaining), 0) as remaining')
                ->where('employee_id', $employeeId)
                ->first();

            DB::table('hrms_employees')
                ->where('id', $employeeId)
                ->update([
                    'annual_leave_quota' => (int) ($totals->allocated ?? 0),
                    'annual_leave_used' => (int) ($totals->used ?? 0),
                    'annual_leave_balance' => (int) ($totals->remaining ?? 0),
                    'leave_cycle_year' => now()->year,
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hrms_employees', function (Blueprint $table) {
            $columns = [
                'annual_leave_quota',
                'annual_leave_used',
                'annual_leave_balance',
                'leave_cycle_year',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('hrms_employees', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

