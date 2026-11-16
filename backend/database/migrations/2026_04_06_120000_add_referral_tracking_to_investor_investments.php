<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investor_investments', function (Blueprint $table) {
            $table->decimal('referral_amount_earned', 15, 2)->default(0)->after('maturity')->comment('Total referral amount earned from this investor');
            $table->json('referral_history')->nullable()->after('referral_amount_earned')->comment('History of referral amounts received');
        });
    }

    public function down(): void
    {
        Schema::table('investor_investments', function (Blueprint $table) {
            $table->dropColumn(['referral_amount_earned', 'referral_history']);
        });
    }
};