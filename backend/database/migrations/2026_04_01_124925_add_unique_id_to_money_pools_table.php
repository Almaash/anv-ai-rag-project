<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('money_pools', 'unique_id')) {
            Schema::table('money_pools', function (Blueprint $table) {
                $table->string('unique_id')->nullable()->after('id')->unique();
            });
        }

        // Generate unique_ids for existing records if null
        $pools = DB::table('money_pools')->whereNull('unique_id')->get();
        foreach ($pools as $pool) {
            DB::table('money_pools')
                ->where('id', $pool->id)
                ->update(['unique_id' => 'PL-' . strtoupper(Str::random(8))]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('money_pools', function (Blueprint $table) {
            $table->dropColumn('unique_id');
        });
    }
};
