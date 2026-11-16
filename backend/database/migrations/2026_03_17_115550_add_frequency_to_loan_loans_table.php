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
        Schema::table('loan_loans', function (Blueprint $table) {
            $table->enum('frequency', ['weekly', 'biweekly', 'monthly'])->default('monthly')->after('tenure_months');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_loans', function (Blueprint $table) {
            $table->dropColumn('frequency');
        });
    }
};
