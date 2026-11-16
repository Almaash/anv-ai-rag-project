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
        Schema::table('loan_disbursements', function (Blueprint $table) {
            // Remove existing columns
            $table->dropColumn([
                'admin_user_id',
                'disbursement_id',
                'user_id',
                'disbursed_amount',
                'disbursement_method',
                'bank_account_number',
                'bank_name',
                'ifsc_code',
                'transaction_reference',
                'cheque_number',
                'disbursement_date',
                'disbursed_by',
                'disbursement_notes',
                'receipt_document'
            ]);

            // Adjust existing status column if it exists or drop and add new
            $table->dropColumn('disbursement_status');
        });

        Schema::table('loan_disbursements', function (Blueprint $table) {
            // Add new requested columns
            $table->string('pd_application_id')->nullable()->after('loan_application_id');
            $table->string('cam_unique_id')->nullable()->after('pd_application_id');
            $table->string('customer_unique_id')->nullable()->after('cms_admin_id');
            $table->date('date_of_disbursement')->nullable();
            $table->date('booking_date')->nullable();
            $table->enum('disbursement_status', ['pending', 'Disbursed'])->default('pending');
            $table->string('dfa_document')->nullable()->comment('DFA document');
            $table->string('cfa_document')->nullable()->comment('CFA document');
            $table->string('dpn_document')->nullable()->comment('DPN document');
            $table->string('vernacular_document')->nullable()->comment('Vernacular document');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_disbursements', function (Blueprint $table) {
            // This is complex to reverse perfectly without keeping old structure, 
            // but for development we can just drop the new ones.
            $table->dropColumn([
                'pd_application_id',
                'cam_unique_id',
                'customer_unique_id',
                'date_of_disbursement',
                'booking_date',
                'disbursement_status',
                'dfa_document',
                'cfa_document',
                'dpn_document',
                'vernacular_document'
            ]);
        });
    }
};
