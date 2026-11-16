<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investor_investments', function (Blueprint $table) {
            $table->decimal('remaining_pool_balance', 15, 2)->nullable()->after('amount');
            $table->json('payment_history')->nullable()->after('remaining_pool_balance');
        });
    }

    public function down(): void
    {
        Schema::table('investor_investments', function (Blueprint $table) {
            $table->dropColumn(['remaining_pool_balance', 'payment_history']);
        });
    }
};
