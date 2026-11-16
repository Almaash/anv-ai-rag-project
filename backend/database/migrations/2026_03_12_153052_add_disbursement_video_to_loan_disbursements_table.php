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
        Schema::table('loan_disbursements', function (Blueprint $table) {
            if (!Schema::hasColumn('loan_disbursements', 'disbursement_video')) {
                $table->string('disbursement_video')->nullable()->after('vernacular_document');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_disbursements', function (Blueprint $table) {
            $table->dropColumn('disbursement_video');
        });
    }
};
