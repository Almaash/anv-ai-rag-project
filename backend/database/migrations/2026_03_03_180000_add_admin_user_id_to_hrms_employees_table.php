<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hrms_employees', function (Blueprint $table) {
            if (!Schema::hasColumn('hrms_employees', 'admin_user_id')) {
                $table->string('admin_user_id')->nullable()->after('admin_id');
                $table->index('admin_user_id');
            }
        });

        // Backfill from users.user_id and align employee branch with owner's branch code.
        DB::statement("
            UPDATE hrms_employees e
            JOIN users u ON u.id = e.admin_id
            LEFT JOIN branches b ON b.code = u.branch
            SET e.admin_user_id = u.user_id,
                e.branch_id = COALESCE(b.id, e.branch_id)
            WHERE e.admin_id IS NOT NULL
        ");
    }

    public function down(): void
    {
        Schema::table('hrms_employees', function (Blueprint $table) {
            if (Schema::hasColumn('hrms_employees', 'admin_user_id')) {
                $table->dropIndex(['admin_user_id']);
                $table->dropColumn('admin_user_id');
            }
        });
    }
};

