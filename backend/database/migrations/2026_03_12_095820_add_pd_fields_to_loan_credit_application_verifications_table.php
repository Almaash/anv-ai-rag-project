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
            $table->string('house_verification_photo')->nullable()->after('cms_admin_id');
            $table->string('business_verification_photo')->nullable()->after('house_verification_photo');
            $table->json('pd_information')->nullable()->after('business_verification_photo');
            $table->string('verification_status')->nullable()->after('pd_information');
            $table->text('verification_notes')->nullable()->after('verification_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_pd_information', function (Blueprint $table) {
            $table->dropColumn([
                'house_verification_photo',
                'business_verification_photo', 
                'pd_information',
                'verification_status',
                'verification_notes'
            ]);
        });
    }
};
