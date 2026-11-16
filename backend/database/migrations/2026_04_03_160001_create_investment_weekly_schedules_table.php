<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investment_weekly_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_id')->constrained('investments')->onDelete('cascade');
            $table->integer('week_number');
            $table->date('date');
            $table->decimal('self_bonus', 15, 2);
            $table->decimal('referral_bonus', 15, 2);
            $table->decimal('total_earning', 15, 2);
            $table->decimal('redemption_value', 15, 2);
            $table->decimal('redeem', 15, 2)->default(0);
            $table->decimal('closing_balance', 15, 2);
            $table->timestamps();
            
            $table->index(['investment_id', 'week_number']);
            $table->index(['investment_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investment_weekly_schedules');
    }
};