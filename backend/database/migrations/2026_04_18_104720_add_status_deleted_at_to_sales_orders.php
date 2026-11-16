<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_sales_orders', function (Blueprint $table) {
            $table->string('status', 50)->default('active')->after('notes');
            $table->softDeletes()->after('updated_at');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_sales_orders', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn('status');
        });
    }
};
