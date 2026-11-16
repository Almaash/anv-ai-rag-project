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
        Schema::create('loan_credit_application_forms', function (Blueprint $table) {
            $table->id();
            $table->string('loan_application_id')->unique();
            $table->string('customer_unique_id');
            $table->string('branch_id')->nullable();
            $table->string('cms_admin_id')->nullable();
            $table->string('credit_mode')->nullable();
            $table->decimal('credit_applied_for', 15, 2)->nullable();
            $table->string('product_name')->nullable();
            $table->string('product_code')->nullable();
            $table->string('frequency')->nullable();
            $table->string('tenure_option')->nullable();
            
            // Household Income Section
            $table->string('applicant_type')->nullable(); // qualifying, nonQualifying
            $table->decimal('applicant_income', 15, 2)->nullable();
            $table->json('income_sources')->nullable(); // Record<IncomeSourceKey, boolean>
            $table->decimal('other_sources_income', 15, 2)->nullable();
            $table->string('income_proof_name')->nullable();
            $table->integer('family_dependents')->nullable();
            $table->decimal('total_income_yearly', 15, 2)->nullable();

            // Expense Details Section
            $table->json('expense_details')->nullable(); // Record<ExpenseKey, { monthly, yearly }>
            $table->decimal('travel_expense_monthly', 15, 2)->nullable();
            $table->decimal('other_obligations_monthly', 15, 2)->nullable();
            $table->decimal('total_monthly_expenses', 15, 2)->nullable();
            $table->decimal('total_yearly_expenses', 15, 2)->nullable();

            // Other Obligation Details Section
            $table->json('obligation_rows')->nullable(); // Array of ObligationRow
            $table->decimal('total_obligation_amount', 15, 2)->nullable();
            $table->decimal('total_installment_amount', 15, 2)->nullable();

            // Net Surplus
            $table->decimal('net_surplus', 15, 2)->nullable();

            // Business Details Section
            $table->string('business_type')->nullable(); // shopBased, homeBased
            $table->string('business_nature')->nullable();
            $table->string('entitled')->nullable(); // proprietor, partnership
            $table->text('business_address')->nullable();
            $table->string('business_ownership')->nullable(); // owned, rented
            $table->string('business_vintage')->nullable();
            $table->string('business_photo_name')->nullable();
            $table->string('business_proof_name')->nullable();

            // Bank Account Details Section
            $table->string('bank_first_name')->nullable();
            $table->string('bank_middle_name')->nullable();
            $table->string('bank_last_name')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('account_number')->nullable();
            $table->string('ifsc_code')->nullable();

            $table->enum('status', ['field_executive', 'branch_manager'])->default('field_executive');
            $table->json('status_history')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loan_credit_application_forms');
    }
};
