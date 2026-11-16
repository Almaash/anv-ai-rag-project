<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_credit_application_forms', function (Blueprint $table) {
            if (!Schema::hasColumn('loan_credit_application_forms', 'is_delete_requested')) {
                $table->boolean('is_delete_requested')->default(false)->after('is_deleted');
                $table->index('is_delete_requested');
            }
        });

        Schema::table('loan_customers', function (Blueprint $table) {
            if (!Schema::hasColumn('loan_customers', 'is_delete_requested')) {
                $table->boolean('is_delete_requested')->default(false)->after('is_deleted');
                $table->index('is_delete_requested');
            }
        });
    }

    public function down(): void
    {
    }
};