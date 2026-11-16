<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referral_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('unique_id')->unique();
            $table->string('referrer_unique_id')->comment('Who received the referral bonus');
            $table->string('referee_unique_id')->comment('Who made the investment (referred person)');
            $table->string('investment_unique_id')->comment('Investment that triggered this referral');
            $table->decimal('investment_amount', 15, 2)->comment('Original investment amount');
            $table->decimal('referral_percentage', 5, 2)->default(1.2)->comment('Referral percentage applied');
            $table->decimal('referral_amount', 15, 2)->comment('Calculated referral bonus amount');
            $table->enum('status', ['pending', 'credited', 'failed'])->default('credited');
            $table->timestamp('credited_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
            
            $table->index(['referrer_unique_id', 'created_at']);
            $table->index(['referee_unique_id']);
            $table->index(['investment_unique_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referral_transactions');
    }
};