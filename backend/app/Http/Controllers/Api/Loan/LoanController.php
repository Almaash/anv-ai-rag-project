<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\Loan\Loan;
use App\Models\Loan\EmiSchedule;
use App\Models\Loan\CreditApplicationForm;
use App\Models\Inventory\ProductMaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class LoanController extends Controller
{
    public function startLoan(Request $request)
    {
        try {
            Log::info('Start Loan Request:', $request->all());

            $request->validate([
                'loan_application_id'    => 'required|string',
                'customer_unique_id'     => 'required|string|exists:loan_customers,customer_unique_id',
                'branch_id'              => 'nullable|string',
                'cms_admin_id'           => 'nullable|string',
                'agent_unique_id'        => 'nullable|string',
                'disbursement_id'        => 'nullable|string',
                'loan_amount'            => 'required|numeric|min:1000',
                'interest_rate'          => 'required|numeric|min:0.1|max:100',
                'tenure'                 => 'required|integer|min:1|max:360',
                'frequency'              => 'nullable|in:weekly,biweekly,monthly',
                'processing_fee'         => 'nullable|numeric|min:0',
                'gst_amount'             => 'nullable|numeric|min:0',
                'insurance_amount'       => 'nullable|numeric|min:0',
                'loan_start_date'        => 'required|date',
                'installment_start_date' => 'nullable|date',
            ]);

            // Check product stock if CAF has a product
            $caf = CreditApplicationForm::where('loan_application_id', $request->loan_application_id)->first();
            if ($caf && $caf->product_code) {
                $product = ProductMaster::where('sku_code', $caf->product_code)->first();
                if (!$product) {
                    return response()->json(['success' => false, 'message' => 'Product not found: ' . $caf->product_code], 404);
                }
                if ($product->stock <= 0) {
                    return response()->json(['success' => false, 'message' => 'Product out of stock: ' . $product->name], 400);
                }
            }

            DB::beginTransaction();

            $loanAmount   = (float) $request->loan_amount;
            $interestRate = (float) $request->interest_rate;
            $tenure       = (int) $request->tenure;
            $frequency    = $request->input('frequency', 'monthly');

            $periodsPerYear = match($frequency) {
                'weekly'    => 52,
                'biweekly'  => 26,
                default     => 12,
            };

            $periodRate = $interestRate / $periodsPerYear / 100;
            $emiAmount  = $this->calculateEMI($loanAmount, $periodRate, $tenure);

            $loanStartDate        = Carbon::parse($request->loan_start_date);
            $installmentStartDate = $request->installment_start_date
                ? Carbon::parse($request->installment_start_date)
                : $loanStartDate->copy()->addMonth();

            $disbursementAmount = $loanAmount - (float) ($request->processing_fee ?? 0) - (float) ($request->insurance_amount ?? 0);

            $loan = Loan::create([
                'loan_application_id'    => $request->loan_application_id,
                'customer_unique_id'     => $request->customer_unique_id,
                'branch_id'              => $request->branch_id,
                'cms_admin_id'           => $request->cms_admin_id,
                'agent_unique_id'        => $request->agent_unique_id,
                'disbursement_id'        => $request->disbursement_id,
                'loan_amount'            => $loanAmount,
                'interest_rate'          => $interestRate,
                'tenure_months'          => $tenure,
                'frequency'              => $frequency,
                'emi_amount'             => $emiAmount,
                'processing_fee'         => $request->input('processing_fee', 0),
                'gst_amount'             => $request->input('gst_amount', 0),
                'insurance_amount'       => $request->input('insurance_amount', 0),
                'disbursement_amount'    => $disbursementAmount,
                'loan_start_date'        => $loanStartDate->format('Y-m-d'),
                'installment_start_date' => $installmentStartDate->format('Y-m-d'),
            ]);

            $this->generateEmiSchedule($loan, $loanAmount, $periodRate, $emiAmount, $tenure, $installmentStartDate);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Loan started successfully and EMI schedule generated',
                'data' => [
                    'loan_id'        => $loan->id,
                    'loan_number'    => $loan->loan_number,
                    'emi_amount'     => $emiAmount,
                    'total_amount'   => round($emiAmount * $tenure, 2),
                    'total_interest' => round(($emiAmount * $tenure) - $loanAmount, 2),
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Loan Start Error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'message' => 'Failed to start loan', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Calculate EMI using Excel PMT formula
     * EMI = (P * r * (1+r)^n) / ((1+r)^n - 1)
     */
    private function calculateEMI($principal, $monthlyRate, $tenure)
    {
        if ($monthlyRate == 0) {
            return round($principal / $tenure, 2);
        }

        $factor = pow(1 + $monthlyRate, $tenure);
        $emi = ($principal * $monthlyRate * $factor) / ($factor - 1);
        
        return round($emi, 2);
    }

    /**
     * Generate EMI schedule with Excel IPMT/PPMT logic
     */
    private function generateEmiSchedule($loan, $loanAmount, $periodRate, $emiAmount, $tenure, $startDate)
    {
        $outstandingBalance = $loanAmount;
        $dueDate = $startDate->copy();
        $emiSchedules = [];

        for ($period = 1; $period <= $tenure; $period++) {
            $interestAmount = round($outstandingBalance * $periodRate, 2);
            $principalAmount = round($emiAmount - $interestAmount, 2);
            
            if ($period == $tenure) {
                $principalAmount = $outstandingBalance;
                $currentEmiAmount = $principalAmount + $interestAmount;
            } else {
                $currentEmiAmount = $emiAmount;
            }
            
            $outstandingBalance = round($outstandingBalance - $principalAmount, 2);
            
            if ($outstandingBalance < 0) {
                $outstandingBalance = 0;
            }

            $emiSchedules[] = [
                'loan_id'            => $loan->loan_number,
                'branch_id'          => $loan->branch_id,
                'cms_admin_id'       => $loan->cms_admin_id,
                'installment_no'     => $period,
                'installment_date'   => $dueDate->format('Y-m-d'),
                'installment_amount' => $currentEmiAmount,
                'principal_due'      => $principalAmount,
                'interest_due'       => $interestAmount,
                'outstanding_balance'=> $outstandingBalance,
                'status'             => 'pending',
                'created_at'         => now(),
                'updated_at'         => now()
            ];

            // Move to next period
            $match = $loan->frequency;
            if ($match === 'weekly') {
                $dueDate->addWeek();
            } elseif ($match === 'biweekly') {
                $dueDate->addWeeks(2);
            } else {
                $dueDate->addMonth();
            }
        }

        EmiSchedule::insert($emiSchedules);
    }

    public function getLoanDetails($loanId)
    {
        try {
            $loan = Loan::with(['emiSchedules' => function($query) {
                $query->orderBy('emi_number');
            }, 'customer'])->findOrFail($loanId);

            return response()->json([
                'success' => true,
                'data' => $loan
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Loan not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function getEmiSchedule($loanId)
    {
        try {
            $loan = Loan::findOrFail($loanId);
            $emiSchedules = EmiSchedule::where('loan_id', $loan->loan_id)
                ->orderBy('emi_number')
                ->get();

            if ($emiSchedules->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'EMI schedule not found for this loan'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $emiSchedules
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch EMI schedule',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getAllLoans(Request $request)
    {
        try {
            $query = Loan::with(['customer', 'emiSchedules' => function($q) {
                $q->where('status', 'pending')->orderBy('emi_number')->limit(1);
            }]);

            if ($request->filled('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            if ($request->filled('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }

            if ($request->filled('cms_admin_id')) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            if ($request->filled('agent_unique_id')) {
                $query->where('agent_unique_id', $request->agent_unique_id);
            }

            if ($request->filled('loan_status')) {
                $query->where('loan_status', $request->loan_status);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('loan_id', 'LIKE', "%{$search}%")
                      ->orWhere('loan_application_id', 'LIKE', "%{$search}%")
                      ->orWhere('user_id', 'LIKE', "%{$search}%");
                });
            }

            $loans = $query->orderBy('created_at', 'desc')->paginate(50);

            return response()->json([
                'success' => true,
                'data' => $loans
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch loans',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getLoanCard($loanNumber)
    {
        try {
            // Simple test first
            $loan = Loan::where('loan_number', $loanNumber)->first();
            
            if (!$loan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Loan not found with number: ' . $loanNumber
                ], 404);
            }

            // Basic loan data without relationships
            $basicLoanData = [
                'loan_number' => $loan->loan_number,
                'loan_amount' => $loan->loan_amount,
                'disbursement_amount' => $loan->disbursement_amount ?? 0,
                'processing_fee' => $loan->processing_fee ?? 0,
                'gst_amount' => $loan->gst_amount ?? 0,
                'insurance_amount' => $loan->insurance_amount ?? 0,
                'interest_rate' => $loan->interest_rate ?? 0,
                'tenure_months' => $loan->tenure_months ?? 0,
                'emi_amount' => $loan->emi_amount ?? 0,
                'frequency' => $loan->frequency ?? 'monthly'
            ];

            // Try to get EMI schedules
            $emiSchedules = EmiSchedule::where('loan_id', $loan->loan_number)
                ->orderBy('installment_no')
                ->get();

            $totalPayable = $emiSchedules->sum('installment_amount') ?: 0;
            $totalInterestPaid = $totalPayable - ($loan->loan_amount ?? 0);
            $totalCredit = ($loan->loan_amount ?? 0) + ($loan->processing_fee ?? 0) + ($loan->gst_amount ?? 0) + ($loan->insurance_amount ?? 0);

            $loanCard = [
                'loan_details' => [
                    'loan_number' => $loan->loan_number,
                    'disbursement_amount' => number_format($loan->disbursement_amount ?? 0, 2),
                    'processing_fee' => number_format($loan->processing_fee ?? 0, 2),
                    'gst' => number_format($loan->gst_amount ?? 0, 2),
                    'insurance' => number_format($loan->insurance_amount ?? 0, 2),
                    'total_credit' => number_format($totalCredit, 2),
                    'interest_rate' => ($loan->interest_rate ?? 0) . '%',
                    'tenure' => ($loan->tenure_months ?? 0) . ' months',
                    'installment_per_month' => number_format($loan->emi_amount ?? 0, 2),
                    'disbursement_date' => $loan->loan_start_date ? $loan->loan_start_date->format('d-m-Y') : null,
                    'installment_start_date' => $loan->installment_start_date ? $loan->installment_start_date->format('d-m-Y') : null,
                    'total_payable' => number_format($totalPayable, 2),
                    'total_interest_paid' => number_format($totalInterestPaid, 2),
                    'last_installment_date' => $emiSchedules->last() && $emiSchedules->last()->installment_date ? $emiSchedules->last()->installment_date->format('d-m-Y') : null,
                    'frequency' => ucfirst($loan->frequency ?? 'monthly')
                ],
                'emi_schedule' => $emiSchedules->map(function($emi) {
                    return [
                        'installment_no' => $emi->installment_no ?? 0,
                        'due_date' => $emi->installment_date ? $emi->installment_date->format('d-m-Y') : null,
                        'installment_amount' => number_format($emi->installment_amount ?? 0, 2),
                        'principal_amount' => number_format($emi->principal_due ?? 0, 2),
                        'interest_amount' => number_format($emi->interest_due ?? 0, 2),
                        'outstanding_balance' => number_format($emi->outstanding_balance ?? 0, 2),
                        'status' => ucfirst($emi->status ?? 'pending'),
                        'paid_date' => null,
                        'paid_amount' => null
                    ];
                }),
                'debug_info' => [
                    'loan_found' => true,
                    'emi_count' => $emiSchedules->count(),
                    'basic_loan_data' => $basicLoanData
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $loanCard
            ]);

        } catch (\Exception $e) {
            \Log::error('Loan Card Error: ' . $e->getMessage(), [
                'loan_number' => $loanNumber,
                'line' => $e->getLine(),
                'file' => $e->getFile(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch loan card details',
                'error' => $e->getMessage(),
                'debug' => [
                    'line' => $e->getLine(),
                    'file' => basename($e->getFile())
                ]
            ], 500);
        }
    }

    public function testLoanData()
    {
        try {
            $loanCount = Loan::count();
            $firstLoan = Loan::first();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'total_loans' => $loanCount,
                    'first_loan' => $firstLoan ? [
                        'loan_number' => $firstLoan->loan_number,
                        'loan_amount' => $firstLoan->loan_amount,
                        'created_at' => $firstLoan->created_at
                    ] : null
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}