<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Loan;
use App\Models\EmiSchedule;
use App\Models\Loan\CustomerEnrollment;
use App\Models\Inventory\ProductMaster;
use App\Models\Inventory\PurchaseItem;
use App\Models\Inventory\InvoiceItem;
use App\Models\Inventory\InventorySale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class LoanController extends Controller
{
    public function startLoan(Request $request)
    {
        try {
            // Log incoming request for debugging
            Log::info('Start Loan Request Data:', $request->all());

            $validatedData = $request->validate([
                'loan_application_id' => 'required|string',
                'customer_unique_id' => 'required|string',
                'branch_id' => 'nullable|string',
                'cms_admin_id' => 'nullable|string',
                'agent_unique_id' => 'nullable|string',
                'disbursement_id' => 'nullable|string',
                'loan_amount' => 'required|numeric|min:100',
                'interest_rate' => 'required|numeric|min:0|max:50',
                'tenure' => 'required|integer|min:1',
                'frequency' => 'required|in:weekly,biweekly,monthly',
                'processing_fee' => 'nullable|numeric|min:0',
                'gst_amount' => 'nullable|numeric|min:0',
                'insurance_amount' => 'nullable|numeric|min:0',
                'loan_start_date' => 'required|date',
                'installment_start_date' => 'required|date|after_or_equal:loan_start_date'
            ]);

            Log::info('Validation passed with data:', $validatedData);

            // Pre-validate inventory for product loans BEFORE any DB writes
            $cafCheck = \App\Models\Loan\CreditApplicationForm::where('loan_application_id', $request->loan_application_id)->first();
            if ($cafCheck && strtolower($cafCheck->credit_mode) === 'product') {
                $products = $cafCheck->products ?? [];
                if (!empty($products)) {
                    $inventoryError = $this->validateInventoryVariants($products);
                    if ($inventoryError) {
                        return response()->json(['success' => false, 'message' => $inventoryError], 422);
                    }
                }
            }

            DB::beginTransaction();

            // Calculate EMI based on frequency
            $loanAmount = $request->loan_amount;
            $interestRate = $request->interest_rate;
            $tenure = $request->tenure;
            $frequency = $request->frequency;

            // --- Product Loan Date Logic (Sync with Frontend) ---
            $isProductLoan = false;
            $repaymentDay = 'monday';

            $caf = \App\Models\Loan\CreditApplicationForm::where('loan_application_id', $request->loan_application_id)->first();
            if ($caf) {
                $isProductLoan = strtolower($caf->credit_mode) === 'product';
                $repaymentDay = strtolower($caf->repayment_day ?? 'monday');
            }

            $loanStartDateStr = $request->loan_start_date;
            $installmentStartDateStr = $request->installment_start_date;

            if ($isProductLoan && ($frequency === 'weekly' || $frequency === 'biweekly')) {
                $loanStartDateObj = Carbon::parse($loanStartDateStr);
                $currentDay = $loanStartDateObj->dayOfWeek; // 0 (Sun) - 6 (Sat)

                $dayMap = [
                    'sunday' => 0,
                    'monday' => 1,
                    'tuesday' => 2,
                    'wednesday' => 3,
                    'thursday' => 4,
                    'friday' => 5,
                    'saturday' => 6
                ];
                $targetDay = $dayMap[$repaymentDay] ?? 1;

                // Validate no Sat/Sun
                if ($currentDay === 0 || $currentDay === 6) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Saturday and Sunday are not allowed as loan start dates for product loans.'
                    ], 422);
                }

                $daysToAdd = 0;
                if ($currentDay === 1 || $currentDay === 2) {
                    // Rule: Mon/Tue start
                    $diff = ($targetDay - $currentDay + 7) % 7;
                    // If same day (0), tomorrow (1), or if repayment day is Wed(3)/Thu(4)/Fri(5), skip to next week
                    if ($diff === 0 || $diff === 1 || in_array($targetDay, [3, 4, 5])) {
                        $daysToAdd = $diff + 7;
                    } else {
                        $daysToAdd = $diff;
                    }
                } elseif (in_array($currentDay, [3, 4, 5])) {
                    // Rule: Wed/Thu/Fri start -> Always skip to next week
                    $diff = ($targetDay - $currentDay + 7) % 7;
                    $daysToAdd = $diff + 7;
                }

                $calculatedInstallmentDate = $loanStartDateObj->copy()->addDays($daysToAdd);
                $installmentStartDateStr = $calculatedInstallmentDate->toDateString();
            }
            // --- End Product Loan Date Logic ---

            // Convert annual interest rate to period rate based on frequency
            $periodRate = $this->getPeriodRate($interestRate, $frequency);
            $emiAmount = $this->calculateEMI($loanAmount, $periodRate, $tenure);

            // Calculate processing fees and other amounts
            $processingFee = $request->processing_fee ?? 0;
            $gstAmount = $request->gst_amount ?? 0;
            $insuranceAmount = $request->insurance_amount ?? 0;

            // Calculate loan end date based on frequency
            $loanStartDate = Carbon::parse($loanStartDateStr);
            $loanEndDate = $this->calculateEndDate($loanStartDate, $tenure, $frequency);
            $totalAmount = round($emiAmount * $tenure, 2);

            // Calculate extra interest for first installment delay
            $extraInterestFirstInstallment = $this->calculateExtraFirstInstallmentInterest(
                $loanAmount,
                $interestRate,
                $loanStartDateStr,
                $installmentStartDateStr
            );

            // Calculate disbursement amount (Loan Amount - Fees)
            $disbursementAmount = $loanAmount - ($processingFee + $gstAmount + $insuranceAmount);

            // Create loan record
            $loan = Loan::create([
                'loan_application_id' => $request->loan_application_id,
                'customer_unique_id' => $request->customer_unique_id,
                'branch_id' => $request->branch_id,
                'cms_admin_id' => $request->cms_admin_id,
                'agent_unique_id' => $request->agent_unique_id,
                'disbursement_id' => $request->disbursement_id,
                'loan_amount' => $loanAmount,
                'interest_rate' => $interestRate,
                'tenure_months' => $tenure, // This will now represent periods based on frequency
                'frequency' => $frequency,
                'emi_amount' => $emiAmount,
                'loan_start_date' => $loanStartDateStr,
                'installment_start_date' => $installmentStartDateStr,
                'processing_fee' => $processingFee,
                'gst_amount' => $gstAmount,
                'insurance_amount' => $insuranceAmount,
                'disbursement_amount' => $disbursementAmount,
            ]);

            // Update disbursement record to mark loan as started
            if ($request->disbursement_id) {
                \App\Models\Loan\LoanDisbursement::where('disbursement_id', $request->disbursement_id)
                    ->update(['is_loan_started' => true]);
            }

            // Generate EMI schedule with frequency support
            $this->generateEmiSchedule(
                $loan,
                $loanAmount,
                $periodRate,
                $emiAmount,
                $tenure,
                $installmentStartDateStr,
                $frequency,
                $extraInterestFirstInstallment
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Loan started successfully and EMI schedule generated',
                'data' => [
                    'loan_id' => $loan->id,
                    'loan_number' => $loan->loan_number,
                    'disbursement_id' => $request->disbursement_id,
                    'disbursement_updated' => $request->disbursement_id ? true : false,
                    'frequency' => $frequency,
                    'emi_amount' => $emiAmount,
                    'total_interest' => round((($emiAmount * $tenure) - $loanAmount) + $extraInterestFirstInstallment, 2),
                    'total_amount' => round(($emiAmount * $tenure) + $extraInterestFirstInstallment, 2)
                ]
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            Log::error('Validation Error:', $e->errors());
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Loan Start Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to start loan',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate inventory variant availability for product loans.
     * Returns error message string on failure, null on success.
     */
    private function validateInventoryVariants(array $products): ?string
    {
        $hasPurchaseItemIdColumn = Schema::hasColumn('inventory_sales_order_items', 'purchase_item_id');

        foreach ($products as $item) {
            $productUniqueId = $item['product_code'] ?? $item['product_unique_id'] ?? null;
            if (!$productUniqueId) continue;

            $product = ProductMaster::where('unique_id', $productUniqueId)->where('status', 'active')->first();
            if (!$product) {
                return "Product {$productUniqueId} is not available";
            }

            $quantity = (int) ($item['product_quantity'] ?? $item['quantity'] ?? 1);
            $availableStock = (int) ($product->stock ?? 0);

            if ($quantity > $availableStock) {
                return "Requested quantity for {$product->name} exceeds available stock ({$availableStock})";
            }

            // Check variant if attributes are specified
            $attrs = $item['product_attributes'] ?? $item['attribute_summary'] ?? null;
            if (!empty($attrs)) {
                // Decode if JSON string
                if (is_string($attrs)) {
                    $decoded = json_decode($attrs, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $attrs = $decoded;
                    }
                }

                if (is_array($attrs) && !isset($attrs[0])) {
                    // Associative array: {"Size": "M", "Color": "Blue"}
                    $attrSummary = implode(' | ', array_map(fn($k, $v) => "{$k}: {$v}", array_keys($attrs), $attrs));
                } elseif (is_string($attrs)) {
                    $attrSummary = $attrs;
                } else {
                    $attrSummary = null;
                }

                if ($attrSummary) {
                    // Sort parts to normalize
                    $parts = array_map('trim', explode('|', $attrSummary));
                    sort($parts);
                    $normalizedSummary = implode(' | ', $parts);

                    $variantOptions = PurchaseItem::query()
                        ->where(function ($q) use ($product) {
                            $q->where('product_master_id', (string) $product->id)
                              ->orWhere('product_master_id', (string) $product->unique_id);
                        })
                        ->orderBy('id')
                        ->get()
                        ->map(function (PurchaseItem $purchaseItem) use ($hasPurchaseItemIdColumn) {
                            $purchaseItemUniqueId = 'INV-PI-' . str_pad((string) $purchaseItem->id, 6, '0', STR_PAD_LEFT);

                            $invoiceSoldQty = 0.0;
                            if ($hasPurchaseItemIdColumn) {
                                $invoiceSoldQty = (float) InvoiceItem::query()
                                    ->where(function ($q) use ($purchaseItem, $purchaseItemUniqueId) {
                                        $q->where('purchase_item_id', $purchaseItemUniqueId)
                                          ->orWhere('purchase_item_id', (string) $purchaseItem->id)
                                          ->orWhere('purchase_item_unique_id', $purchaseItemUniqueId);
                                    })->sum('quantity');
                            }

                            $directSoldQty = (float) InventorySale::query()
                                ->where(function ($q) use ($purchaseItem, $purchaseItemUniqueId) {
                                    $q->where('purchase_item_id', $purchaseItemUniqueId)
                                      ->orWhere('purchase_item_id', (string) $purchaseItem->id);
                                })->sum('quantity');

                            $rawLabel = trim((string) $purchaseItem->attribute_summary);
                            if ($rawLabel === '' || $rawLabel === 'Default') {
                                $normalized = 'Default';
                            } else {
                                $parts = array_map('trim', explode('|', $rawLabel));
                                sort($parts);
                                $normalized = implode(' | ', $parts);
                            }

                            return [
                                'attribute_summary' => $normalized,
                                'available_stock'   => max(0, (float) ($purchaseItem->quantity ?? 0) - $invoiceSoldQty - $directSoldQty),
                            ];
                        })
                        ->groupBy('attribute_summary')
                        ->map(fn($rows) => ['available_stock' => collect($rows)->sum('available_stock')])
                        ->toArray();

                    if (!isset($variantOptions[$normalizedSummary])) {
                        Log::warning('Variant not found', [
                            'product' => $product->name,
                            'requested_summary' => $normalizedSummary,
                            'available_variants' => array_keys($variantOptions),
                        ]);
                        return "Please select a valid variant for {$product->name}";
                    }

                    if ($quantity > (int) $variantOptions[$normalizedSummary]['available_stock']) {
                        return "Requested quantity for {$product->name} exceeds variant stock";
                    }
                }
            }
        }

        return null;
    }

    /**
     * Calculate EMI using Excel PMT formula
     * EMI = (P * r * (1+r)^n) / ((1+r)^n - 1)
     */
    private function calculateEMI($principal, $periodRate, $tenure)
    {
        if ($periodRate == 0) {
            return round($principal / $tenure, 2);
        }

        $factor = pow(1 + $periodRate, $tenure);
        $emi = ($principal * $periodRate * $factor) / ($factor - 1);

        return round($emi, 2);
    }

    /**
     * Get period rate based on frequency
     */
    private function getPeriodRate($annualRate, $frequency)
    {
        switch ($frequency) {
            case 'weekly':
                return $annualRate / 52 / 100; // 52 weeks in a year
            case 'biweekly':
                return $annualRate / 26 / 100; // 26 biweekly periods in a year
            case 'monthly':
            default:
                return $annualRate / 12 / 100; // 12 months in a year
        }
    }

    /**
     * Calculate end date based on frequency
     */
    private function calculateEndDate($startDate, $tenure, $frequency)
    {
        switch ($frequency) {
            case 'weekly':
                return $startDate->copy()->addWeeks($tenure);
            case 'biweekly':
                return $startDate->copy()->addWeeks($tenure * 2);
            case 'monthly':
            default:
                return $startDate->copy()->addMonths($tenure);
        }
    }

    private function calculateExtraFirstInstallmentInterest($loanAmount, $annualInterestRate, $loanStartDate, $installmentStartDate)
    {
        $loanStart = Carbon::parse($loanStartDate);
        $installmentStart = Carbon::parse($installmentStartDate);

        $daysBetween = $loanStart->diffInDays($installmentStart) + 1; // include start day in count
        $extraDays = max(0, $daysBetween - 30); // only days above 30

        if ($extraDays <= 0) {
            return 0;
        }

        $annualRate = $annualInterestRate / 100;
        $extraInterest = $loanAmount * $annualRate / 365 * $extraDays;

        return round($extraInterest, 2);
    }

    /**
     * Generate EMI schedule with Excel IPMT/PPMT logic and frequency support
     */
    private function generateEmiSchedule($loan, $loanAmount, $periodRate, $emiAmount, $tenure, $startDate, $frequency, $extraInterestFirstInstallment = 0)
    {
        $outstandingBalance = $loanAmount;
        $installmentDate = Carbon::parse($startDate);

        // For monthly frequency, set the day to 3rd of the month
        if ($frequency === 'monthly') {
            $installmentDate->day(3);
        }

        $emiSchedules = [];

        for ($period = 1; $period <= $tenure; $period++) {
            // Calculate interest for current period (Excel IPMT logic)
            $interestDue = round($outstandingBalance * $periodRate, 2);

            // Add extra interest only for the first installment
            if ($period === 1 && $extraInterestFirstInstallment > 0) {
                $interestDue = round($interestDue + $extraInterestFirstInstallment, 2);
            }

            // Calculate principal for current period (Excel PPMT logic)
            $principalDue = round($emiAmount - ($interestDue - ($period === 1 ? $extraInterestFirstInstallment : 0)), 2);

            // For last installment, adjust principal to make outstanding balance exactly 0
            if ($period == $tenure) {
                $principalDue = $outstandingBalance;
                $installmentAmount = $principalDue + $interestDue;
            } else {
                $installmentAmount = $emiAmount + ($period === 1 ? $extraInterestFirstInstallment : 0);
            }

            // Update outstanding balance
            $outstandingBalance = round($outstandingBalance - $principalDue, 2);

            // Ensure outstanding balance doesn't go negative
            if ($outstandingBalance < 0) {
                $outstandingBalance = 0;
            }

            $emiSchedules[] = [
                'emi_id' => 'EMI' . time() . str_pad(rand(0, 9999), 4, '0', STR_PAD_LEFT) . $period,
                'loan_id' => $loan->loan_number,
                'branch_id' => $loan->branch_id,
                'cms_admin_id' => $loan->cms_admin_id,
                'installment_no' => $period,
                'installment_date' => $installmentDate->format('Y-m-d'),
                'frequency' => $frequency,
                'principal_due' => $principalDue,
                'interest_due' => $interestDue,
                'installment_amount' => $installmentAmount,
                'outstanding_balance' => $outstandingBalance,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now()
            ];

            // Move to next period based on frequency
            switch ($frequency) {
                case 'weekly':
                    $installmentDate->addWeek();
                    break;
                case 'biweekly':
                    $installmentDate->addWeeks(2);
                    break;
                case 'monthly':
                default:
                    $installmentDate->addMonth();
                    // Set the day to 3rd of the month for all EMIs
                    $installmentDate->day(3);
                    break;
            }
        }

        // Bulk insert EMI schedules
        EmiSchedule::insert($emiSchedules);
    }

    public function getLoanDetails($loanId)
    {
        try {
            $loan = Loan::with([
                'customer:customer_unique_id,first_name,middle_name,last_name,email,contact_number_1,contact_number_2,permanent_address,correspondence_address',
                'emiSchedules' => function ($q) {
                    $q->select('loan_id', 'installment_no', 'installment_date', 'principal_due', 'interest_due', 'installment_amount', 'outstanding_balance', 'status', 'frequency')
                        ->orderBy('installment_no');
                }
            ])->where('loan_number', $loanId)
                ->orWhere('id', $loanId)
                ->firstOrFail();

            // Calculate loan statistics
            $totalAmount = $loan->emi_amount * $loan->tenure_months;
            $totalInterest = $totalAmount - $loan->loan_amount;
            $paidInstallments = $loan->emiSchedules->where('status', 'paid')->count();
            $pendingInstallments = $loan->emiSchedules->where('status', 'pending')->count();
            $overdueInstallments = $loan->emiSchedules->where('status', 'pending')
                ->where('installment_date', '<', now()->toDateString())
                ->count();

            $paidAmount = $loan->emiSchedules->where('status', 'paid')->sum('installment_amount');
            $pendingAmount = $loan->emiSchedules->where('status', 'pending')->sum('installment_amount');
            $nextEmi = $loan->emiSchedules->where('status', 'pending')->first();
            $lastPaidEmi = $loan->emiSchedules->where('status', 'paid')->last();

            $response = [
                'loan_info' => [
                    'loan_id' => $loan->id,
                    'loan_number' => $loan->loan_number,
                    'loan_application_id' => $loan->loan_application_id,
                    'disbursement_id' => $loan->disbursement_id,
                    'branch_id' => $loan->branch_id,
                    'cms_admin_id' => $loan->cms_admin_id,
                ],
                'customer_info' => [
                    'customer_unique_id' => $loan->customer_unique_id,
                    'name' => $loan->customer ? trim(($loan->customer->first_name ?? '') . ' ' . ($loan->customer->middle_name ?? '') . ' ' . ($loan->customer->last_name ?? '')) : null,
                    'email' => $loan->customer->email ?? null,
                    'contact_number_1' => $loan->customer->contact_number_1 ?? null,
                    'contact_number_2' => $loan->customer->contact_number_2 ?? null,
                    'permanent_address' => $loan->customer->permanent_address ?? null,
                    'correspondence_address' => $loan->customer->correspondence_address ?? null,
                    'status' => $loan->customer?->latestEnrollment?->status,
                ],
                'loan_terms' => [
                    'loan_amount' => (float) $loan->loan_amount,
                    'interest_rate' => (float) $loan->interest_rate,
                    'tenure' => $loan->tenure_months,
                    'frequency' => $loan->frequency,
                    'emi_amount' => (float) $loan->emi_amount,
                    'processing_fee' => (float) ($loan->processing_fee ?? 0),
                    'gst_amount' => (float) ($loan->gst_amount ?? 0),
                    'insurance_amount' => (float) ($loan->insurance_amount ?? 0),
                    'disbursement_amount' => (float) ($loan->disbursement_amount ?? 0),
                ],
                'loan_calculations' => [
                    'total_amount' => (float) $totalAmount,
                    'total_interest' => (float) $totalInterest,
                    'paid_amount' => (float) $paidAmount,
                    'pending_amount' => (float) $pendingAmount,
                    'outstanding_balance' => (float) ($nextEmi->outstanding_balance ?? 0),
                ],
                'installment_summary' => [
                    'total_installments' => $loan->tenure_months,
                    'paid_installments' => $paidInstallments,
                    'pending_installments' => $pendingInstallments,
                    'overdue_installments' => $overdueInstallments,
                ],
                'important_dates' => [
                    'loan_start_date' => $loan->loan_start_date,
                    'installment_start_date' => $loan->installment_start_date,
                    'loan_created_at' => $loan->created_at,
                    'loan_updated_at' => $loan->updated_at,
                ],
                'next_emi' => $nextEmi ? [
                    'installment_no' => $nextEmi->installment_no,
                    'installment_date' => $nextEmi->installment_date,
                    'principal_due' => (float) $nextEmi->principal_due,
                    'interest_due' => (float) $nextEmi->interest_due,
                    'installment_amount' => (float) $nextEmi->installment_amount,
                    'outstanding_balance' => (float) $nextEmi->outstanding_balance,
                    'frequency' => $nextEmi->frequency,
                    'days_until_due' => now()->diffInDays($nextEmi->installment_date, false),
                ] : null,
                'last_paid_emi' => $lastPaidEmi ? [
                    'installment_no' => $lastPaidEmi->installment_no,
                    'installment_date' => $lastPaidEmi->installment_date,
                    'installment_amount' => (float) $lastPaidEmi->installment_amount,
                    'frequency' => $lastPaidEmi->frequency,
                ] : null,
            ];

            return response()->json([
                'success' => true,
                'message' => 'Loan details retrieved successfully',
                'data' => $response
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
            $loan = Loan::where('loan_number', $loanId)->orWhere('id', $loanId)->first();
            if (!$loan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Loan not found'
                ], 404);
            }

            $emiSchedules = EmiSchedule::where('loan_id', $loan->loan_number)
                ->orderBy('installment_no')
                ->get();

            if ($emiSchedules->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'EMI schedule not found for this loan'
                ], 404);
            }

            // Calculate summary statistics
            $totalInstallments = $emiSchedules->count();
            $paidInstallments = $emiSchedules->where('status', 'paid')->count();
            $pendingInstallments = $emiSchedules->where('status', 'pending')->count();
            $overdueInstallments = $emiSchedules->where('status', 'pending')
                ->where('installment_date', '<', now()->toDateString())
                ->count();

            $totalAmount = $emiSchedules->sum('installment_amount');
            $paidAmount = $emiSchedules->where('status', 'paid')->sum('installment_amount');
            $pendingAmount = $emiSchedules->where('status', 'pending')->sum('installment_amount');
            $totalPrincipal = $emiSchedules->sum('principal_due');
            $totalInterest = $emiSchedules->sum('interest_due');

            $nextEmi = $emiSchedules->where('status', 'pending')->first();
            $lastPaidEmi = $emiSchedules->where('status', 'paid')->last();

            // Transform EMI schedule data
            $transformedSchedule = $emiSchedules->map(function ($emi) {
                $daysPastDue = null;
                $isOverdue = false;

                if ($emi->status === 'pending' && $emi->installment_date < now()->toDateString()) {
                    $isOverdue = true;
                    $daysPastDue = now()->diffInDays($emi->installment_date);
                }

                return [
                    'emi_id' => $emi->emi_id,
                    'installment_no' => $emi->installment_no,
                    'installment_date' => $emi->installment_date,
                    'frequency' => $emi->frequency,
                    'principal_due' => (float) $emi->principal_due,
                    'interest_due' => (float) $emi->interest_due,
                    'installment_amount' => (float) $emi->installment_amount,
                    'outstanding_balance' => (float) $emi->outstanding_balance,
                    'status' => $emi->status,
                    'is_overdue' => $isOverdue,
                    'days_past_due' => $daysPastDue,
                    'days_until_due' => $emi->status === 'pending' && !$isOverdue ? now()->diffInDays($emi->installment_date, false) : null,
                    'created_at' => $emi->created_at,
                    'updated_at' => $emi->updated_at,
                ];
            });

            $response = [
                'loan_info' => [
                    'loan_number' => $loan->loan_number,
                    'loan_amount' => (float) $loan->loan_amount,
                    'interest_rate' => (float) $loan->interest_rate,
                    'tenure' => $loan->tenure_months,
                    'frequency' => $loan->frequency,
                    'emi_amount' => (float) $loan->emi_amount,
                ],
                'schedule_summary' => [
                    'total_installments' => $totalInstallments,
                    'paid_installments' => $paidInstallments,
                    'pending_installments' => $pendingInstallments,
                    'overdue_installments' => $overdueInstallments,
                    'completion_percentage' => $totalInstallments > 0 ? round(($paidInstallments / $totalInstallments) * 100, 2) : 0,
                ],
                'amount_summary' => [
                    'total_amount' => (float) $totalAmount,
                    'total_principal' => (float) $totalPrincipal,
                    'total_interest' => (float) $totalInterest,
                    'paid_amount' => (float) $paidAmount,
                    'pending_amount' => (float) $pendingAmount,
                    'current_outstanding_balance' => (float) ($nextEmi->outstanding_balance ?? 0),
                ],
                'next_emi' => $nextEmi ? [
                    'installment_no' => $nextEmi->installment_no,
                    'installment_date' => $nextEmi->installment_date,
                    'installment_amount' => (float) $nextEmi->installment_amount,
                    'principal_due' => (float) $nextEmi->principal_due,
                    'interest_due' => (float) $nextEmi->interest_due,
                    'frequency' => $nextEmi->frequency,
                    'days_until_due' => now()->diffInDays($nextEmi->installment_date, false),
                ] : null,
                'last_paid_emi' => $lastPaidEmi ? [
                    'installment_no' => $lastPaidEmi->installment_no,
                    'installment_date' => $lastPaidEmi->installment_date,
                    'installment_amount' => (float) $lastPaidEmi->installment_amount,
                    'frequency' => $lastPaidEmi->frequency,
                ] : null,
                'emi_schedule' => $transformedSchedule,
            ];

            return response()->json([
                'success' => true,
                'message' => 'EMI schedule retrieved successfully',
                'data' => $response
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
            $query = Loan::select([
                'id',
                'loan_number',
                'loan_application_id',
                'customer_unique_id',
                'branch_id',
                'cms_admin_id',
                'agent_unique_id',
                'loan_amount',
                'interest_rate',
                'tenure_months',
                'frequency',
                'emi_amount',
                'loan_start_date',
                'installment_start_date',
                'processing_fee',
                'gst_amount',
                'insurance_amount',
                'disbursement_amount',
                'created_at',
                'updated_at'
            ])->with([
                'customer:customer_unique_id,first_name,middle_name,last_name,email,contact_number_1',
                'emiSchedules' => function ($q) {
                    $q->select('loan_id', 'installment_no', 'installment_date', 'installment_amount', 'outstanding_balance', 'status', 'frequency')
                        ->where('status', 'pending')
                        ->orderBy('installment_no')
                        ->limit(1);
                }
            ]);

            // Filter by customer_unique_id
            if ($request->filled('customer_unique_id')) {
                $query->where('customer_unique_id', $request->customer_unique_id);
            }

            // Filter by branch_id
            if ($request->filled('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }

            // Filter by cms_admin_id
            if ($request->filled('cms_admin_id')) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            // Filter by agent_unique_id
            if ($request->filled('agent_unique_id')) {
                $query->where('agent_unique_id', $request->agent_unique_id);
            }

            // Filter by loan_application_id
            if ($request->filled('loan_application_id')) {
                $query->where('loan_application_id', $request->loan_application_id);
            }

            // Filter by frequency
            if ($request->filled('frequency')) {
                $query->where('frequency', $request->frequency);
            }

            // Filter by loan amount range
            if ($request->filled('min_loan_amount')) {
                $query->where('loan_amount', '>=', $request->min_loan_amount);
            }
            if ($request->filled('max_loan_amount')) {
                $query->where('loan_amount', '<=', $request->max_loan_amount);
            }

            // Filter by interest rate range
            if ($request->filled('min_interest_rate')) {
                $query->where('interest_rate', '>=', $request->min_interest_rate);
            }
            if ($request->filled('max_interest_rate')) {
                $query->where('interest_rate', '<=', $request->max_interest_rate);
            }

            // Filter by tenure range
            if ($request->filled('min_tenure')) {
                $query->where('tenure_months', '>=', $request->min_tenure);
            }
            if ($request->filled('max_tenure')) {
                $query->where('tenure_months', '<=', $request->max_tenure);
            }

            // Filter by loan start date range
            if ($request->filled('start_date_from')) {
                $query->whereDate('loan_start_date', '>=', $request->start_date_from);
            }
            if ($request->filled('start_date_to')) {
                $query->whereDate('loan_start_date', '<=', $request->start_date_to);
            }

            // Filter by created date range
            if ($request->filled('created_from')) {
                $query->whereDate('created_at', '>=', $request->created_from);
            }
            if ($request->filled('created_to')) {
                $query->whereDate('created_at', '<=', $request->created_to);
            }

            // Search functionality
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('loan_number', 'LIKE', "%{$search}%")
                        ->orWhere('customer_unique_id', 'LIKE', "%{$search}%")
                        ->orWhere('loan_application_id', 'LIKE', "%{$search}%")
                        ->orWhereHas('customer', function ($customerQuery) use ($search) {
                            $customerQuery->where('first_name', 'LIKE', "%{$search}%")
                                ->orWhere('middle_name', 'LIKE', "%{$search}%")
                                ->orWhere('last_name', 'LIKE', "%{$search}%")
                                ->orWhere('email', 'LIKE', "%{$search}%")
                                ->orWhere('contact_number_1', 'LIKE', "%{$search}%");
                        });
                });
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');

            $allowedSortFields = ['created_at', 'loan_start_date', 'loan_amount', 'interest_rate', 'tenure_months', 'loan_number', 'frequency'];
            if (in_array($sortBy, $allowedSortFields)) {
                $query->orderBy($sortBy, $sortOrder === 'asc' ? 'asc' : 'desc');
            } else {
                $query->orderBy('created_at', 'desc');
            }

            // Pagination
            $perPage = $request->get('per_page', 50);
            $perPage = min($perPage, 100); // Limit max per page to 100

            $loans = $query->paginate($perPage);

            // Transform the data for better response
            $transformedLoans = $loans->getCollection()->map(function ($loan) {
                $nextEmi = $loan->emiSchedules->first();
                $totalAmount = $loan->emi_amount * $loan->tenure_months;
                $totalInterest = $totalAmount - $loan->loan_amount;

                return [
                    'loan_id' => $loan->id,
                    'loan_number' => $loan->loan_number,
                    'loan_application_id' => $loan->loan_application_id,
                    'customer' => [
                        'customer_unique_id' => $loan->customer_unique_id,
                        'name' => $loan->customer
                            ? trim(
                                ($loan->customer->first_name ?? '') . ' ' .
                                    ($loan->customer->middle_name ?? '') . ' ' .
                                    ($loan->customer->last_name ?? '')
                            )
                            : null,
                        'email' => $loan->customer->email ?? null,
                        'contact_number' => $loan->customer->contact_number_1 ?? null,
                    ],
                    'loan_details' => [
                        'loan_amount' => (float) $loan->loan_amount,
                        'interest_rate' => (float) $loan->interest_rate,
                        'tenure' => $loan->tenure_months,
                        'frequency' => $loan->frequency,
                        'emi_amount' => (float) $loan->emi_amount,
                        'total_amount' => (float) $totalAmount,
                        'total_interest' => (float) $totalInterest,
                        'processing_fee' => (float) ($loan->processing_fee ?? 0),
                        'gst_amount' => (float) ($loan->gst_amount ?? 0),
                        'insurance_amount' => (float) ($loan->insurance_amount ?? 0),
                        'disbursement_amount' => (float) ($loan->disbursement_amount ?? 0),
                    ],
                    'dates' => [
                        'loan_start_date' => $loan->loan_start_date,
                        'installment_start_date' => $loan->installment_start_date,
                        'created_at' => $loan->created_at,
                        'updated_at' => $loan->updated_at,
                    ],
                    'next_emi' => $nextEmi ? [
                        'installment_no' => $nextEmi->installment_no,
                        'installment_date' => $nextEmi->installment_date,
                        'installment_amount' => (float) $nextEmi->installment_amount,
                        'outstanding_balance' => (float) $nextEmi->outstanding_balance,
                        'frequency' => $nextEmi->frequency,
                    ] : null,
                    'branch_id' => $loan->branch_id,
                    'cms_admin_id' => $loan->cms_admin_id,
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Loans retrieved successfully',
                'data' => $transformedLoans,
                'pagination' => [
                    'current_page' => $loans->currentPage(),
                    'per_page' => $loans->perPage(),
                    'total' => $loans->total(),
                    'last_page' => $loans->lastPage(),
                    'from' => $loans->firstItem(),
                    'to' => $loans->lastItem(),
                ],
                'filters_applied' => [
                    'customer_unique_id' => $request->customer_unique_id,
                    'branch_id' => $request->branch_id,
                    'cms_admin_id' => $request->cms_admin_id,
                    'frequency' => $request->frequency,
                    'search' => $request->search,
                    'sort_by' => $sortBy,
                    'sort_order' => $sortOrder,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch loans',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function index(Request $request)
    {
        // Alias for getAllLoans to support the get-my-loans route
        return $this->getAllLoans($request);
    }

    public function show($loanId)
    {
        // Alias for getLoanDetails to support the get-loan-by-id route
        return $this->getLoanDetails($loanId);
    }
}
