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
        Schema::table('hrms_designations', function (Blueprint $table) {
            $table->string('designation_id')->unique()->after('id')->nullable();
        });
        Schema::table('hrms_leave_types', function (Blueprint $table) {
            $table->string('leave_type_id')->unique()->after('id')->nullable();
        });
        Schema::table('hrms_leave_requests', function (Blueprint $table) {
            $table->string('request_id')->unique()->after('id')->nullable();
        });
        Schema::table('hrms_holidays', function (Blueprint $table) {
            $table->string('holiday_id')->unique()->after('id')->nullable();
        });
        Schema::table('hrms_salaries', function (Blueprint $table) {
            $table->string('payout_id')->unique()->after('id')->nullable();
        });
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
        Schema::table('hrms_leave_requests', function (Blueprint $table) {
            $table->dropColumn('request_id');
        });
        Schema::table('hrms_holidays', function (Blueprint $table) {
            $table->dropColumn('holiday_id');
        });
        Schema::table('hrms_salaries', function (Blueprint $table) {
            $table->dropColumn('payout_id');
        });
    }
};
