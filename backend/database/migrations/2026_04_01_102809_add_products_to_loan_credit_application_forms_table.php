<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_credit_application_forms', function (Blueprint $table) {
            $table->json('products')->nullable()->after('product_quantity')
                ->comment('Array of products for multi-product CAF');
        });
    }

    public function down(): void
    {
        Schema::table('loan_credit_application_forms', function (Blueprint $table) {
            $table->dropColumn('products');
        });
    }
};
