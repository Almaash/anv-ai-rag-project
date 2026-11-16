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
        Schema::create('loan_emi_payments', function (Blueprint $table) {
            $table->id();
            $table->string('emi_schedule_id');
            $table->string('loan_id');
            $table->string('user_id');
            $table->decimal('payment_amount', 15, 2);
            $table->dateTime('payment_date');
            $table->enum('payment_method', ['online', 'cash', 'cheque', 'bank_transfer', 'bank', 'upi']);
            $table->string('transaction_id')->nullable();
            $table->string('payment_image')->nullable();
            $table->enum('payment_status', ['pending', 'success', 'failed'])->default('pending');
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->string('receipt_number')->nullable();
            $table->string('approved_by')->nullable();
            $table->dateTime('approved_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loan_emi_payments');
    }
};
