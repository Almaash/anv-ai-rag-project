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
        Schema::table('loan_agents', function (Blueprint $table) {
            $table->string('aadhaar_image_back')->nullable()->after('adhaar_image');
            $table->string('voter_id_image_back')->nullable()->after('voter_id_image');
        });
    }

    public function down(): void
    {
        Schema::table('loan_agents', function (Blueprint $table) {
            $table->dropColumn(['aadhaar_image_back', 'voter_id_image_back']);
        });
    }
};
