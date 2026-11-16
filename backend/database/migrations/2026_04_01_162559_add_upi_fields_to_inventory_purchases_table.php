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
        Schema::table('inventory_purchases', function (Blueprint $table) {
            $table->string('upi_reference_no')->nullable()->after('payment_method');
            $table->string('payment_screenshot')->nullable()->after('upi_reference_no');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_purchases', function (Blueprint $table) {
            $table->dropColumn(['upi_reference_no', 'payment_screenshot']);
        });
    }
};
