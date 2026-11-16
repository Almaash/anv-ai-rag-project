<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_invoice_items', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_invoice_items', 'purchase_item_id')) {
                $table->unsignedBigInteger('purchase_item_id')->nullable()->after('product_id');
                $table->index('purchase_item_id', 'inv_invoice_items_purchase_item_idx');
            }

            if (!Schema::hasColumn('inventory_invoice_items', 'attribute_summary')) {
                $table->string('attribute_summary', 500)->nullable()->after('product_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('inventory_invoice_items', function (Blueprint $table) {
            if (Schema::hasColumn('inventory_invoice_items', 'attribute_summary')) {
                $table->dropColumn('attribute_summary');
            }

            if (Schema::hasColumn('inventory_invoice_items', 'purchase_item_id')) {
                $table->dropIndex('inv_invoice_items_purchase_item_idx');
                $table->dropColumn('purchase_item_id');
            }
        });
    }
};

