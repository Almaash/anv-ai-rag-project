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
        Schema::table('branches', function (Blueprint $table) {
            $table->foreignId('branch_city_id')->nullable()->after('id')->constrained('branch_cities');
            $table->integer('sequence')->nullable()->after('branch_city_id');
            // 'code' column already exists in branches table, we'll repurpose it
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropForeign(['branch_city_id']);
            $table->dropColumn(['branch_city_id', 'sequence']);
        });
    }
};
