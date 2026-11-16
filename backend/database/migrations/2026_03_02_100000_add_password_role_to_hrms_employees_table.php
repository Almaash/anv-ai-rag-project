<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hrms_employees', function (Blueprint $table) {
            // Make user_id nullable since employees no longer need a User record
            $table->foreignId('user_id')->nullable()->change();

            // Auth fields on the employee itself
            $table->string('password')->nullable()->after('email');
            $table->string('role')->default('employee')->after('status');
            $table->rememberToken()->after('role');

            // Admin-tenant scoping: which admin (User) owns this employee data
            $table->unsignedBigInteger('admin_id')->nullable()->after('id');
            $table->index('admin_id');
            $table->index('branch_id');
        });
    }

    public function down(): void
    {
        Schema::table('hrms_employees', function (Blueprint $table) {
            $table->dropIndex(['admin_id']);
            $table->dropColumn(['password', 'role', 'remember_token', 'admin_id']);
        });
    }
};
