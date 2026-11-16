<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branch_cities', function (Blueprint $table) {
            $table->dropUnique('branch_cities_city_number_unique');
        });
    }

    public function down(): void
    {
        Schema::table('branch_cities', function (Blueprint $table) {
            $table->unique('city_number', 'branch_cities_city_number_unique');
        });
    }
};
