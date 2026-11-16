<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_product_cart', function (Blueprint $table) {
            $table->boolean('verified_by_fe')->default(false)->after('selected_variant');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_product_cart', function (Blueprint $table) {
            $table->dropColumn('verified_by_fe');
        });
    }
};
