<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_customers', function (Blueprint $table) {
            $table->enum('sourcing_type', ['self', 'referral'])->default('self');
            $table->string('referral_id')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('loan_customers', function (Blueprint $table) {
            $table->dropColumn(['sourcing_type', 'referral_id']);
        });
    }
};