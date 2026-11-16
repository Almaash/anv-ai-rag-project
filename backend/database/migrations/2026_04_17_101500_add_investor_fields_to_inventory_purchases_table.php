<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_purchases', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_purchases', 'investor_investment_id')) {
                $table->string('investor_investment_id')->nullable()->after('branch_id');
            }
            if (!Schema::hasColumn('inventory_purchases', 'investor_unique_id')) {
                $table->string('investor_unique_id')->nullable()->after('investor_investment_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('inventory_purchases', function (Blueprint $table) {
            $table->dropColumn(['investor_investment_id', 'investor_unique_id']);
        });
    }
};