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
        Schema::table('loan_customers', function (Blueprint $table) {
            $table->string('enrollment_id')->nullable()->after('id')->unique();
            $table->string('customer_id')->nullable()->after('enrollment_id')->unique();
            // Using enrollment_id and customer_id instead of current formatted enrollment_number
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_customers', function (Blueprint $table) {
            $table->dropColumn(['enrollment_id', 'customer_id']);
        });
    }
};
