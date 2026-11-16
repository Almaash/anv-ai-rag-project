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
        // Add emi_id column if it doesn't exist
        if (!Schema::hasColumn('loan_emi_schedules', 'emi_id')) {
            Schema::table('loan_emi_schedules', function (Blueprint $table) {
                $table->string('emi_id')->nullable()->unique()->after('id');
            });
        }

        // Generate unique EMI IDs for existing records that don't have one
        $schedules = DB::table('loan_emi_schedules')
            ->whereNull('emi_id')
            ->orWhere('emi_id', '')
            ->get();
            
        foreach ($schedules as $schedule) {
            $emiId = 'EMI' . str_pad($schedule->id, 8, '0', STR_PAD_LEFT);
            DB::table('loan_emi_schedules')
                ->where('id', $schedule->id)
                ->update(['emi_id' => $emiId]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reset emi_id to null
        DB::table('loan_emi_schedules')->update(['emi_id' => null]);
    }
};