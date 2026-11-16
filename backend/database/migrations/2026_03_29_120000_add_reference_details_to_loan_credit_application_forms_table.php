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
            $table->string('reference1_name')->nullable()->after('business_proof_name');
            $table->string('reference1_contact')->nullable()->after('reference1_name');
            $table->text('reference1_address')->nullable()->after('reference1_contact');
            $table->string('reference2_name')->nullable()->after('reference1_address');
            $table->string('reference2_contact')->nullable()->after('reference2_name');
            $table->text('reference2_address')->nullable()->after('reference2_contact');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_credit_application_forms', function (Blueprint $table) {
            $table->dropColumn([
                'reference1_name',
                'reference1_contact',
                'reference1_address',
                'reference2_name',
                'reference2_contact',
                'reference2_address',
            ]);
        });
    }
};
