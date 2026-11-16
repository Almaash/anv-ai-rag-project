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
            $table->string('pan_card_doc')->nullable()->after('profile_photo');
            $table->string('aadhaar_card_doc')->nullable()->after('pan_card_doc');
            $table->string('passbook_doc')->nullable()->after('aadhaar_card_doc');
            $table->string('voter_id_doc')->nullable()->after('passbook_doc');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('investor_basic_information', function (Blueprint $table) {
            $table->dropColumn(['pan_card_doc', 'aadhaar_card_doc', 'passbook_doc', 'voter_id_doc']);
        });
    }
};
