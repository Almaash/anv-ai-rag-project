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
        Schema::table('hrms_departments', function (Blueprint $table) {
            if (!Schema::hasColumn('hrms_departments', 'dept_id')) {
                $table->string('dept_id')->unique()->after('id')->nullable();
            }
        });

        // Initialize dept_id for existing departments if they are NULL
        DB::table('hrms_departments')->whereNull('dept_id')->update([
            'dept_id' => DB::raw('id')
        ]);

        Schema::table('hrms_designations', function (Blueprint $table) {
            if (!Schema::hasColumn('hrms_designations', 'designation_id')) {
                $table->string('designation_id')->unique()->after('id')->nullable();
            }
        });

        // Initialize designation_id for existing designations if they are NULL
        DB::table('hrms_designations')->whereNull('designation_id')->update([
            'designation_id' => DB::raw('id')
        ]);

        Schema::table('hrms_leave_types', function (Blueprint $table) {
            if (!Schema::hasColumn('hrms_leave_types', 'leave_type_id')) {
                $table->string('leave_type_id')->unique()->after('id')->nullable();
            }
        });

        // Initialize leave_type_id for existing leave types if they are NULL
        DB::table('hrms_leave_types')->whereNull('leave_type_id')->update([
            'leave_type_id' => DB::raw('id')
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hrms_departments', function (Blueprint $table) {
            if (Schema::hasColumn('hrms_departments', 'dept_id')) {
                $table->dropColumn('dept_id');
            }
        });

        Schema::table('hrms_designations', function (Blueprint $table) {
            if (Schema::hasColumn('hrms_designations', 'designation_id')) {
                $table->dropColumn('designation_id');
            }
        });

        Schema::table('hrms_leave_types', function (Blueprint $table) {
            if (Schema::hasColumn('hrms_leave_types', 'leave_type_id')) {
                $table->dropColumn('leave_type_id');
            }
        });
    }
};
