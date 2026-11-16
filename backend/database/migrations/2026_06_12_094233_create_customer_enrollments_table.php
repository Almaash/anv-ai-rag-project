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
        Schema::create('customer_enrollments', function (Blueprint $table) {
            $table->id();

            $table->string('enrollment_number')->unique();
            $table->string('customer_unique_id')->index();

            $table->date('enrollment_date');

            $table->string('enrolled_by')->nullable();
            $table->string('branch_id')->nullable();
            $table->string('cms_admin_id')->nullable();

            $table->json('status_history')->nullable();

            $table->enum('verification_status', [
                'pending',
                'verified',
                'rejected',
                'reverted'
            ])->default('pending');

            $table->string('verified_by')->nullable();
            $table->timestamp('verified_at')->nullable();

            $table->text('verification_notes')->nullable();
            $table->text('rejection_reason')->nullable();

            $table->string('reverted_by', 50)->nullable();
            $table->dateTime('reverted_at')->nullable();

            $table->enum('status', [
                'field_executive',
                'branch_support_executive',
                'branch_manager',
                'credit_manager',
                'approved',
                'rejected'
            ])->default('field_executive');

            $table->timestamps();

            $table->index('branch_id');
            $table->index('verification_status');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_enrollments');
    }
};
