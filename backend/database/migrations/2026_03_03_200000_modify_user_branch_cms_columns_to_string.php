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
        // Try to drop foreign keys individually to avoid failure if one doesn't exist
        try {
            Schema::table('loan_customers', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('loan_customers', function (Blueprint $table) {
                $table->dropForeign(['branch_id']);
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('loan_customers', function (Blueprint $table) {
                $table->dropForeign(['cms_admin_id']);
            });
        } catch (\Exception $e) {}

        if (Schema::hasColumn('loan_customers', 'user_id')) {
            Schema::table('loan_customers', function (Blueprint $table) {
                $table->string('user_id')->nullable()->change();
            });
        }
        if (Schema::hasColumn('loan_customers', 'branch_id')) {
            Schema::table('loan_customers', function (Blueprint $table) {
                $table->string('branch_id', 255)->nullable()->change();
            });
        }
        if (Schema::hasColumn('loan_customers', 'cms_admin_id')) {
            Schema::table('loan_customers', function (Blueprint $table) {
                $table->string('cms_admin_id')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_customers', function (Blueprint $table) {
            if (Schema::hasColumn('loan_customers', 'user_id')) {
                $table->unsignedBigInteger('user_id')->nullable()->change();
                $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            }
            if (Schema::hasColumn('loan_customers', 'branch_id')) {
                $table->unsignedBigInteger('branch_id')->nullable()->change();
                $table->foreign('branch_id')->references('id')->on('branches')->onDelete('set null');
            }
            if (Schema::hasColumn('loan_customers', 'cms_admin_id')) {
                $table->unsignedBigInteger('cms_admin_id')->nullable()->change();
                $table->foreign('cms_admin_id')->references('id')->on('users')->onDelete('set null');
            }
        });
    }
};
