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
        if (!Schema::hasTable('inventory_payments') || !Schema::hasColumn('inventory_payments', 'invoice_id')) {
            return;
        }

        $databaseName = DB::getDatabaseName();
        $foreignKeys = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', $databaseName)
            ->where('TABLE_NAME', 'inventory_payments')
            ->where('COLUMN_NAME', 'invoice_id')
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->pluck('CONSTRAINT_NAME')
            ->unique()
            ->values();

        foreach ($foreignKeys as $foreignKey) {
            DB::statement("ALTER TABLE inventory_payments DROP FOREIGN KEY {$foreignKey}");
        }

        DB::statement('ALTER TABLE inventory_payments MODIFY invoice_id VARCHAR(100) NULL');

        DB::statement(
            "UPDATE inventory_payments p
             LEFT JOIN inventory_invoices i ON i.id = CAST(p.invoice_id AS UNSIGNED)
             SET p.invoice_id = i.invoice_no
             WHERE p.invoice_id IS NOT NULL
               AND p.invoice_id <> ''
               AND p.invoice_id REGEXP '^[0-9]+$'"
        );

        Schema::table('inventory_payments', function (Blueprint $table) {
            try {
                $table->index('invoice_id', 'inventory_payments_invoice_id_idx');
            } catch (\Throwable $e) {
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('inventory_payments') || !Schema::hasColumn('inventory_payments', 'invoice_id')) {
            return;
        }

        DB::statement(
            "UPDATE inventory_payments p
             LEFT JOIN inventory_invoices i ON i.invoice_no = p.invoice_id
             SET p.invoice_id = CAST(i.id AS CHAR)
             WHERE p.invoice_id IS NOT NULL
               AND p.invoice_id <> ''
               AND p.invoice_id REGEXP '^INV-[0-9]{8}-[0-9]{4}$'"
        );

        DB::statement('ALTER TABLE inventory_payments MODIFY invoice_id BIGINT UNSIGNED NOT NULL');

        Schema::table('inventory_payments', function (Blueprint $table) {
            try {
                $table->dropIndex('inventory_payments_invoice_id_idx');
            } catch (\Throwable $e) {
            }

            $table->foreign('invoice_id')->references('id')->on('inventory_invoices')->onDelete('cascade');
        });
    }
};
