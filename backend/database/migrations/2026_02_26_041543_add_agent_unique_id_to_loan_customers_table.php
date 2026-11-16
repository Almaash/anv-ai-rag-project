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
            $table->string('agent_unique_id')->nullable()->after('customer_unique_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_customers', function (Blueprint $table) {
            $table->dropColumn('agent_unique_id');
        });
    }
};
