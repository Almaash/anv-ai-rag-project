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
        Schema::create('hrms_salaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hrms_employees')->onDelete('cascade');
            $table->string('month'); // e.g. "January 2026"
            $table->date('payment_date')->nullable();
            $table->decimal('total_working_days', 4, 1)->default(0);
            $table->decimal('present_days', 4, 1)->default(0);
            $table->decimal('absent_days', 4, 1)->default(0);
            $table->decimal('leave_days', 4, 1)->default(0);
            $table->decimal('basic_pay', 15, 2);
            $table->decimal('allowances', 15, 2)->default(0);
            $table->decimal('deductions', 15, 2)->default(0);
            $table->decimal('net_pay', 15, 2);
            $table->enum('status', ['pending', 'paid', 'cancelled'])->default('pending');
            $table->string('payment_method')->nullable(); // Cash, Bank Transfer, Cheque
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hrms_salaries');
    }
};
