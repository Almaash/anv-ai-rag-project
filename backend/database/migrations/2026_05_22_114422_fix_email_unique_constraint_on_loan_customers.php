<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Drop the existing simple unique index on email
        Schema::table('loan_customers', function (Blueprint $table) {
            $table->dropUnique('loan_customers_email_unique');
        });

        // Add composite unique index on (email, is_deleted)
        // This allows the same email to exist once as active (is_deleted=0) and once as deleted (is_deleted=1)
        Schema::table('loan_customers', function (Blueprint $table) {
            $table->unique(['email', 'is_deleted'], 'loan_customers_email_is_deleted_unique');
        });
    }

    public function down(): void
    {
        Schema::table('loan_customers', function (Blueprint $table) {
            $table->dropUnique('loan_customers_email_is_deleted_unique');
        });

        Schema::table('loan_customers', function (Blueprint $table) {
            $table->unique('email', 'loan_customers_email_unique');
        });
    }
};
