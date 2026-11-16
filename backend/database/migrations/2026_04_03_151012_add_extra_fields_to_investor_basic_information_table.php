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
        Schema::table('investor_basic_information', function (Blueprint $table) {
            $table->enum('referral_type', ['Self', 'Referral'])->default('Self')->after('unique_id');
            $table->string('referral_id')->nullable()->after('referral_type');
            $table->date('enrollment_date')->nullable()->after('date_of_birth');
            $table->string('emergency_contact')->nullable()->after('mobile');
            $table->json('nominee_details')->nullable()->after('permanent_address');
        });
    }

    public function down(): void
    {
        Schema::table('investor_basic_information', function (Blueprint $table) {
            $table->dropColumn(['referral_type', 'referral_id', 'enrollment_date', 'emergency_contact', 'nominee_details']);
        });
    }
};
