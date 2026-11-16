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
        Schema::table('loan_interest_masters', function (Blueprint $table) {
            if (!Schema::hasColumn('loan_interest_masters', 'user_id')) {
                $table->string('user_id')->nullable();
            }
            if (!Schema::hasColumn('loan_interest_masters', 'branch_id')) {
                $table->string('branch_id')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_interest_masters', function (Blueprint $table) {
            $table->dropColumn(['user_id', 'branch_id']);
        });
    }
};
