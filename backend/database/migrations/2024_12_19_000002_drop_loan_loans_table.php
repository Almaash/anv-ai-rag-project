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
        Schema::dropIfExists('loan_loans');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('loan_loans', function (Blueprint $table) {
            $table->id();
            $table->string('loan_id')->unique();
            $table->string('loan_application_id');
            $table->string('user_id');
            $table->decimal('loan_amount', 15, 2);
            $table->decimal('interest_rate', 5, 2);
            $table->integer('tenure_months');
            $table->decimal('emi_amount', 15, 2);
            $table->decimal('total_amount', 15, 2);
            $table->decimal('remaining_amount', 15, 2);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->date('loan_start_date');
            $table->date('loan_end_date');
            $table->enum('loan_status', ['active', 'completed', 'defaulted', 'closed'])->default('active');
            $table->boolean('apply_processing_fee')->default(false);
            $table->boolean('apply_gst')->default(false);
            $table->enum('processing_fee_type', ['percentage', 'fixed'])->default('percentage');
            $table->decimal('processing_fee_percent', 5, 2)->default(0);
            $table->decimal('processing_fee_amount', 15, 2)->default(0);
            $table->decimal('gst_percentage', 5, 2)->default(0);
            $table->decimal('gst_amount', 15, 2)->default(0);
            $table->timestamps();
        });
    }
};