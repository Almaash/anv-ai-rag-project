<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('finance_transactions', function (Blueprint $table) {
            $table->enum('payment_mode', [
                'cash', 'bank_transfer', 'upi', 'cheque', 'demand_draft', 'neft', 'rtgs', 'imps', 'other'
            ])->nullable()->after('payment_reference_id');
        });
    }

    public function down(): void
    {
        Schema::table('finance_transactions', function (Blueprint $table) {
            $table->dropColumn('payment_mode');
        });
    }
};
