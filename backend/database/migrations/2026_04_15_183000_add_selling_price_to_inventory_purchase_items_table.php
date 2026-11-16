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
        if (!Schema::hasTable('inventory_purchase_items')) {
            return;
        }

        Schema::table('inventory_purchase_items', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_purchase_items', 'selling_price')) {
                $table->decimal('selling_price', 15, 2)->nullable()->after('purchase_price');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('inventory_purchase_items')) {
            return;
        }

        Schema::table('inventory_purchase_items', function (Blueprint $table) {
            if (Schema::hasColumn('inventory_purchase_items', 'selling_price')) {
                $table->dropColumn('selling_price');
            }
        });
    }
};
