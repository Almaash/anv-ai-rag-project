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
            $table->renameColumn('user_unique_id', 'customer_unique_id');
        });

        Schema::table('loan_applications', function (Blueprint $table) {
            $table->renameColumn('user_unique_id', 'customer_unique_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_customers', function (Blueprint $table) {
            $table->renameColumn('customer_unique_id', 'user_unique_id');
        });

        Schema::table('loan_applications', function (Blueprint $table) {
            $table->renameColumn('customer_unique_id', 'user_unique_id');
        });
    }
};
