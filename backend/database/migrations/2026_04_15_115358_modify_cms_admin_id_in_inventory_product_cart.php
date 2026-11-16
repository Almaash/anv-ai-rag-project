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
        Schema::table('inventory_product_cart', function (Blueprint $table) {
            $table->string('cms_admin_id')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_product_cart', function (Blueprint $table) {
            $table->bigInteger('cms_admin_id')->unsigned()->change();
        });
    }
};
