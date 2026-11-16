<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investor_basic_information', function (Blueprint $table) {
            $table->decimal('total_referral_bonus', 15, 2)->default(0)->after('nominee_details')->comment('Total referral bonus earned by this investor');
        });
    }

    public function down(): void
    {
        Schema::table('investor_basic_information', function (Blueprint $table) {
            $table->dropColumn('total_referral_bonus');
        });
    }
};