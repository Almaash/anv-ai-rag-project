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
        Schema::table('loan_cam', function (Blueprint $table) {
            $table->boolean('is_verified')->default(0)->after('status');
        });

        Schema::table('loan_credit_application_forms', function (Blueprint $table) {
            $table->boolean('is_cam_created')->default(0)->after('is_pd_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_cam', function (Blueprint $table) {
            $table->dropColumn('is_verified');
        });

        Schema::table('loan_credit_application_forms', function (Blueprint $table) {
            $table->dropColumn('is_cam_created');
        });
    }
};
