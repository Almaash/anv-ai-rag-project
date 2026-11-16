<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investments', function (Blueprint $table) {
            $table->id();
            $table->string('investor_id');
            $table->string('investor_unique_id')->unique();
            $table->decimal('self_amount', 15, 2);
            $table->decimal('referral_amount', 15, 2);
            $table->decimal('total_amount', 15, 2);
            $table->date('investment_start_date');
            $table->integer('lockin_years')->default(3);
            $table->decimal('annual_roi', 5, 2);
            $table->decimal('allocation_charges', 5, 2);
            $table->decimal('total_earnings', 15, 2)->default(0);
            $table->decimal('maturity_amount', 15, 2)->default(0);
            $table->timestamps();
            
            $table->index(['investor_id', 'investment_start_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investments');
    }
};