<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_payments', function (Blueprint $table) {
            $table->string('payment_screenshot')->nullable()->after('transaction_id');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_payments', function (Blueprint $table) {
            $table->dropColumn('payment_screenshot');
        });
    }
};
