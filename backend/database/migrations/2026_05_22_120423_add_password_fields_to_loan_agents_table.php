<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_agents', function (Blueprint $table) {
            $table->string('password')->nullable()->after('email');
            $table->string('unhashed_password')->nullable()->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('loan_agents', function (Blueprint $table) {
            $table->dropColumn(['password', 'unhashed_password']);
        });
    }
};
