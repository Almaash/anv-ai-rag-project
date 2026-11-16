<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hrms_attendance', function (Blueprint $table) {
            $table->foreignId('leave_request_id')->nullable()->after('employee_id')->constrained('hrms_leave_requests')->onDelete('set null');
            $table->text('remarks')->nullable()->after('note');
        });
    }

    public function down(): void
    {
        Schema::table('hrms_attendance', function (Blueprint $table) {
            $table->dropForeign(['leave_request_id']);
            $table->dropColumn(['leave_request_id', 'remarks']);
        });
    }
};
