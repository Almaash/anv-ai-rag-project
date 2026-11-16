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
        Schema::create('loan_disbursements', function (Blueprint $table) {
            $table->id();
            $table->string('disbursement_id')->unique();
            $table->string('loan_application_id');
            $table->string('user_id');
            $table->decimal('disbursed_amount', 15, 2);
            $table->enum('disbursement_method', ['bank_transfer', 'cash', 'cheque']);
            $table->string('bank_account_number')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('ifsc_code')->nullable();
            $table->string('transaction_reference')->nullable();
            $table->string('cheque_number')->nullable();
            $table->date('disbursement_date');
            $table->enum('disbursement_status', ['pending', 'completed', 'failed'])->default('pending');
            $table->string('disbursed_by');
            $table->text('disbursement_notes')->nullable();
            $table->string('receipt_document')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loan_disbursements');
    }
};
