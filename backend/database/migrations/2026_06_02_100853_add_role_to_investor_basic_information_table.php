<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investor_basic_information', function (Blueprint $table) {
            $table->string('role')->default('investor')->after('unhashed_password');
        });
    }

    public function down(): void
    {
        Schema::table('investor_basic_information', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
