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
        Schema::create('loan_applications', function (Blueprint $table) {
            $table->id();
            $table->string('loan_application_id')->unique();
            $table->string('user_unique_id');
            $table->decimal('loan_amount', 15, 2);
            $table->string('loan_purpose');
            $table->integer('loan_tenure_months');
            $table->decimal('interest_rate', 5, 2);
            $table->decimal('monthly_income', 15, 2);
            $table->enum('employment_type', ['salaried', 'self_employed', 'business']);
            $table->string('company_name')->nullable();
            $table->integer('work_experience_years');
            $table->text('existing_loans')->nullable();
            $table->text('collateral_details')->nullable();
            $table->string('salary_slip_document')->nullable();
            $table->string('bank_statement_document')->nullable();
            $table->string('identity_proof_document')->nullable();
            $table->string('address_proof_document')->nullable();
            $table->string('other_document_1')->nullable();
            $table->string('other_document_2')->nullable();
            $table->enum('application_status', ['pending', 'approved', 'rejected', 'under_review', 'back_for_revision'])->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->text('revision_reason')->nullable();
            $table->json('status_history')->nullable();
            $table->boolean('loan_started')->default(false);
            $table->boolean('is_disbursed')->default(false);
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

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loan_applications');
    }
};
