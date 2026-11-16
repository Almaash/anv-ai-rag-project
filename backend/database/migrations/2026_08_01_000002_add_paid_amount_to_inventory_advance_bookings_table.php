<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_advance_bookings', function (Blueprint $table) {
            $table->decimal('paid_amount', 15, 4)->default(0)->after('advance_paid');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_advance_bookings', function (Blueprint $table) {
            $table->dropColumn('paid_amount');
        });
    }
};
