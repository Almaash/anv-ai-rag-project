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
        Schema::table('inventory_product_masters', function (Blueprint $table) {
            $table->softDeletes()->after('status');
        });

        Schema::table('inventory_vendors', function (Blueprint $table) {
            $table->softDeletes()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_product_masters', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('inventory_vendors', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
