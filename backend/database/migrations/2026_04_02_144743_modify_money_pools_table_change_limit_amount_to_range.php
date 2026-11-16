<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('money_pools', function (Blueprint $table) {
            $table->decimal('limit_from', 15, 2)->after('name');
            $table->decimal('limit_to', 15, 2)->after('limit_from');
        });

        // Migrate existing data if needed
        DB::table('money_pools')->update([
            'limit_from' => DB::raw('limit_amount'),
            'limit_to' => DB::raw('limit_amount'),
        ]);

        Schema::table('money_pools', function (Blueprint $table) {
            $table->dropColumn('limit_amount');
            $table->renameColumn('is_active', 'status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('money_pools', function (Blueprint $table) {
            $table->renameColumn('status', 'is_active');
            $table->decimal('limit_amount', 15, 2)->after('name');
        });

        DB::table('money_pools')->update([
            'limit_amount' => DB::raw('limit_from'),
        ]);

        Schema::table('money_pools', function (Blueprint $table) {
            $table->dropColumn(['limit_from', 'limit_to']);
        });
    }
};
