<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Loan\CreditApplicationForm;
use App\Models\Loan\CustomerEnrollment;
use App\Models\Loan\Disbursement;
use App\Models\Loan\EmiSchedule;
use App\Models\Loan\Loan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CafExportController extends Controller
{
    /**
     * Export CAF data as CSV.
     * Route param: loan_application_id (unique per CAF)
     * Supports optional ?all=1 to export all CAFs, or a specific CAF by ID.
     */
    public function exportCsv(Request $request, string $loanApplicationId = null)
    {
        try {
            $query = CreditApplicationForm::withoutGlobalScope('notDeleted')
                ->where('is_deleted', 0);

            if ($loanApplicationId) {
                $query->where('loan_application_id', $loanApplicationId);
            }

            // Filter by branch_id (supports single or comma-separated multiple branch codes/IDs)
            if ($request->filled('branch_id')) {
                $branchFilter = array_map('trim', explode(',', $request->branch_id));
                $query->whereIn('branch_id', $branchFilter);
            }

            $cafs = $query->get();

            if ($cafs->isEmpty()) {
                return response()->json(['success' => false, 'message' => 'No CAF records found'], 404);
            }

            // Pre-load related data
            $cafIds        = $cafs->pluck('loan_application_id');
            $customerIds   = $cafs->pluck('customer_unique_id')->unique();
            $branchIds     = $cafs->pluck('branch_id')->unique()->filter();

            $enrollments = CustomerEnrollment::withoutGlobalScope('notDeleted')
                ->whereIn('enrollment_number', $cafs->pluck('enrollment_number')->filter())
                ->get()
                ->keyBy('enrollment_number');

            $branches = Branch::whereIn('code', $branchIds)
                ->orWhereIn('id', $branchIds)
                ->get();

            $branchMap = $branches->keyBy('code')->merge($branches->keyBy('id'));

            $disbursements = Disbursement::withoutGlobalScope('not_deleted')
                ->whereIn('loan_application_id', $cafIds)
                ->where('is_deleted', 0)
                ->get()
                ->keyBy('loan_application_id');

            $loans = Loan::withoutGlobalScope('not_deleted')
                ->whereIn('loan_application_id', $cafIds)
                ->where('is_deleted', 0)
                ->get()
                ->keyBy('loan_application_id');

            $loanNumbers = $loans->pluck('loan_number')->filter();

            $emiSchedules = EmiSchedule::withoutGlobalScope('not_deleted')
                ->whereIn('loan_id', $loanNumbers)
                ->where('is_deleted', 0)
                ->orderBy('installment_no')
                ->get()
                ->groupBy('loan_id');

            // Load customers
            $customers = \App\Models\Loan\LoanCustomer::withoutGlobalScope('notDeleted')
                ->whereIn('customer_unique_id', $customerIds)
                ->get()
                ->keyBy('customer_unique_id');

            $filename = 'caf_export_' . now()->format('Ymd_His') . '.csv';

            $headers = [
                'Content-Type'        => 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ];

            $callback = function () use ($cafs, $enrollments, $branchMap, $disbursements, $loans, $emiSchedules, $customers) {
                $handle = fopen('php://output', 'w');

                // Header row
                fputcsv($handle, [
                    // Customer Info
                    'Customer ID',
                    'Customer Name',
                    'Contact Number',
                    'Email',
                    'Gender',
                    'Date of Birth',
                    'Father Name',
                    'Permanent Address',
                    'Aadhaar Number',
                    'PAN Number',
                    // Enrollment
                    'Enrollment Number',
                    'Verified By',
                    // Branch
                    'Branch Name',
                    'Branch Number',
                    // CAF Details
                    'Loan Application ID',
                    'CAF Status',
                    'Credit Mode',
                    'Credit Applied For',
                    'Frequency',
                    'Tenure Option',
                    'Applicant Income',
                    'Total Income Yearly',
                    'Net Surplus',
                    'Down Payment',
                    'Business Type',
                    'Business Nature',
                    'CAF Created At',
                    // Disbursement Details
                    'Disbursement ID',
                    'Date of Disbursement',
                    'Booking Date',
                    'Disbursement Status',
                    // Loan Details
                    'Loan Number',
                    'Loan Amount',
                    'Interest Rate (%)',
                    'Tenure (Months)',
                    'EMI Amount',
                    'Processing Fee',
                    'GST Amount',
                    'Insurance Amount',
                    'Disbursement Amount',
                    'Loan Start Date',
                    'Installment Start Date',
                    // Installment Summary
                    'Last Installment No (Remaining)',
                    'Principal Outstanding (Rest to Pay)',
                    'Principal Dues',
                    'Past Dues',
                ]);

                foreach ($cafs as $caf) {
                    $customer    = $customers->get($caf->customer_unique_id);
                    $enrollment  = $enrollments->get($caf->enrollment_number);
                    $branch      = $branchMap->get($caf->branch_id);
                    $disbursement = $disbursements->get($caf->loan_application_id);
                    $loan        = $loans->get($caf->loan_application_id);

                    // EMI calculations
                    $lastInstallmentNo      = null;
                    $principalOutstanding   = 0;
                    $principalDues          = 0;
                    $pastDues               = 0;

                    if ($loan) {
                        $schedules = $emiSchedules->get($loan->loan_number, collect());

                        // Unpaid/pending installments
                        $unpaid = $schedules->whereNotIn('status', ['paid', 'pre_closed']);

                        if ($unpaid->isNotEmpty()) {
                            // Last installment no among remaining (highest installment_no)
                            $lastInstallmentNo = $unpaid->max('installment_no');

                            // Principal outstanding = sum of principal_due of all unpaid
                            $principalOutstanding = $unpaid->sum('principal_due');

                            // Past dues = unpaid installments whose date has passed
                            $overdue = $unpaid->filter(fn($e) => $e->installment_date && $e->installment_date->isPast());
                            $pastDues = $overdue->sum('installment_amount');

                            // Principal dues = sum of principal_due of overdue installments
                            $principalDues = $overdue->sum('principal_due');
                        }
                    }

                    fputcsv($handle, [
                        // Customer Info
                        $customer?->customer_unique_id ?? '',
                        trim(($customer?->first_name ?? '') . ' ' . ($customer?->middle_name ?? '') . ' ' . ($customer?->last_name ?? '')),
                        $customer?->contact_number_1 ?? '',
                        $customer?->email ?? '',
                        $customer?->gender ?? '',
                        $customer?->date_of_birth ?? '',
                        $customer?->father_name ?? '',
                        $customer?->permanent_address ?? '',
                        $customer?->adhaar_number ?? '',
                        $customer?->pan_number ?? '',
                        // Enrollment
                        $caf->enrollment_number ?? '',
                        $enrollment?->verified_by ?? '',
                        // Branch
                        $branch?->name ?? '',
                        $branch?->code ?? $caf->branch_id ?? '',
                        // CAF Details
                        $caf->loan_application_id,
                        $caf->status ?? '',
                        $caf->credit_mode ?? '',
                        $caf->credit_applied_for ?? '',
                        $caf->frequency ?? '',
                        $caf->tenure_option ?? '',
                        $caf->applicant_income ?? '',
                        $caf->total_income_yearly ?? '',
                        $caf->net_surplus ?? '',
                        $caf->down_payment ?? '',
                        $caf->business_type ?? '',
                        $caf->business_nature ?? '',
                        $caf->created_at ?? '',
                        // Disbursement Details
                        $disbursement?->disbursement_id ?? '',
                        $disbursement?->date_of_disbursement ?? '',
                        $disbursement?->booking_date ?? '',
                        $disbursement?->disbursement_status ?? '',
                        // Loan Details
                        $loan?->loan_number ?? '',
                        $loan?->loan_amount ?? '',
                        $loan?->interest_rate ?? '',
                        $loan?->tenure_months ?? '',
                        $loan?->emi_amount ?? '',
                        $loan?->processing_fee ?? '',
                        $loan?->gst_amount ?? '',
                        $loan?->insurance_amount ?? '',
                        $loan?->disbursement_amount ?? '',
                        $loan?->loan_start_date ?? '',
                        $loan?->installment_start_date ?? '',
                        // Installment Summary
                        $lastInstallmentNo ?? '',
                        number_format((float) $principalOutstanding, 2, '.', ''),
                        number_format((float) $principalDues, 2, '.', ''),
                        number_format((float) $pastDues, 2, '.', ''),
                    ]);
                }

                fclose($handle);
            };

            return response()->stream($callback, 200, $headers);
        } catch (\Exception $e) {
            Log::error('CAF CSV Export Error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'message' => 'Export failed: ' . $e->getMessage()], 500);
        }
    }
}
