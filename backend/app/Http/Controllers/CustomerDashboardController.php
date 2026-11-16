<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Loan\LoanCustomer;
use App\Models\Loan\CreditApplicationForm;
use App\Models\LoanApplication;
use App\Models\Loan;
use App\Models\Loan\EmiPayment;
use App\Models\Loan\LoanDisbursement;
use App\Models\EmiSchedule;

class CustomerDashboardController extends Controller
{
    public function getDashboard($customer_id)
    {
        try {
            // Get customer details
            $customer = LoanCustomer::where('customer_unique_id', $customer_id)
                ->where('is_deleted', 0)
                ->first();
            
            if (!$customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Customer not found'
                ], 404);
            }

            // Get all loan applications
            $loanApplications = LoanApplication::where('customer_unique_id', $customer_id)
                ->orderBy('created_at', 'desc')
                ->get();

            // Get all CAF applications with related data
            $cafApplications = CreditApplicationForm::where('customer_unique_id', $customer_id)
                ->with(['pd', 'cam', 'disbursements'])
                ->orderBy('created_at', 'desc')
                ->get();

            // Get active loans (remove the loan_status filter for now)
            $activeLoans = Loan::where('customer_unique_id', $customer_id)
                ->get();

            // Get recent EMI payments
            $recentPayments = EmiPayment::whereHas('loan', function($query) use ($customer_id) {
                $query->where('customer_unique_id', $customer_id);
            })
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

            // Get disbursements
            $disbursements = LoanDisbursement::where('customer_unique_id', $customer_id)
                ->orderBy('created_at', 'desc')
                ->get();

            // Calculate summary statistics
            $totalApplications = $loanApplications->count();
            $approvedApplications = $loanApplications->where('application_status', 'approved')->count();
            $pendingApplications = $loanApplications->where('application_status', 'pending')->count();
            $rejectedApplications = $loanApplications->where('application_status', 'rejected')->count();

            $totalLoans = $activeLoans->count();
            $totalLoanAmount = $activeLoans->sum('loan_amount');
            $totalOutstanding = $activeLoans->sum('remaining_amount');

            // Get EMI details - top 5 for each category
            $emiDetails = [];
            foreach ($activeLoans as $loan) {
                try {
                    // Get last 5 paid EMIs
                    $paidEmis = EmiSchedule::where('loan_id', $loan->loan_number)
                        ->where('status', 'paid')
                        ->orderBy('due_date', 'desc')
                        ->limit(5)
                        ->get();
                } catch (\Exception $e) {
                    try {
                        $paidEmis = EmiSchedule::where('loan_id', $loan->loan_number)
                            ->where('status', 'paid')
                            ->orderBy('installment_date', 'desc')
                            ->limit(5)
                            ->get();
                    } catch (\Exception $e2) {
                        $paidEmis = collect();
                    }
                }

                try {
                    // Get next 5 upcoming EMIs (pending or pending_at_admin)
                    $upcomingEmis = EmiSchedule::where('loan_id', $loan->loan_number)
                        ->whereIn('status', ['pending', 'pending_at_admin'])
                        ->where('due_date', '>=', now())
                        ->orderBy('due_date')
                        ->limit(5)
                        ->get();
                } catch (\Exception $e) {
                    try {
                        $upcomingEmis = EmiSchedule::where('loan_id', $loan->loan_number)
                            ->whereIn('status', ['pending', 'pending_at_admin'])
                            ->where('installment_date', '>=', now())
                            ->orderBy('installment_date')
                            ->limit(5)
                            ->get();
                    } catch (\Exception $e2) {
                        $upcomingEmis = collect();
                    }
                }

                try {
                    // Get last 5 pending EMIs (overdue - only pending status)
                    $pendingEmis = EmiSchedule::where('loan_id', $loan->loan_number)
                        ->where('status', 'pending')
                        ->where('due_date', '<', now())
                        ->orderBy('due_date', 'desc')
                        ->limit(5)
                        ->get();
                } catch (\Exception $e) {
                    try {
                        $pendingEmis = EmiSchedule::where('loan_id', $loan->loan_number)
                            ->where('status', 'pending')
                            ->where('installment_date', '<', now())
                            ->orderBy('installment_date', 'desc')
                            ->limit(5)
                            ->get();
                    } catch (\Exception $e2) {
                        $pendingEmis = collect();
                    }
                }

                try {
                    // Get ALL EMIs with pending_at_admin status
                    $pendingAtAdminEmis = EmiSchedule::where('loan_id', $loan->loan_number)
                        ->where('status', 'pending_at_admin')
                        ->orderBy('due_date')
                        ->get();
                } catch (\Exception $e) {
                    try {
                        $pendingAtAdminEmis = EmiSchedule::where('loan_id', $loan->loan_number)
                            ->where('status', 'pending_at_admin')
                            ->orderBy('installment_date')
                            ->get();
                    } catch (\Exception $e2) {
                        $pendingAtAdminEmis = collect();
                    }
                }

                // Combine pending and pending_at_admin EMIs
                $allPendingEmis = $pendingEmis->concat($pendingAtAdminEmis);

                $emiDetails[$loan->loan_number] = [
                    'paid_emis' => $paidEmis->map(function($emi) {
                        return [
                            'emi_number' => $emi->emi_number ?? $emi->installment_no ?? null,
                            'emi_amount' => $emi->emi_amount ?? $emi->installment_amount ?? 0,
                            'due_date' => $emi->due_date ?? $emi->installment_date ?? null,
                            'paid_date' => $emi->paid_date ?? null,
                            'status' => $emi->status
                        ];
                    }),
                    'upcoming_emis' => $upcomingEmis->map(function($emi) {
                        return [
                            'emi_number' => $emi->emi_number ?? $emi->installment_no ?? null,
                            'emi_amount' => $emi->emi_amount ?? $emi->installment_amount ?? 0,
                            'due_date' => $emi->due_date ?? $emi->installment_date ?? null,
                            'status' => $emi->status
                        ];
                    }),
                    'pending_emis' => $allPendingEmis->map(function($emi) {
                        return [
                            'emi_number' => $emi->emi_number ?? $emi->installment_no ?? null,
                            'emi_amount' => $emi->emi_amount ?? $emi->installment_amount ?? 0,
                            'due_date' => $emi->due_date ?? $emi->installment_date ?? null,
                            'status' => $emi->status,
                            'overdue_days' => $emi->due_date ? now()->diffInDays($emi->due_date ?? $emi->installment_date, false) : 0
                        ];
                    })
                ];
            }

