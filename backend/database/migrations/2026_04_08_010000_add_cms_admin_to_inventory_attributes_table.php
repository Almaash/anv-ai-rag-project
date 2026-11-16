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
        Schema::table('inventory_attributes', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_attributes', 'cms_admin')) {
                $table->string('cms_admin')->nullable()->after('branch');
                $table->index('cms_admin');
            }
        });

        if (Schema::hasColumn('inventory_attributes', 'admin_user_id') && Schema::hasColumn('inventory_attributes', 'cms_admin')) {
            DB::statement("UPDATE inventory_attributes SET cms_admin = admin_user_id WHERE cms_admin IS NULL AND admin_user_id IS NOT NULL");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_attributes', function (Blueprint $table) {
            if (Schema::hasColumn('inventory_attributes', 'cms_admin')) {
                $table->dropIndex(['cms_admin']);
                $table->dropColumn('cms_admin');
            }
        });
    }
};
