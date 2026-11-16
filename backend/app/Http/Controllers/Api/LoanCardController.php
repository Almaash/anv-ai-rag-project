<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LoanCardController extends Controller
{
    public function getLoanCard($loanNumber)
    {
        try {
            // Get loan details directly from database
            $loan = DB::table('loan_loans')
                ->where('loan_number', $loanNumber)
                ->first();

            if (!$loan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Loan not found'
                ], 404);
            }

            // Get EMI schedules
            $emiSchedules = DB::table('loan_emi_schedules')
                ->where('loan_id', $loanNumber)
                ->orderBy('installment_no')
                ->get();

            // Calculate totals
            $totalPayable = $emiSchedules->sum('installment_amount') ?: 0;
            $totalInterestPaid = $totalPayable - ($loan->loan_amount ?? 0);
            $totalCredit = ($loan->loan_amount ?? 0) + ($loan->processing_fee ?? 0) + ($loan->gst_amount ?? 0) + ($loan->insurance_amount ?? 0);
            $lastInstallmentDate = $emiSchedules->last()?->installment_date ?? null;

            $loanCard = [
                'loan_details' => [
                    'loan_number' => $loan->loan_number,
                    'disbursement_amount' => number_format($loan->disbursement_amount ?? 0, 2),
                    'processing_fee' => number_format($loan->processing_fee ?? 0, 2),
                    'gst' => number_format($loan->gst_amount ?? 0, 2),
                    'insurance' => number_format($loan->insurance_amount ?? 0, 2),
                    'total_credit' => number_format($totalCredit, 2),
                    'interest_rate' => ($loan->interest_rate ?? 0) . '%',
                    'tenure' => ($loan->tenure_months ?? 0),
                    'installment_per_month' => number_format($loan->emi_amount ?? 0, 2),
                    'disbursement_date' => $loan->loan_start_date ? date('d-m-Y', strtotime($loan->loan_start_date)) : null,
                    'installment_start_date' => $loan->installment_start_date ? date('d-m-Y', strtotime($loan->installment_start_date)) : null,
                    'total_payable' => number_format($totalPayable, 2),
                    'total_interest_paid' => number_format($totalInterestPaid, 2),
                    'last_installment_date' => $lastInstallmentDate ? date('d-m-Y', strtotime($lastInstallmentDate)) : null,
                    'frequency' => ucfirst($loan->frequency ?? 'monthly')
                ],
                'emi_schedule' => $emiSchedules->map(function($emi) {
                    return [
                        'installment_no' => $emi->installment_no ?? 0,
                        'due_date' => $emi->installment_date ? date('d-m-Y', strtotime($emi->installment_date)) : null,
                        'installment_amount' => number_format($emi->installment_amount ?? 0, 2),
                        'principal_amount' => number_format($emi->principal_due ?? 0, 2),
                        'interest_amount' => number_format($emi->interest_due ?? 0, 2),
                        'outstanding_balance' => number_format($emi->outstanding_balance ?? 0, 2),
                        'status' => ucfirst($emi->status ?? 'pending'),
                        'paid_date' => null,
                        'paid_amount' => null
                    ];
                })->toArray()
            ];

            return response()->json([
                'success' => true,
                'data' => $loanCard
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch loan card details',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}