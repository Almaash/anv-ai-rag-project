<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Vendors: phone unique per branch
        Schema::table('inventory_vendors', function (Blueprint $table) {
            try {
                $table->dropUnique('inventory_vendors_phone_unique');
            } catch (\Throwable $e) {
            }

            $table->unique(['branch', 'phone'], 'inventory_vendors_branch_phone_unique');
        });

        // Taxes: name unique per branch
        Schema::table('inventory_taxes', function (Blueprint $table) {
            try {
                $table->dropUnique('inventory_taxes_name_unique');
            } catch (\Throwable $e) {
            }

            $table->unique(['branch', 'name'], 'inventory_taxes_branch_name_unique');
        });

        // Attributes: name unique per branch
        Schema::table('inventory_attributes', function (Blueprint $table) {
            try {
                $table->dropUnique('inventory_attributes_name_unique');
            } catch (\Throwable $e) {
            }

            $table->unique(['branch', 'name'], 'inventory_attributes_branch_name_unique');
        });

        // Brands: name unique per branch
        Schema::table('inventory_brands', function (Blueprint $table) {
            try {
                $table->dropUnique('inventory_brands_name_unique');
            } catch (\Throwable $e) {
            }

            $table->unique(['branch', 'name'], 'inventory_brands_branch_name_unique');
        });

        // Products: sku_code unique per branch
        Schema::table('inventory_products', function (Blueprint $table) {
            try {
                $table->dropUnique('inventory_products_sku_code_unique');
            } catch (\Throwable $e) {
            }

            $table->unique(['branch', 'sku_code'], 'inventory_products_branch_sku_code_unique');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_vendors', function (Blueprint $table) {
            try {
                $table->dropUnique('inventory_vendors_branch_phone_unique');
            } catch (\Throwable $e) {
            }

            $table->unique('phone', 'inventory_vendors_phone_unique');
        });

        Schema::table('inventory_taxes', function (Blueprint $table) {
            try {
                $table->dropUnique('inventory_taxes_branch_name_unique');
            } catch (\Throwable $e) {
            }

            $table->unique('name', 'inventory_taxes_name_unique');
        });

        Schema::table('inventory_attributes', function (Blueprint $table) {
            try {
                $table->dropUnique('inventory_attributes_branch_name_unique');
            } catch (\Throwable $e) {
            }

            $table->unique('name', 'inventory_attributes_name_unique');
        });

        Schema::table('inventory_brands', function (Blueprint $table) {
            try {
                $table->dropUnique('inventory_brands_branch_name_unique');
            } catch (\Throwable $e) {
            }

            $table->unique('name', 'inventory_brands_name_unique');
        });

        Schema::table('inventory_products', function (Blueprint $table) {
            try {
                $table->dropUnique('inventory_products_branch_sku_code_unique');
            } catch (\Throwable $e) {
            }

            $table->unique('sku_code', 'inventory_products_sku_code_unique');
        });
    }
};
