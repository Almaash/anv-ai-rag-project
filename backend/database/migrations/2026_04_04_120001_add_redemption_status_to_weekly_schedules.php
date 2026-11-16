<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_weekly_schedules', function (Blueprint $table) {
            $table->enum('redemption_status', ['not_redeemed', 'partially_redeemed', 'fully_redeemed'])->default('not_redeemed')->after('closing_balance');
            $table->decimal('total_redeemed', 15, 2)->default(0)->after('redemption_status');
        });
    }

    public function down(): void
    {
        Schema::table('investment_weekly_schedules', function (Blueprint $table) {
            $table->dropColumn(['redemption_status', 'total_redeemed']);
        });
    }
};