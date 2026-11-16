<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_credit_application_forms', function (Blueprint $table) {
            $table->decimal('discount', 15, 2)->nullable()->after('down_payment');
        });
    }

    public function down(): void
    {
        Schema::table('loan_credit_application_forms', function (Blueprint $table) {
            $table->dropColumn('discount');
        });
    }
};
