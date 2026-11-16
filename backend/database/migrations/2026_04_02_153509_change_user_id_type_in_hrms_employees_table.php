<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Drop foreign key if exists
        try {
            Schema::table('hrms_employees', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
            });
        } catch (\Exception $e) {
            // No foreign key, continue
        }

        // Change column type from bigint to string
        DB::statement('ALTER TABLE hrms_employees MODIFY COLUMN user_id VARCHAR(50) NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE hrms_employees MODIFY COLUMN user_id BIGINT UNSIGNED NULL');
    }
};
