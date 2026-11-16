<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loan_customers', function (Blueprint $table) {
            $table->id();
            $table->string('user_unique_id')->unique();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('phone_no', 20);
            $table->string('role', 50)->default('customer');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->date('date_of_birth')->nullable();
            $table->text('address_1')->nullable();
            $table->text('address_2')->nullable();
            $table->string('adhaar_number', 12)->nullable();
            $table->string('adhaar_image')->nullable();
            $table->string('pan_number', 10)->nullable();
            $table->string('pan_image')->nullable();
            $table->string('driving_license_number')->nullable();
            $table->string('driving_license_image')->nullable();
            $table->string('voter_id_number')->nullable();
            $table->string('voter_id_image')->nullable();
            $table->string('bank_account_number')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('ifsc_code')->nullable();
            $table->string('passbook_image')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_customers');
    }
};
