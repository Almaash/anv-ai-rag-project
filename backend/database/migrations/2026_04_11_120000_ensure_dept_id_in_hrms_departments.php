<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('hrms_departments', 'dept_id')) {
            Schema::table('hrms_departments', function (Blueprint $table) {
                $table->string('dept_id')->unique()->after('id')->nullable();
            });
            
            DB::table('hrms_departments')->whereNull('dept_id')->update([
                'dept_id' => DB::raw('id')
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('hrms_departments', 'dept_id')) {
            Schema::table('hrms_departments', function (Blueprint $table) {
                $table->dropColumn('dept_id');
            });
        }
    }
};