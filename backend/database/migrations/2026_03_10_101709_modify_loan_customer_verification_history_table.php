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
        Schema::table('loan_customer_verification_history', function (Blueprint $table) {
            // Remove extra fields
            $table->dropColumn(['action', 'admin_id', 'admin_name']);
            
            // Add new requested boolean fields
            $table->boolean('occupation_details_applicant')->default(false);
            $table->boolean('occupation_details_nominee')->default(false);
            $table->boolean('house_details')->default(false);
            $table->boolean('assets_details')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_customer_verification_history', function (Blueprint $table) {
            $table->enum('action', ['verified', 'rejected'])->after('customer_id');
            $table->string('admin_id')->nullable()->after('reason');
            $table->string('admin_name')->nullable()->after('admin_id');
            
            $table->dropColumn([
                'occupation_details_applicant',
                'occupation_details_nominee',
                'house_details',
                'assets_details'
            ]);
        });
    }
};
