<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_emi_payments', function (Blueprint $table) {
            if (!Schema::hasColumn('loan_emi_payments', 'is_deleted')) {
                $table->tinyInteger('is_deleted')->default(0)->after('approved_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('loan_emi_payments', function (Blueprint $table) {
            $table->dropColumn('is_deleted');
        });
    }
};
