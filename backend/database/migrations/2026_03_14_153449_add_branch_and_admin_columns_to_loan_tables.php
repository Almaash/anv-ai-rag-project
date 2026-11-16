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
        if (Schema::hasTable('loan_loans')) {
            Schema::table('loan_loans', function (Blueprint $table) {
                if (!Schema::hasColumn('loan_loans', 'branch_id')) {
                    $table->string('branch_id')->nullable()->after('customer_unique_id');
                }
                if (!Schema::hasColumn('loan_loans', 'cms_admin_id')) {
                    $table->string('cms_admin_id')->nullable()->after('branch_id');
                }
            });
        }

        if (Schema::hasTable('loan_emi_schedules')) {
            Schema::table('loan_emi_schedules', function (Blueprint $table) {
                if (!Schema::hasColumn('loan_emi_schedules', 'branch_id')) {
                    $afterColumn = Schema::hasColumn('loan_emi_schedules', 'loan_number') ? 'loan_number' : (Schema::hasColumn('loan_emi_schedules', 'loan_id') ? 'loan_id' : 'id');
                    $table->string('branch_id')->nullable()->after($afterColumn);
                }
                if (!Schema::hasColumn('loan_emi_schedules', 'cms_admin_id')) {
                    $table->string('cms_admin_id')->nullable()->after('branch_id');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_loans', function (Blueprint $table) {
            $table->dropColumn(['branch_id', 'cms_admin_id']);
        });

        Schema::table('loan_emi_schedules', function (Blueprint $table) {
            $table->dropColumn(['branch_id', 'cms_admin_id']);
        });
    }
};