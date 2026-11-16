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
        Schema::table('loan_pd_information', function (Blueprint $table) {
            $table->boolean('is_disbursement_created')->default(false)->after('is_cam_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_pd_information', function (Blueprint $table) {
            $table->dropColumn('is_disbursement_created');
        });
    }
};