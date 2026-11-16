<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop FK so category_id can store unique_id text.
        $databaseName = DB::getDatabaseName();
        $foreignKey = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', $databaseName)
            ->where('TABLE_NAME', 'inventory_attributes')
            ->where('COLUMN_NAME', 'category_id')
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->value('CONSTRAINT_NAME');

        if (!empty($foreignKey)) {
            DB::statement("ALTER TABLE inventory_attributes DROP FOREIGN KEY {$foreignKey}");
        }

        DB::statement("ALTER TABLE inventory_attributes MODIFY category_id VARCHAR(50) NULL");

        DB::statement(
            "UPDATE inventory_attributes ia
            LEFT JOIN inventory_categories ic ON ic.id = CAST(ia.category_id AS UNSIGNED)
            SET ia.category_id = ic.unique_id
            WHERE ia.category_id IS NOT NULL
              AND ia.category_id <> ''
              AND ia.category_id REGEXP '^[0-9]+$'"
        );

        Schema::table('inventory_attributes', function (Blueprint $table) {
            $table->index('category_id', 'inventory_attributes_category_id_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_attributes', function (Blueprint $table) {
            if (Schema::hasColumn('inventory_attributes', 'category_id')) {
                $table->dropIndex('inventory_attributes_category_id_index');
            }
        });

        DB::statement(
            "UPDATE inventory_attributes ia
            LEFT JOIN inventory_categories ic ON ic.unique_id = ia.category_id
            SET ia.category_id = CAST(ic.id AS CHAR)
            WHERE ia.category_id IS NOT NULL
              AND ia.category_id <> ''
              AND ia.category_id REGEXP '^INV-CAT-[0-9]+$'"
        );

        DB::statement("ALTER TABLE inventory_attributes MODIFY category_id BIGINT UNSIGNED NULL");

        Schema::table('inventory_attributes', function (Blueprint $table) {
            $table->foreign('category_id')->references('id')->on('inventory_categories')->nullOnDelete();
        });
    }
};
