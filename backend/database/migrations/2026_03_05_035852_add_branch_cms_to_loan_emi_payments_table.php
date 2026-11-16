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
        Schema::table('loan_emi_payments', function (Blueprint $table) {
            if (!Schema::hasColumn('loan_emi_payments', 'branch_id')) {
                $table->string('branch_id')->nullable()->after('user_id');
            }
            if (!Schema::hasColumn('loan_emi_payments', 'cms_admin_id')) {
                $table->string('cms_admin_id')->nullable()->after('branch_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_emi_payments', function (Blueprint $table) {
            if (Schema::hasColumn('loan_emi_payments', 'cms_admin_id')) {
                $table->dropColumn('cms_admin_id');
            }
            if (Schema::hasColumn('loan_emi_payments', 'branch_id')) {
                $table->dropColumn('branch_id');
            }
        });
    }
};
