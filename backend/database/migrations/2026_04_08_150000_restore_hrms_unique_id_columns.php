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
        if (!Schema::hasColumn('hrms_designations', 'designation_id')) {
            Schema::table('hrms_designations', function (Blueprint $table) {
                $table->string('designation_id')->unique()->after('id')->nullable();
            });
        }
        
        if (!Schema::hasColumn('hrms_leave_types', 'leave_type_id')) {
            Schema::table('hrms_leave_types', function (Blueprint $table) {
                $table->string('leave_type_id')->unique()->after('id')->nullable();
            });
        }
        
        if (!Schema::hasColumn('hrms_holidays', 'holiday_id')) {
            Schema::table('hrms_holidays', function (Blueprint $table) {
                $table->string('holiday_id')->unique()->after('id')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hrms_designations', function (Blueprint $table) {
            $table->dropColumn('designation_id');
        });
        Schema::table('hrms_leave_types', function (Blueprint $table) {
            $table->dropColumn('leave_type_id');
        });
        Schema::table('hrms_holidays', function (Blueprint $table) {
            $table->dropColumn('holiday_id');
        });
    }
};
