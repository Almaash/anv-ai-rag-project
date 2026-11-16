<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hrms_leave_requests', function (Blueprint $table) {
            $table->enum('leave_category', ['sick', 'casual', 'maternity', 'paid'])->default('casual')->after('leave_type_id');
            $table->boolean('is_paid_leave')->default(false)->after('total_days');
        });
    }

    public function down(): void
    {
        Schema::table('hrms_leave_requests', function (Blueprint $table) {
            $table->dropColumn(['leave_category', 'is_paid_leave']);
        });
    }
};
