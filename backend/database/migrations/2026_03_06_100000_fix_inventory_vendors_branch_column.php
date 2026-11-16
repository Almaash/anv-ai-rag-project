<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('inventory_vendors', 'branch')) {
            Schema::table('inventory_vendors', function (Blueprint $table) {
                $table->string('branch')->default('default')->after('id');
                $table->index('branch');
            });
        }
        
        try {
            Schema::table('inventory_vendors', function (Blueprint $table) {
                // Drop old phone unique constraint
                $table->dropUnique('inventory_vendors_phone_unique');
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('inventory_vendors', function (Blueprint $table) {
                // Add new composite unique constraint for branch + phone
                $table->unique(['branch', 'phone'], 'inventory_vendors_branch_phone_unique');
            });
        } catch (\Exception $e) {}
        
        // Add business_name and profile_photo if they don't exist
        if (!Schema::hasColumn('inventory_vendors', 'business_name')) {
            Schema::table('inventory_vendors', function (Blueprint $table) {
                $table->string('business_name')->nullable()->after('name');
            });
        }
        
        if (!Schema::hasColumn('inventory_vendors', 'profile_photo')) {
            Schema::table('inventory_vendors', function (Blueprint $table) {
                $table->string('profile_photo')->nullable()->after('business_name');
            });
        }
    }

    public function down(): void
    {
        Schema::table('inventory_vendors', function (Blueprint $table) {
            $table->dropUnique('inventory_vendors_branch_phone_unique');
            $table->unique('phone', 'inventory_vendors_phone_unique');
            $table->dropIndex(['branch']);
            $table->dropColumn('branch');
        });
    }
};
