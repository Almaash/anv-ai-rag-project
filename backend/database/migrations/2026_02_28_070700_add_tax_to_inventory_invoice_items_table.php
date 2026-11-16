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
        Schema::table('inventory_invoice_items', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_invoice_items', 'tax_type')) {
                $table->enum('tax_type', ['percentage', 'fixed'])->default('percentage')->after('discount_amount');
            }
            if (!Schema::hasColumn('inventory_invoice_items', 'tax_value')) {
                $table->decimal('tax_value', 15, 2)->default(0)->after('tax_type');
            }
            if (!Schema::hasColumn('inventory_invoice_items', 'tax_amount')) {
                $table->decimal('tax_amount', 15, 2)->default(0)->after('tax_value');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_invoice_items', function (Blueprint $table) {
            $table->dropColumn(['tax_type', 'tax_value', 'tax_amount']);
        });
    }
};
