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
        // Check if table exists and what columns it has
        if (Schema::hasTable('loan_customer_verification_history')) {
            Schema::table('loan_customer_verification_history', function (Blueprint $table) {
                // If customer_id exists but customer_unique_id doesn't, rename it
                if (Schema::hasColumn('loan_customer_verification_history', 'customer_id') && 
                    !Schema::hasColumn('loan_customer_verification_history', 'customer_unique_id')) {
                    $table->renameColumn('customer_id', 'customer_unique_id');
                }
                
                // Add missing columns if they don't exist
                if (!Schema::hasColumn('loan_customer_verification_history', 'status')) {
                    $table->enum('status', ['verified', 'rejected', 'pending'])->default('pending');
                }
                if (!Schema::hasColumn('loan_customer_verification_history', 'occupation_details_applicant')) {
                    $table->boolean('occupation_details_applicant')->default(false);
                }
                if (!Schema::hasColumn('loan_customer_verification_history', 'occupation_details_nominee')) {
                    $table->boolean('occupation_details_nominee')->default(false);
                }
                if (!Schema::hasColumn('loan_customer_verification_history', 'house_details')) {
                    $table->boolean('house_details')->default(false);
                }
                if (!Schema::hasColumn('loan_customer_verification_history', 'assets_details')) {
                    $table->boolean('assets_details')->default(false);
                }
                if (!Schema::hasColumn('loan_customer_verification_history', 'admin_id')) {
                    $table->string('admin_id')->nullable();
                }
                if (!Schema::hasColumn('loan_customer_verification_history', 'admin_name')) {
                    $table->string('admin_name')->nullable();
                }
            });
        } else {
            // Create the table if it doesn't exist
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
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverse the changes if needed
        if (Schema::hasTable('loan_customer_verification_history')) {
            Schema::table('loan_customer_verification_history', function (Blueprint $table) {
                if (Schema::hasColumn('loan_customer_verification_history', 'customer_unique_id')) {
                    $table->renameColumn('customer_unique_id', 'customer_id');
                }
            });
        }
    }
};
