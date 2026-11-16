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
        Schema::table('loan_loans', function (Blueprint $table) {
            if (!Schema::hasColumn('loan_loans', 'branch_id')) {
                $table->string('branch_id')->nullable()->after('user_id');
            }
            if (!Schema::hasColumn('loan_loans', 'cms_admin_id')) {
                $table->string('cms_admin_id')->nullable()->after('branch_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_loans', function (Blueprint $table) {
            if (Schema::hasColumn('loan_loans', 'cms_admin_id')) {
                $table->dropColumn('cms_admin_id');
            }
            if (Schema::hasColumn('loan_loans', 'branch_id')) {
                $table->dropColumn('branch_id');
            }
        });
    }
};
