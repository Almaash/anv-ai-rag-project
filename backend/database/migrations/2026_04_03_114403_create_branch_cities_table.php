<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branch_cities', function (Blueprint $table) {
            $table->id();
            $table->string('city_name');                    // e.g. Hazaribagh
            $table->string('city_code', 10)->unique();      // e.g. HZB
            $table->string('city_number', 10)->unique();    // e.g. 4401
            $table->string('branch_code', 20)->nullable();  // e.g. HZB-4401 (auto-generated)
            $table->string('state')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_cities');
    }
};
