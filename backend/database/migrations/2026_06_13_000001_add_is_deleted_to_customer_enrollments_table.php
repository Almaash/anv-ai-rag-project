<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customer_enrollments', function (Blueprint $table) {
            if (!Schema::hasColumn('customer_enrollments', 'is_deleted')) {
                $table->boolean('is_deleted')->default(false)->after('status');
                $table->index('is_deleted');
            }
        });
    }

    public function down(): void
    {
        Schema::table('customer_enrollments', function (Blueprint $table) {
            if (Schema::hasColumn('customer_enrollments', 'is_deleted')) {
                $table->dropIndex(['is_deleted']);
                $table->dropColumn('is_deleted');
            }
        });
    }
};
