<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\Loan\EmiSchedule;
use App\Models\Loan\EmiPayment;
use App\Models\Loan\Loan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EmiController extends Controller
{
    public function makePayment(Request $request)
    {
        try {
            $request->validate([
                'loan_id' => 'required|string',
                'emi_schedule_id' => 'required|string',
                'payment_amount' => 'nullable|numeric|min:0',
                'payment_method' => 'required|in:online,cash,cheque,bank_transfer,bank,upi',
                'transaction_id' => 'nullable|string',
                'payment_image' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:5120'
            ]);

            $emiSchedule = EmiSchedule::with('loan')
                ->where('emi_id', $request->emi_schedule_id)
                ->where('loan_id', $request->loan_id)
                ->first();
            
            if (!$emiSchedule) {
                return response()->json([
                    'success' => false, 
                    'message' => 'EMI schedule not found for this loan',
                    'debug' => [
                        'searched_emi_id' => $request->emi_schedule_id,
                        'searched_loan_id' => $request->loan_id
                    ]
                ], 404);
            }
            
            if ($emiSchedule->status === 'paid') {
                return response()->json(['success' => false, 'message' => 'EMI already paid'], 400);
            }

            $paymentImagePath = null;
            if ($request->hasFile('payment_image')) {
                $file = $request->file('payment_image');
                $filename = time() . '_payment_' . $file->getClientOriginalName();
                $file->move(public_path('payment_images'), $filename);
                $paymentImagePath = 'payment_images/' . $filename;
            }

            $payment = EmiPayment::create([
                'emi_schedule_id' => $emiSchedule->emi_id,
                'loan_id' => $emiSchedule->loan_id,
                'user_id' => $request->user()->user_id ?? $request->user()->id,
                'branch_id' => $emiSchedule->branch_id,
                'cms_admin_id' => $emiSchedule->cms_admin_id,
                'payment_amount' => $request->payment_amount,
                'payment_date' => now(),
                'payment_method' => $request->payment_method,
                'transaction_id' => $request->transaction_id ?? Str::random(10),
                'payment_image' => $paymentImagePath,
                'payment_status' => 'pending',
                'approval_status' => 'pending',
                'receipt_number' => 'RCP' . time() . rand(100, 999)
            ]);

            $emiSchedule->update([
                'status' => 'pending_at_admin'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment submitted successfully. Awaiting admin approval.',
                'data' => $payment
            ]);
        } catch (\Exception $e) {
            Log::error('EMI Payment Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Database error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getPaymentHistory(Request $request)
    {
        $payments = EmiPayment::with(['emiSchedule', 'loan'])
            ->where('user_id', $request->user()->user_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Payment history retrieved successfully',
            'data' => $payments
        ]);
    }

    public function getAllPayments(Request $request)
    {
        // if (!in_array($request->user()->role, ['', ''])) {
        //     return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        // }

        $query = EmiPayment::with(['emiSchedule', 'loan.customer:customer_unique_id,first_name,middle_name,last_name,email'])->where('is_deleted', 0);

        // Build base query for status counts
        $countQuery = EmiPayment::where('is_deleted', 0);

        if ($request->filled('branch_id')) {
            $countQuery->where('branch_id', $request->branch_id);
        }

        if ($request->filled('cms_admin_id')) {
            $countQuery->where('cms_admin_id', $request->cms_admin_id);
        }

        $statusCounts = [
            'approval_status' => [
                'pending' => (clone $countQuery)->where('approval_status', 'pending')->count(),
                'approved' => (clone $countQuery)->where('approval_status', 'approved')->count(),
                'rejected' => (clone $countQuery)->where('approval_status', 'rejected')->count(),
            ],
            'payment_status' => [
                'pending' => (clone $countQuery)->where('payment_status', 'pending')->count(),
                'success' => (clone $countQuery)->where('payment_status', 'success')->count(),
                'failed' => (clone $countQuery)->where('payment_status', 'failed')->count(),
            ]
        ];

        if ($request->filled('approval_status')) {
            $query->where('approval_status', $request->approval_status);
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('cms_admin_id')) {
            $query->where('cms_admin_id', $request->cms_admin_id);
        }

        $perPage = $request->get('per_page', 10);
        $payments = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'All EMI payments retrieved successfully',
            'data' => $payments,
            'status_counts' => $statusCounts
        ]);
    }

    public function getAllPaymentsById($id)
    {
        $payments = EmiPayment::where('emi_schedule_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'EMI payments retrieved successfully',
            'data' => $payments
        ]);
    }

    public function getPaymentById(Request $request, $id)
    {
        $user = $request->user();
        
        // Allow admin, loan_admin, branch_manager, and field_executive to view payments
        if (in_array($user->role, ['admin', 'loan_admin', 'branch_manager', 'field_executive'])) {
            $payment = EmiPayment::where('id', $id)->firstOrFail();
        } else {
            // For regular users, only show their own payments
            $payment = EmiPayment::where('id', $id)
                ->where('user_id', $user->user_id)
                ->firstOrFail();
        }

        return response()->json([
            'success' => true,
            'message' => 'EMI payment retrieved successfully',
            'data' => $payment
        ]);
    }

    public function getPaymentByEmiId(Request $request, $emi_id)
    {
        $user = $request->user();
        
        // Build query based on user role
        $query = EmiPayment::where('emi_schedule_id', $emi_id);
        
        $payment = $query->first();

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'No payment found for this EMI schedule'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'EMI payment retrieved successfully',
            'data' => $payment
        ]);
    }

    public function approvePayment(Request $request, $id)
    {
        try {
            $userRole = str_replace(' ', '_', strtolower($request->user()->role));
            // if (!in_array($userRole, ['admin', 'loan_admin'])) {
            //     return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            // }

            $payment = EmiPayment::findOrFail($id);
            
            if ($payment->approval_status === 'approved') {
                return response()->json(['success' => false, 'message' => 'Payment already approved'], 400);
            }

            $emiSchedule = EmiSchedule::where('emi_id', $payment->emi_schedule_id)->first();
            $loan = Loan::where('loan_number', $payment->loan_id)->first();

            if (!$emiSchedule) {
                return response()->json(['success' => false, 'message' => 'EMI Schedule not found'], 404);
            }

            if (!$loan) {
                return response()->json(['success' => false, 'message' => 'Loan not found'], 404);
            }

            $payment->update([
                'approval_status' => 'approved',
                'payment_status' => 'success',
                'approved_by' => $request->user()->user_id ?? $request->user()->id,
                'approved_at' => now()
            ]);

            $updateResult = $emiSchedule->update([
                'status' => 'paid'
            ]);

            Log::info('EMI Schedule Update Result', [
                'emi_id' => $emiSchedule->emi_id,
                'update_result' => $updateResult,
                'new_status' => 'paid'
            ]);

            // Note: The loan table structure doesn't include paid_amount and remaining_amount fields
            // These would need to be added via migration if payment tracking is required

            return response()->json([
                'success' => true,
                'message' => 'Payment approved successfully',
                'data' => $payment
            ]);
        } catch (\Exception $e) {
            Log::error('EMI Payment Approval Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Database error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function revertPayment(Request $request, $emi_id)
    {
        // Allow any authenticated user to request revert; audit who did it.
        $rawRole = trim($request->user()->role ?? '');
        $userRole = str_replace(' ', '_', strtolower($rawRole));

        Log::info('EMI revert invoked', [
            'user_id' => $request->user()->user_id ?? $request->user()->id,
            'role_raw' => $rawRole,
            'role_normalized' => $userRole,
        ]);

        $emiSchedule = EmiSchedule::where('emi_id', $emi_id)->first();
        if (!$emiSchedule) {
            return response()->json(['success' => false, 'message' => 'EMI schedule not found'], 404);
        }

        if ($emiSchedule->status !== 'paid') {
            return response()->json(['success' => false, 'message' => 'Only paid EMIs can be reverted'], 400);
        }

        DB::transaction(function () use ($emiSchedule) {
            EmiPayment::where('emi_schedule_id', $emiSchedule->emi_id)->delete();
            $emiSchedule->update(['status' => 'pending']);
        });

        return response()->json([
            'success' => true,
            'message' => 'EMI payment reverted successfully',
        ]);
    }

    public function preClose(Request $request)
    {
        try {
            $request->validate([
                'loan_id'        => 'required|string',
                'payment_method' => 'required|in:online,cash,cheque,bank_transfer,bank,upi',
                'transaction_id' => 'nullable|string',
                'payment_image'  => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:5120',
            ]);

            $loan = Loan::where('loan_number', $request->loan_id)->first();
            if (!$loan) {
                return response()->json(['success' => false, 'message' => 'Loan not found'], 404);
            }

            // Get the top pending EMI (lowest installment_no that is not paid/pending_at_admin)
            $topEmi = EmiSchedule::where('loan_id', $request->loan_id)
                ->whereNotIn('status', ['paid', 'pending_at_admin', 'closed'])
                ->orderBy('installment_no')
                ->first();

            if (!$topEmi) {
                return response()->json(['success' => false, 'message' => 'No pending EMI found for pre-closure'], 400);
            }

            // Pre-close amount = amount + balance + 2% of (amount + balance)
            $amount  = (float) $topEmi->installment_amount;
            $balance = (float) $topEmi->outstanding_balance;
            $base    = $amount + $balance;
            $preCloseAmount = round($base + ($base * 0.02), 2);

            $paymentImagePath = null;
            if ($request->hasFile('payment_image')) {
                $file = $request->file('payment_image');
                $filename = time() . '_preclose_' . $file->getClientOriginalName();
                if (!file_exists(public_path('payment_images'))) {
                    mkdir(public_path('payment_images'), 0777, true);
                }
                $file->move(public_path('payment_images'), $filename);
                $paymentImagePath = 'payment_images/' . $filename;
            }

            $userId  = $request->user()->user_id ?? $request->user()->id;
            $payment = null;

            DB::transaction(function () use ($topEmi, $request, $userId, $paymentImagePath, $preCloseAmount, &$payment) {
                $payment = EmiPayment::create([
                    'emi_schedule_id' => $topEmi->emi_id,
                    'loan_id'         => $topEmi->loan_id,
                    'user_id'         => $userId,
                    'branch_id'       => $topEmi->branch_id,
                    'cms_admin_id'    => $topEmi->cms_admin_id,
                    'payment_amount'  => $preCloseAmount,
                    'payment_date'    => now(),
                    'payment_method'  => $request->payment_method,
                    'transaction_id'  => $request->transaction_id ?? Str::random(10),
                    'payment_image'   => $paymentImagePath,
                    'payment_status'  => 'pending',
                    'approval_status' => 'pending',
                    'receipt_number'  => 'PRE' . time() . rand(100, 999),
                    'is_pre_close'    => 1,
                ]);

                $topEmi->update(['status' => 'pending_at_admin']);
            });

            return response()->json([
                'success' => true,
                'message' => 'Pre-close request submitted. Awaiting admin approval.',
                'data'    => [
                    'loan_id'           => $request->loan_id,
                    'emi_id'            => $topEmi->emi_id,
                    'emi_amount'        => $amount,
                    'outstanding_balance' => $balance,
                    'pre_close_amount'  => $preCloseAmount,
                    'payment'           => $payment,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Pre-close Error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function approvePreClose(Request $request, $loan_id)
    {
        try {
            $loan = Loan::where('loan_number', $loan_id)->first();
            if (!$loan) {
                return response()->json(['success' => false, 'message' => 'Loan not found'], 404);
            }

            // Find the single pre-close payment pending approval
            $preClosePayment = EmiPayment::where('loan_id', $loan_id)
                ->where('approval_status', 'pending')
                ->where('is_pre_close', 1)
                ->first();

            if (!$preClosePayment) {
                return response()->json(['success' => false, 'message' => 'No pending pre-close payment found for this loan'], 400);
            }

            $approvedBy = $request->user()->user_id ?? $request->user()->id;

            DB::transaction(function () use ($preClosePayment, $approvedBy, $loan_id) {
                // Approve the pre-close payment
                $preClosePayment->update([
                    'approval_status' => 'approved',
                    'payment_status'  => 'success',
                    'approved_by'     => $approvedBy,
                    'approved_at'     => now(),
                ]);

                // Mark the pre-close EMI as pre_closed
                $preCloseEmi = EmiSchedule::where('emi_id', $preClosePayment->emi_schedule_id)->first();
                if ($preCloseEmi) {
                    $preCloseEmi->update(['status' => 'pre_closed']);

                    // Close all remaining EMIs after this one (higher installment_no)
                    EmiSchedule::where('loan_id', $loan_id)
                        ->where('installment_no', '>', $preCloseEmi->installment_no)
                        ->whereNotIn('status', ['paid'])
                        ->update([
                            'status'               => 'closed',
                            'principal_due'        => 0,
                            'interest_due'         => 0,
                            'installment_amount'   => 0,
                            'outstanding_balance'  => 0,
                        ]);
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Pre-close approved. Loan closed successfully.',
                'data'    => ['loan_id' => $loan_id],
            ]);
        } catch (\Exception $e) {
            Log::error('Pre-close Approval Error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function rejectPayment(Request $request, $id)
    {
        // if (!in_array($request->user()->role, ['admin', 'loan_admin'])) {
        //     return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        // }

        $payment = EmiPayment::findOrFail($id);
        
        $payment->update([
            'approval_status' => 'rejected',
            'payment_status' => 'failed',
            'approved_by' => $request->user()->user_id ?? $request->user()->id,
            'approved_at' => now()
        ]);

        $emiSchedule = EmiSchedule::where('emi_id', $payment->emi_schedule_id)->first();
        if ($emiSchedule) {
            $emiSchedule->update(['status' => 'pending']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Payment rejected successfully',
            'data' => $payment
        ]);
    }
}
