<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investor_disbursements', function (Blueprint $table) {
            $table->id();

            // Generated unique ID: DIS/HZB-4401/26-27/P "A"/00001
            $table->string('disbursement_unique_id')->unique();

            // Investor reference (use unique_id, not table id)
            $table->string('investor_unique_id');
            $table->string('investor_name')->nullable();

            // Pool info
            $table->string('pool_name')->nullable();   // e.g. "Pool A"
            $table->string('pool_label')->nullable();  // e.g. P "A"

            // Investor type
            $table->string('investor_type')->nullable();

            // Loan application reference
            $table->string('loan_application_id')->nullable();

            // Branch & tenant
            $table->string('branch_id')->nullable();
            $table->string('branch_code')->nullable();  // e.g. HZB-4401
            $table->string('cms_admin_id')->nullable();

            // Financial year
            $table->string('financial_year')->nullable(); // e.g. 26-27

            // Running number (per FY + branch + pool)
            $table->unsignedInteger('running_number')->default(1);

            // Status
            $table->string('status')->default('pending');

            $table->timestamps();

            // Index for fast running number lookup
            $table->index(['branch_code', 'financial_year', 'pool_label'], 'idx_dis_counter');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investor_disbursements');
    }
};