            // Process applications data
            $applicationsData = [];
            foreach ($cafApplications as $caf) {
                $applicationsData[] = [
                    'loan_application_id' => $caf->loan_application_id,
                    'product_name' => $caf->product_name,
                    'credit_applied_for' => $caf->credit_applied_for,
                    'caf_status' => $caf->status,
                    'is_verified' => $caf->is_verified,
                    'is_pd_created' => $caf->is_pd_created,
                    'is_cam_created' => $caf->is_cam_created,
                    'is_disbursement_created' => $caf->is_disbursement_created,
                    'created_at' => $caf->created_at,
                    'pd_status' => $caf->pd ? $caf->pd->status : null,
                    'pd_verified' => $caf->pd ? $caf->pd->is_verified : null,
                    'cam_status' => $caf->cam ? $caf->cam->status : null,
                    'cam_verified' => $caf->cam ? $caf->cam->is_verified : null,
                    'credit_decision' => $caf->cam ? $caf->cam->credit_decision : null,
                    'disbursement_count' => $caf->disbursements->count(),
                    'disbursed' => $caf->disbursements->where('is_disbursed', 1)->count() > 0
                ];
            }

            // Process loans data
            $loansData = [];
            foreach ($activeLoans as $loan) {
                try {
                    $totalEmis = EmiSchedule::where('loan_id', $loan->loan_number)->count();
                    $paidEmis = EmiSchedule::where('loan_id', $loan->loan_number)
                        ->where('status', 'paid')->count();
                    $pendingEmis = EmiSchedule::where('loan_id', $loan->loan_number)
                        ->whereIn('status', ['pending', 'pending_at_admin'])->count();
                } catch (\Exception $e) {
                    // If there's an issue with EMI schedule queries, set defaults
                    $totalEmis = 0;
                    $paidEmis = 0;
                    $pendingEmis = 0;
                }
                
                $loansData[] = [
                    'loan_number' => $loan->loan_number,
                    'loan_amount' => $loan->loan_amount,
                    'outstanding_amount' => $loan->remaining_amount,
                    'interest_rate' => $loan->interest_rate,
                    'tenure_months' => $loan->tenure_months,
                    'emi_amount' => $loan->emi_amount,
                    'loan_start_date' => $loan->loan_start_date,
                    'total_emis' => $totalEmis,
                    'paid_emis' => $paidEmis,
                    'pending_emis' => $pendingEmis
                ];
            }

            // Process payments data
            $paymentsData = [];
            foreach ($recentPayments as $payment) {
                $paymentsData[] = [
                    'payment_id' => $payment->id,
                    'emi_amount' => $payment->emi_amount,
                    'payment_date' => $payment->payment_date,
                    'payment_method' => $payment->payment_method,
                    'approval_status' => $payment->approval_status,
                    'transaction_reference' => $payment->transaction_reference,
                    'created_at' => $payment->created_at
                ];
            }

            return response()->json([
                'success' => true,
                'customer' => [
                    'customer_unique_id' => $customer->customer_unique_id,
                    'name' => $customer->name,
                    'first_name' => $customer->first_name,
                    'last_name' => $customer->last_name,
                    'mobile' => $customer->mobile,
                    'email' => $customer->email,
                    'status' => $customer->status,
                    'verification_status' => $customer->verification_status
                ],
                'summary' => [
                    'total_applications' => $totalApplications,
                    'approved_applications' => $approvedApplications,
                    'pending_applications' => $pendingApplications,
                    'rejected_applications' => $rejectedApplications,
                    'total_active_loans' => $totalLoans,
                    'total_loan_amount' => $totalLoanAmount,
                    'total_outstanding' => $totalOutstanding
                ],
                'applications' => $applicationsData,
                'active_loans' => $loansData,
                'emi_details' => $emiDetails
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching dashboard data: ' . $e->getMessage()
            ], 500);
        }
    }
}