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
        Schema::table('investor_investments', function (Blueprint $table) {
            $table->decimal('used_referral_bonus', 15, 2)->default(0)->after('referral_history');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('investor_investments', function (Blueprint $table) {
            $table->dropColumn('used_referral_bonus');
        });
    }
};
