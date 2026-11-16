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
        Schema::create('loan_agents', function (Blueprint $table) {
            $table->id();
            $table->string('agent_unique_id')->unique()->nullable();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone_no')->unique();
            $table->string('gender')->nullable();
            $table->string('location')->nullable();
            $table->text('address')->nullable();
            $table->string('photo')->nullable();
            $table->string('adhaar_image')->nullable();
            $table->string('pan_image')->nullable();
            $table->string('voter_id_image')->nullable();
            $table->string('driving_license_image')->nullable();
            $table->string('passbook_image')->nullable();
            $table->string('police_verification_image')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loan_agents');
    }
};
