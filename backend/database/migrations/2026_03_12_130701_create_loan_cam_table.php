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
        Schema::create('loan_cam', function (Blueprint $table) {
            $table->id();
            $table->string('loan_application_id')->unique();
            $table->string('pd_id')->nullable()->comment('from loan_pd_information table');
            $table->string('cam_unique_id')->unique();
            $table->enum('status', [ 'branch_manager'])->default('branch_manager');
            $table->string('branch_id')->nullable();
            $table->string('customer_unique_id')->nullable();
            $table->string('cms_admin_id')->nullable();
            
            // Sections stored as JSON based on frontend structure
            $table->json('income_details')->nullable();
            $table->json('expenditure_details')->nullable();
            $table->json('net_surplus')->nullable();
            
            $table->enum('credit_decision', ['approved', 'rejected'])->nullable();
            $table->text('remarks')->nullable();
            
            $table->boolean('is_deleted')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loan_cam');
    }
};
