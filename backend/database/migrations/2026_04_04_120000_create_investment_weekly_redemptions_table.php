<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investment_weekly_redemptions', function (Blueprint $table) {
            $table->id();
            $table->string('unique_id')->unique();
            $table->string('investment_unique_id'); // Links to investor_investments
            $table->unsignedBigInteger('weekly_schedule_id'); // Links to investment_weekly_schedules
            $table->integer('week_number');
            $table->decimal('redemption_amount', 15, 2);
            $table->decimal('self_bonus_redeemed', 15, 2)->default(0);
            $table->decimal('referral_bonus_redeemed', 15, 2)->default(0);
            $table->enum('redemption_type', ['partial', 'full'])->default('partial');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('remarks')->nullable();
            $table->date('redemption_date');
            $table->unsignedBigInteger('requested_by')->nullable(); // User who requested
            $table->unsignedBigInteger('approved_by')->nullable(); // Admin who approved
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            
            $table->foreign('weekly_schedule_id')->references('id')->on('investment_weekly_schedules')->onDelete('cascade');
            $table->index(['investment_unique_id', 'week_number'], 'iwr_inv_week_idx');
            $table->index(['status', 'redemption_date'], 'iwr_status_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investment_weekly_redemptions');
    }
};