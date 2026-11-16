<?php

namespace App\Services;

use App\Models\Investment;
use App\Models\InvestmentWeeklySchedule;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InvestmentService
{
    /**
     * Create investment and generate weekly schedule
     */
    public function createInvestment(array $data): Investment
    {
        return DB::transaction(function () use ($data) {
            // Calculate total amount
            $data['total_amount'] = $data['self_amount'] + $data['referral_amount'];
            
            // Create investment record
            $investment = Investment::create($data);
            
            // Generate weekly schedule
            $this->generateWeeklySchedule($investment);
            
            // Calculate and update summary
            $this->calculateSummary($investment);
            
            return $investment->fresh(['weeklySchedules']);
        });
    }

    /**
     * Generate weekly schedule for investment
     */
    public function generateWeeklySchedule(Investment $investment): void
    {
        $weeklySchedules = [];
        $currentDate = Carbon::parse($investment->investment_start_date);
        $totalWeeks = $investment->total_weeks;
        
        // Calculate weekly bonuses
        $weeklySelfBonus = $investment->weekly_self_bonus;
        $weeklyReferralBonus = $investment->weekly_referral_bonus;
        $weeklyTotalEarning = $investment->weekly_total_earning;
        
        $openingBalance = $investment->total_amount;
        
        // Generate unique_id prefix for this batch
        $yearMonth = date('Ym');
        $prefix = 'INVSCH' . $yearMonth;
        
        // Find the last schedule unique_id to continue numbering
        $lastSchedule = InvestmentWeeklySchedule::where('unique_id', 'like', $prefix . '%')
            ->orderBy('unique_id', 'desc')
            ->first();
        
        $startNumber = 1;
        if ($lastSchedule) {
            $lastNumber = (int) substr($lastSchedule->unique_id, -6);
            $startNumber = $lastNumber + 1;
        }
        
        for ($week = 1; $week <= $totalWeeks; $week++) {
            // Calculate redemption value (opening balance + earnings)
            $redemptionValue = round($openingBalance + $weeklyTotalEarning, 2);
            
            // Default redeem is 0 (can be updated later)
            $redeem = 0;
            
            // Calculate closing balance
            $closingBalance = round($redemptionValue - $redeem, 2);
            
            // Generate unique_id for this schedule
            $uniqueId = $prefix . str_pad($startNumber + $week - 1, 6, '0', STR_PAD_LEFT);
            
            $weeklySchedules[] = [
                'unique_id' => $uniqueId,
                'investment_unique_id' => $investment->unique_id,
                'week_number' => $week,
                'date' => $currentDate->format('Y-m-d'),
                'self_bonus' => $weeklySelfBonus,
                'referral_bonus' => $weeklyReferralBonus,
                'total_earning' => $weeklyTotalEarning,
                'redemption_value' => $redemptionValue,
                'redeem' => $redeem,
                'closing_balance' => $closingBalance,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            
            // Set opening balance for next week
            $openingBalance = $closingBalance;
            
            // Move to next week
            $currentDate->addWeek();
        }
        
        // Bulk insert weekly schedules
        InvestmentWeeklySchedule::insert($weeklySchedules);
        
        Log::info("Generated {$totalWeeks} weekly schedules for investment unique_id: {$investment->unique_id}");
    }

    /**
     * Calculate investment summary
     */
    public function calculateSummary(Investment $investment): void
    {
        $weeklySchedules = $investment->weeklySchedules;
        
        // Calculate total earnings
        $totalEarnings = $weeklySchedules->sum('total_earning');
        
        // Get final closing balance
        $finalClosingBalance = $weeklySchedules->last()->closing_balance ?? 0;
        
        // Calculate allocation charges total
        $allocationChargesTotal = $investment->allocation_charges_total;
        
        // Calculate maturity amount
        $maturityAmount = round($finalClosingBalance - $allocationChargesTotal, 2);
        
        // Update investment with calculated values
        $investment->update([
            'total_earnings' => round($totalEarnings, 2),
            'maturity_amount' => $maturityAmount,
        ]);
        
        Log::info("Updated investment summary for unique_id: {$investment->unique_id}", [
            'total_earnings' => $totalEarnings,
            'maturity_amount' => $maturityAmount,
            'allocation_charges_total' => $allocationChargesTotal,
        ]);
    }

    /**
     * Process redemption for a specific week
     */
    public function processRedemption(Investment $investment, int $weekNumber, float $redeemAmount): bool
    {
        return DB::transaction(function () use ($investment, $weekNumber, $redeemAmount) {
            $weeklySchedule = InvestmentWeeklySchedule::where('investment_unique_id', $investment->unique_id)
                ->where('week_number', $weekNumber)
                ->first();
                
            if (!$weeklySchedule) {
                throw new \Exception("Weekly schedule not found for week {$weekNumber}");
            }
            
            // Update redeem amount
            $weeklySchedule->update([
                'redeem' => round($redeemAmount, 2),
                'closing_balance' => round($weeklySchedule->redemption_value - $redeemAmount, 2),
            ]);
            
            // Recalculate subsequent weeks
            $this->recalculateSubsequentWeeks($investment, $weekNumber);
            
            // Update investment summary
            $this->calculateSummary($investment);
            
            return true;
        });
    }

    /**
     * Recalculate subsequent weeks after redemption
     */
    private function recalculateSubsequentWeeks(Investment $investment, int $fromWeek): void
    {
        $subsequentWeeks = InvestmentWeeklySchedule::where('investment_unique_id', $investment->unique_id)
            ->where('week_number', '>', $fromWeek)
            ->orderBy('week_number')
            ->get();
            
        $weeklySelfBonus = $investment->weekly_self_bonus;
        $weeklyReferralBonus = $investment->weekly_referral_bonus;
        $weeklyTotalEarning = $investment->weekly_total_earning;
        
        foreach ($subsequentWeeks as $schedule) {
            // Get opening balance from previous week
            $previousWeek = InvestmentWeeklySchedule::where('investment_unique_id', $investment->unique_id)
                ->where('week_number', $schedule->week_number - 1)
                ->first();
                
            $openingBalance = $previousWeek ? $previousWeek->closing_balance : $investment->total_amount;
            
            // Recalculate values
            $redemptionValue = round($openingBalance + $weeklyTotalEarning, 2);
            $closingBalance = round($redemptionValue - $schedule->redeem, 2);
            
            $schedule->update([
                'redemption_value' => $redemptionValue,
                'closing_balance' => $closingBalance,
            ]);
        }
    }

    /**
     * Get investment with full schedule
     */
    public function getInvestmentWithSchedule(int $investmentId): Investment
    {
        return Investment::with(['weeklySchedules' => function ($query) {
            $query->orderBy('week_number');
        }])->findOrFail($investmentId);
    }

    /**
     * Get investment summary data
     */
    public function getInvestmentSummary(Investment $investment): array
    {
        return [
            'investment' => $investment->toArray(),
            'total_earnings' => $investment->total_earnings,
            'maturity_amount' => $investment->maturity_amount,
            'allocation_charges_total' => $investment->allocation_charges_total,
            'total_weeks' => $investment->total_weeks,
            'weekly_self_bonus' => $investment->weekly_self_bonus,
            'weekly_referral_bonus' => $investment->weekly_referral_bonus,
            'weekly_total_earning' => $investment->weekly_total_earning,
        ];
    }
}