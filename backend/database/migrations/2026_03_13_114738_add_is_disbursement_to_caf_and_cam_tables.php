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
        Schema::table('loan_credit_application_forms', function (Blueprint $table) {
            $table->boolean('is_disbursement')->default(false)->after('is_pd_created');
        });

        Schema::table('loan_cam', function (Blueprint $table) {
            $table->boolean('is_disbursement')->default(false)->after('status_history');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_credit_application_forms', function (Blueprint $table) {
            $table->dropColumn('is_disbursement');
        });

        Schema::table('loan_cam', function (Blueprint $table) {
            $table->dropColumn('is_disbursement');
        });
    }
};
