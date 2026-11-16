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
        Schema::table('hrms_salaries', function (Blueprint $table) {
            if (!Schema::hasColumn('hrms_salaries', 'salary_id')) {
                $table->string('salary_id')->unique()->nullable()->after('payout_id');
            }
            if (!Schema::hasColumn('hrms_salaries', 'admin_user_id')) {
                $table->string('admin_user_id')->nullable()->after('employee_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hrms_salaries', function (Blueprint $table) {
            $table->dropColumn(['salary_id', 'admin_user_id']);
        });
    }
};
