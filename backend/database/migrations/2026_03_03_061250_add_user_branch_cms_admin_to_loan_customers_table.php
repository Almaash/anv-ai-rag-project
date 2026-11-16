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
        Schema::table('loan_customers', function (Blueprint $table) {
            if (!Schema::hasColumn('loan_customers', 'user_id')) {
                $table->unsignedBigInteger('user_id')->nullable()->after('phone_no');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            }
            
            if (!Schema::hasColumn('loan_customers', 'branch_id')) {
                $table->unsignedBigInteger('branch_id')->nullable()->after('user_id');
                $table->foreign('branch_id')->references('id')->on('branches')->onDelete('set null');
            }
            
            if (!Schema::hasColumn('loan_customers', 'cms_admin_id')) {
                $table->unsignedBigInteger('cms_admin_id')->nullable()->after('branch_id');
                $table->foreign('cms_admin_id')->references('id')->on('users')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_customers', function (Blueprint $table) {
            if (Schema::hasColumn('loan_customers', 'cms_admin_id')) {
                $table->dropForeign(['cms_admin_id']);
                $table->dropColumn('cms_admin_id');
            }
            
            if (Schema::hasColumn('loan_customers', 'branch_id')) {
                $table->dropForeign(['branch_id']);
                $table->dropColumn('branch_id');
            }
            
            if (Schema::hasColumn('loan_customers', 'user_id')) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            }
        });
    }
};
