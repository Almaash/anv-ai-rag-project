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
            $table->string('cms_admin_id')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_interest_masters', function (Blueprint $table) {
            $table->dropColumn('cms_admin_id');
        });
    }
};
