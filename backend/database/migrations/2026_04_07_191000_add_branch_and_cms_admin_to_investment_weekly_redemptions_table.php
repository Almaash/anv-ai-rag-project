<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_weekly_redemptions', function (Blueprint $table) {
            $table->string('branch_id')->nullable()->after('unique_id');
            $table->string('cms_admin_id')->nullable()->after('branch_id');
        });
    }

    public function down(): void
    {
        Schema::table('investment_weekly_redemptions', function (Blueprint $table) {
            $table->dropColumn(['branch_id', 'cms_admin_id']);
        });
    }
};
