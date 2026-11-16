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
        if (!Schema::hasTable('investor_investments')) {
            return;
        }

        if (Schema::hasColumn('investor_investments', 'pool_id')) {
            DB::statement('ALTER TABLE investor_investments MODIFY pool_id VARCHAR(255) NULL');
            DB::statement(
                "UPDATE investor_investments ii
                 LEFT JOIN money_pools mp ON mp.id = CAST(ii.pool_id AS UNSIGNED)
                 SET ii.pool_id = mp.unique_id,
                     ii.pool_unique_id = COALESCE(ii.pool_unique_id, mp.unique_id)
                 WHERE ii.pool_id IS NOT NULL
                   AND ii.pool_id <> ''
                   AND ii.pool_id REGEXP '^[0-9]+$'"
            );
        }

        if (Schema::hasColumn('investor_investments', 'investor_type_id')) {
            DB::statement('ALTER TABLE investor_investments MODIFY investor_type_id VARCHAR(255) NULL');
            DB::statement(
                "UPDATE investor_investments ii
                 LEFT JOIN loan_investor_types lit ON lit.id = CAST(ii.investor_type_id AS UNSIGNED)
                 SET ii.investor_type_id = lit.unique_id,
                     ii.investor_type_unique_id = COALESCE(ii.investor_type_unique_id, lit.unique_id)
                 WHERE ii.investor_type_id IS NOT NULL
                   AND ii.investor_type_id <> ''
                   AND ii.investor_type_id REGEXP '^[0-9]+$'"
            );
        }

        if (Schema::hasColumn('investor_investments', 'cms_admin_id')) {
            DB::statement(
                "UPDATE investor_investments
                 SET cms_admin_id = 'SYSTEM'
                 WHERE cms_admin_id IS NULL OR TRIM(cms_admin_id) = ''"
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Forward-only migration.
    }
};
