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
        Schema::table('finance_cash_book', function (Blueprint $table) {
            $table->string('payment_mode', 50)->nullable()->after('closing_balance');
            $table->text('description')->nullable()->after('payment_mode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('finance_cash_book', function (Blueprint $table) {
            $table->dropColumn(['payment_mode', 'description']);
        });
    }
};