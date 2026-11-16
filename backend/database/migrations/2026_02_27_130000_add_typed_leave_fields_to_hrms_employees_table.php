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
        Schema::table('hrms_employees', function (Blueprint $table) {
            if (!Schema::hasColumn('hrms_employees', 'sick_leave_days')) {
                $table->unsignedInteger('sick_leave_days')->default(0)->after('leave_cycle_year');
            }

            if (!Schema::hasColumn('hrms_employees', 'casual_leave_days')) {
                $table->unsignedInteger('casual_leave_days')->default(0)->after('sick_leave_days');
            }

            if (!Schema::hasColumn('hrms_employees', 'maternity_leave_days')) {
                $table->unsignedInteger('maternity_leave_days')->default(0)->after('casual_leave_days');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hrms_employees', function (Blueprint $table) {
            $columns = ['sick_leave_days', 'casual_leave_days', 'maternity_leave_days'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('hrms_employees', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

