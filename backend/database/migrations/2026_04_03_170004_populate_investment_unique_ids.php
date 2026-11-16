<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Generate unique_id for existing investments
        $investments = DB::table('investments')->whereNull('unique_id')->get();
        
        foreach ($investments as $investment) {
            $yearMonth = date('Ym', strtotime($investment->created_at));
            $prefix = 'ANVINV' . $yearMonth;
            
            // Find the highest existing number for this prefix
            $lastInvestment = DB::table('investments')
                ->where('unique_id', 'like', $prefix . '%')
                ->orderBy('unique_id', 'desc')
                ->first();
            
            $nextNumber = 1;
            if ($lastInvestment) {
                $lastNumber = (int) substr($lastInvestment->unique_id, -4);
                $nextNumber = $lastNumber + 1;
            }
            
            $uniqueId = $prefix . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
            
            // Update the investment with unique_id
            DB::table('investments')
                ->where('id', $investment->id)
                ->update(['unique_id' => $uniqueId]);
            
            // Update any existing weekly schedules to use the unique_id
            DB::table('investment_weekly_schedules')
                ->where('investment_id', $investment->id)
                ->update(['investment_unique_id' => $uniqueId]);
        }
    }

    public function down(): void
    {
        // Clear the unique_id and investment_unique_id fields
        DB::table('investments')->update(['unique_id' => null]);
        DB::table('investment_weekly_schedules')->update(['investment_unique_id' => null]);
    }
};