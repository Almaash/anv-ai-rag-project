<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('inventory_sales_orders')) {
            Schema::table('inventory_sales_orders', function (Blueprint $table) {
                if (!Schema::hasColumn('inventory_sales_orders', 'is_deleted')) {
                    $table->unsignedTinyInteger('is_deleted')->default(0)->after('status');
                    $table->index('is_deleted');
                }
            });
        }

        if (Schema::hasTable('inventory_sales_order_items')) {
            Schema::table('inventory_sales_order_items', function (Blueprint $table) {
                if (!Schema::hasColumn('inventory_sales_order_items', 'is_deleted')) {
                    $table->unsignedTinyInteger('is_deleted')->default(0)->after('total');
                    $table->index('is_deleted');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('inventory_sales_order_items') && Schema::hasColumn('inventory_sales_order_items', 'is_deleted')) {
            Schema::table('inventory_sales_order_items', function (Blueprint $table) {
                $table->dropIndex(['is_deleted']);
                $table->dropColumn('is_deleted');
            });
        }

        if (Schema::hasTable('inventory_sales_orders') && Schema::hasColumn('inventory_sales_orders', 'is_deleted')) {
            Schema::table('inventory_sales_orders', function (Blueprint $table) {
                $table->dropIndex(['is_deleted']);
                $table->dropColumn('is_deleted');
            });
        }
    }
};
