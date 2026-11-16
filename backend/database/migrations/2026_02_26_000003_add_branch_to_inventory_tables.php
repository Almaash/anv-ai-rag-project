<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'inventory_vendors',
            'inventory_categories',
            'inventory_taxes',
            'inventory_attributes',
            'inventory_brands',
            'inventory_products',
            'inventory_invoices',
        ];

        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (! Schema::hasColumn($tableName, 'branch')) {
                    $table->string('branch')->nullable()->after('id');
                    $table->index('branch');
                }
            });
        }
    }

    public function down(): void
    {
        $tables = [
            'inventory_vendors',
            'inventory_categories',
            'inventory_taxes',
            'inventory_attributes',
            'inventory_brands',
            'inventory_products',
            'inventory_invoices',
        ];

        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (Schema::hasColumn($tableName, 'branch')) {
                    $table->dropIndex([$tableName . '_branch_index' ?? 'branch']);
                    $table->dropColumn('branch');
                }
            });
        }
    }
};
