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
            $table->integer('product_quantity')->default(0)->after('product_details');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_credit_application_forms', function (Blueprint $table) {
            $table->dropColumn('product_quantity');
        });
    }
};
