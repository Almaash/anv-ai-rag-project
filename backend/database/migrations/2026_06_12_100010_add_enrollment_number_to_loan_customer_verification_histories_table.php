<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_customer_verification_history', function (Blueprint $table) {
            $table->string('enrollment_number')
                ->nullable()
                ->after('customer_unique_id');

            $table->index('enrollment_number', 'idx_verification_history_enrollment');
        });
    }

    public function down(): void
    {
        Schema::table('loan_customer_verification_history', function (Blueprint $table) {
            $table->dropIndex('idx_verification_history_enrollment');
            $table->dropColumn('enrollment_number');
        });
    }
};