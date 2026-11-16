<?php

namespace App\Services;

use App\Models\Loan\Loan;
use App\Models\Loan\EmiSchedule;
use Carbon\Carbon;

class EmiCalculatorService
{
    public static function generateEmiSchedule(Loan $loan)
    {
        $principal = $loan->loan_amount;
        $monthlyRate = $loan->interest_rate / 12 / 100;
        $tenure = $loan->tenure_months;
        $emiAmount = $loan->emi_amount;
        $startDate = Carbon::parse($loan->loan_start_date);
        
        $balance = $principal;
        
        for ($i = 1; $i <= $tenure; $i++) {
            $interestAmount = $balance * $monthlyRate;
            $principalAmount = $emiAmount - $interestAmount;
            $balance -= $principalAmount;
            
            if ($balance < 0) $balance = 0;
            
            $uniqueEmiNumber = 'EMI' . date('Y') . str_pad((EmiSchedule::max('id') ?? 0) + 1, 6, '0', STR_PAD_LEFT);
            
            EmiSchedule::create([
                'loan_id' => $loan->loan_id,
                'emi_number' => $uniqueEmiNumber,
                'due_date' => $startDate->copy()->addMonths($i - 1),
                'emi_amount' => $emiAmount,
                'principal_amount' => $principalAmount,
                'interest_amount' => $interestAmount,
                'remaining_balance' => $balance,
                'status' => 'pending',
                'user_id' => $loan->user_id,
                'branch_id' => $loan->branch_id,
                'cms_admin_id' => $loan->cms_admin_id
            ]);
        }
    }
}
