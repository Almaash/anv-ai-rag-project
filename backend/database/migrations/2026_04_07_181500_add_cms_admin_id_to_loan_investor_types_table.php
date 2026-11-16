<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_investor_types', function (Blueprint $table) {
            $table->string('cms_admin_id')->nullable()->after('branch_id');
        });
    }

    public function down(): void
    {
        Schema::table('loan_investor_types', function (Blueprint $table) {
            $table->dropColumn('cms_admin_id');
        });
    }
};
