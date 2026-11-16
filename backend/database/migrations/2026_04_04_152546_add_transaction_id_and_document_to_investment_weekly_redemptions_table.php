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
        Schema::table('investment_weekly_redemptions', function (Blueprint $table) {
            $table->string('transaction_id')->nullable()->after('status');
            $table->string('payment_document')->nullable()->after('transaction_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('investment_weekly_redemptions', function (Blueprint $table) {
            $table->dropColumn(['transaction_id', 'payment_document']);
        });
    }
};
