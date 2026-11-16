<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('inventory_units') || !Schema::hasColumn('inventory_units', 'admin_user_id')) {
            return;
        }

        DB::statement(
            "UPDATE inventory_units
             SET admin_user_id = 'SYSTEM'
             WHERE admin_user_id IS NULL OR TRIM(admin_user_id) = ''"
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Forward-only data backfill.
    }
};
