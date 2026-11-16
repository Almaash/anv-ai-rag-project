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
            $table->renameColumn('is_disbursement', 'is_disbursement_created');
        });

        Schema::table('loan_cam', function (Blueprint $table) {
            $table->renameColumn('is_disbursement', 'is_disbursement_created');
        });

        Schema::table('loan_disbursements', function (Blueprint $table) {
            $table->date('payment_date')->nullable();
            $table->enum('payment_status', ['on_process', 'NEFT_done', 'NEFT_failed'])->default('on_process');
            $table->boolean('is_disbursed')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_credit_application_forms', function (Blueprint $table) {
            $table->renameColumn('is_disbursement_created', 'is_disbursement');
        });

        Schema::table('loan_cam', function (Blueprint $table) {
            $table->renameColumn('is_disbursement_created', 'is_disbursement');
        });

        Schema::table('loan_disbursements', function (Blueprint $table) {
            $table->dropColumn(['payment_date', 'payment_status', 'is_disbursed']);
        });
    }
};
