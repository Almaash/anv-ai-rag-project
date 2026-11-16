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
        Schema::create('loan_pd_information', function (Blueprint $table) {
            $table->id();
            $table->string('pd_application_id')->unique();
            $table->string('loan_application_id')->nullable(); // Reference to source CAF
            $table->string('customer_unique_id');
            $table->string('branch_id')->nullable();
            $table->string('cms_admin_id')->nullable();
            
            // Status & History
            $table->enum('status', ['field_executive', 'branch_manager', 'approved', 'rejected'])->default('field_executive');
            $table->json('status_history')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->boolean('is_deleted')->default(false);
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loan_pd_information');
    }
};
