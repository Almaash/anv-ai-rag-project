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
        Schema::table('inventory_products', function (Blueprint $table) {
            $table->foreignId('attribute_id')->nullable()->after('category_id')->constrained('inventory_attributes')->onDelete('set null');
            $table->string('attribute_value')->nullable()->after('attribute_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_products', function (Blueprint $table) {
            $table->dropForeign(['attribute_id']);
            $table->dropColumn(['attribute_id', 'attribute_value']);
        });
    }
};
