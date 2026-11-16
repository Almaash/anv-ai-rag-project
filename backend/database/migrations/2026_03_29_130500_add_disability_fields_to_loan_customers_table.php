<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('loan_customers', function (Blueprint $table) {
            $table->boolean('is_disabled')->default(false)->after('assets');
            $table->string('disability_type')->nullable()->after('is_disabled');
        });
    }

    public function down(): void
    {
        Schema::table('loan_customers', function (Blueprint $table) {
            $table->dropColumn(['is_disabled', 'disability_type']);
        });
    }
};
