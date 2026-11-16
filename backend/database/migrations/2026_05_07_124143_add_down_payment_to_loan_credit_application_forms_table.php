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
        Schema::table('loan_credit_application_forms', function (Blueprint $table) {
            $table->decimal('down_payment', 15, 2)->nullable()->after('credit_applied_for');
        });
    }

    public function down(): void
    {
        Schema::table('loan_credit_application_forms', function (Blueprint $table) {
            $table->dropColumn('down_payment');
        });
    }
};
