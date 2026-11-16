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
            $table->decimal('allocation_charges', 5, 2)->default(0.00)->after('referral_commission');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('investor_investments', function (Blueprint $table) {
            $table->dropColumn('allocation_charges');
        });
    }
};
