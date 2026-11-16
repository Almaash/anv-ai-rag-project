<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add unique_id column if it doesn't exist
        if (!Schema::hasColumn('investment_weekly_schedules', 'unique_id')) {
            Schema::table('investment_weekly_schedules', function (Blueprint $table) {
                $table->string('unique_id')->nullable()->after('id');
            });
        }
        
        // Update all records that have null or empty unique_id
        $schedules = DB::table('investment_weekly_schedules')
            ->where(function($query) {
                $query->whereNull('unique_id')
                      ->orWhere('unique_id', '');
            })
            ->orderBy('id')
            ->get();
        
        $yearMonth = date('Ym');
        $prefix = 'INVSCH' . $yearMonth;
        $counter = 1;
        
        foreach ($schedules as $schedule) {
            $uniqueId = $prefix . str_pad($counter, 6, '0', STR_PAD_LEFT);
            
            DB::table('investment_weekly_schedules')
                ->where('id', $schedule->id)
                ->update(['unique_id' => $uniqueId]);
            
            $counter++;
        }
    }

    public function down(): void
    {
        // Clear unique_id values
        DB::table('investment_weekly_schedules')->update(['unique_id' => null]);
    }
};