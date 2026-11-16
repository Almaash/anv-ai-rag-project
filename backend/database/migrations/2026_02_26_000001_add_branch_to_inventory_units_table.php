<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_units', function (Blueprint $table) {
            if (! Schema::hasColumn('inventory_units', 'branch')) {
                $table->string('branch')->nullable()->after('id');
                $table->index('branch');
            }
        });
    }

    public function down(): void
    {
        Schema::table('inventory_units', function (Blueprint $table) {
            if (Schema::hasColumn('inventory_units', 'branch')) {
                $table->dropIndex(['branch']);
                $table->dropColumn('branch');
            }
        });
    }
};
