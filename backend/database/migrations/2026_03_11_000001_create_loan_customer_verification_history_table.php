<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loan_customer_verification_history', function (Blueprint $table) {
            $table->id();
            $table->string('customer_unique_id');
            $table->enum('status', ['verified', 'rejected', 'pending'])->default('pending');
            $table->text('reason')->nullable();
            $table->boolean('occupation_details_applicant')->default(false);
            $table->boolean('occupation_details_nominee')->default(false);
            $table->boolean('house_details')->default(false);
            $table->boolean('assets_details')->default(false);
            $table->string('admin_id')->nullable();
            $table->string('admin_name')->nullable();
            $table->timestamps();
            
            $table->foreign('customer_unique_id')->references('customer_unique_id')->on('loan_customers')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_customer_verification_history');
    }
};