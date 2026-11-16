<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_weekly_schedules', function (Blueprint $table) {
            $table->enum('redemption_status', ['not_redeemed', 'at_admin', 'partially_redeemed', 'fully_redeemed'])->default('not_redeemed')->change();
        });
    }

    public function down(): void
    {
        Schema::table('investment_weekly_schedules', function (Blueprint $table) {
            $table->enum('redemption_status', ['not_redeemed', 'partially_redeemed', 'fully_redeemed'])->default('not_redeemed')->change();
        });
    }
};