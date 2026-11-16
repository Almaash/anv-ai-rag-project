<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InvestmentWeeklyRedemption;
use App\Models\InvestmentWeeklySchedule;
use App\Models\InvestorInvestment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class InvestmentRedemptionController extends Controller
{
    /**
     * Request redemption for a specific week
     */
    public function requestRedemption(Request $request)
    {
        try {
            $data = $request->validate([
                'investment_unique_id' => 'required|exists:investor_investments,unique_id',
                'week_number' => 'required|integer|min:1',
                'redemption_amount' => 'required|numeric|min:0.01',
                'redemption_type' => 'required|in:partial,full',
                'remarks' => 'nullable|string|max:500',
                'branch_id' => 'nullable|string|max:255',
                'cms_admin_id' => 'nullable|string|max:255',
            ]);

            $investment = InvestorInvestment::where('unique_id', $data['investment_unique_id'])->first();

            // Find the weekly schedule
            $weeklySchedule = InvestmentWeeklySchedule::where('investment_unique_id', $data['investment_unique_id'])
                ->where('week_number', $data['week_number'])
                ->first();

            if (!$weeklySchedule) {
                return response()->json([
                    'success' => false,
                    'message' => 'Weekly schedule not found'
                ], 404);
            }

            // Check if already fully redeemed
            if ($weeklySchedule->redemption_status === 'fully_redeemed') {
                return response()->json([
                    'success' => false,
                    'message' => 'This week has already been fully redeemed'
                ], 400);
            }

            // Calculate available amount for redemption
            $availableAmount = $weeklySchedule->total_earning - $weeklySchedule->total_redeemed;
            
            if ($data['redemption_amount'] > $availableAmount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Redemption amount exceeds available earnings',
                    'available_amount' => $availableAmount
                ], 400);
            }

            // Check for pending redemption requests
            $pendingRedemption = InvestmentWeeklyRedemption::where('investment_unique_id', $data['investment_unique_id'])
                ->where('week_number', $data['week_number'])
                ->where('status', 'pending')
                ->first();

            if ($pendingRedemption) {
                return response()->json([
                    'success' => false,
                    'message' => 'There is already a pending redemption request for this week'
                ], 400);
            }

            // Calculate proportional bonus redemption
            $totalEarning = $weeklySchedule->total_earning;
            $redemptionRatio = $data['redemption_amount'] / $totalEarning;
            
            $selfBonusRedeemed = $weeklySchedule->self_bonus * $redemptionRatio;
            $referralBonusRedeemed = $weeklySchedule->referral_bonus * $redemptionRatio;

            // Create redemption request
            $redemption = InvestmentWeeklyRedemption::create([
                'investment_unique_id' => $data['investment_unique_id'],
                'weekly_schedule_id' => $weeklySchedule->id,
                'week_number' => $data['week_number'],
                'branch_id' => $data['branch_id'] ?? $investment?->branch_id,
                'cms_admin_id' => $data['cms_admin_id'] ?? $investment?->cms_admin_id,
                'redemption_amount' => $data['redemption_amount'],
                'self_bonus_redeemed' => $selfBonusRedeemed,
                'referral_bonus_redeemed' => $referralBonusRedeemed,
                'redemption_type' => $data['redemption_type'],
                'remarks' => $data['remarks'],
                'redemption_date' => now()->toDateString(),
                'requested_by' => Auth::id(),
                'status' => 'pending',
            ]);

            // Update weekly schedule status to 'at_admin'
            $weeklySchedule->update([
                'redemption_status' => 'at_admin'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Redemption request submitted successfully',
                'data' => $redemption
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error requesting redemption: ' . $e->getMessage(), [
                'request_data' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit redemption request'
            ], 500);
        }
    }

    /**
     * Get all redemption requests (with filters)
     */
    public function getAllRedemptions(Request $request)
    {
        try {
            $query = InvestmentWeeklyRedemption::with(['weeklySchedule', 'investorInvestment', 'requestedBy', 'approvedBy']);

            // Apply filters
            if ($request->has('status') && !empty($request->status)) {
                $query->where('status', $request->status);
            }

            if ($request->has('investment_unique_id') && !empty($request->investment_unique_id)) {
                $query->where('investment_unique_id', $request->investment_unique_id);
            }

            if ($request->has('start_date') && !empty($request->start_date)) {
                $query->where('redemption_date', '>=', $request->start_date);
            }

            if ($request->has('end_date') && !empty($request->end_date)) {
                $query->where('redemption_date', '<=', $request->end_date);
            }

            if ($request->has('branch_id') && !empty($request->branch_id)) {
                $query->where('branch_id', $request->branch_id);
            }

            if ($request->has('cms_admin_id') && !empty($request->cms_admin_id)) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            $perPage = $request->get('per_page', 15);
            $redemptions = $query->latest('redemption_date')->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => collect($redemptions->items())->map(function ($redemption) {
                    return [
                        'id' => $redemption->id,
                        'unique_id' => $redemption->unique_id,
                        'investment_unique_id' => $redemption->investment_unique_id,
                        'week_number' => $redemption->week_number,
                        'redemption_amount' => round($redemption->redemption_amount),
                        'status' => $redemption->status,
                        'transaction_id' => $redemption->transaction_id,
                        'payment_document' => $redemption->payment_document ? asset($redemption->payment_document) : null,
                        'redemption_date' => $redemption->redemption_date,
                        'investor_name' => $redemption->requestedBy ? $redemption->requestedBy->name : 'N/A',
                        'weekly_schedule' => [
                            'redemption_value' => round($redemption->weeklySchedule->redemption_value),
                            'total_earning' => round($redemption->weeklySchedule->total_earning),
                            'closing_balance' => round($redemption->weeklySchedule->closing_balance),
                        ]
                    ];
                }),
                'pagination' => [
                    'current_page' => $redemptions->currentPage(),
                    'per_page' => $redemptions->perPage(),
                    'total' => $redemptions->total(),
                    'last_page' => $redemptions->lastPage(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching redemptions: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve redemptions'
            ], 500);
        }
    }

    /**
     * Get my redemption history
     */
    public function getMyRedemptions(Request $request)
    {
        try {
            $query = InvestmentWeeklyRedemption::with(['weeklySchedule', 'investorInvestment'])
                ->where('requested_by', Auth::id());

            if ($request->has('investment_unique_id') && !empty($request->investment_unique_id)) {
                $query->where('investment_unique_id', $request->investment_unique_id);
            }

            $perPage = $request->get('per_page', 15);
            $redemptions = $query->latest('redemption_date')->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => collect($redemptions->items())->map(function ($redemption) {
                    return [
                        'id' => $redemption->id,
                        'unique_id' => $redemption->unique_id,
                        'investment_unique_id' => $redemption->investment_unique_id,
                        'week_number' => $redemption->week_number,
                        'transaction_id' => $redemption->transaction_id,
                        'payment_document' => $redemption->payment_document ? asset($redemption->payment_document) : null,
                        'redemption_amount' => round($redemption->redemption_amount),
                        'status' => $redemption->status,
                        'redemption_date' => $redemption->redemption_date,
                        'weekly_schedule' => [
                            'redemption_value' => round($redemption->weeklySchedule->redemption_value),
                            'total_earning' => round($redemption->weeklySchedule->total_earning),
                            'closing_balance' => round($redemption->weeklySchedule->closing_balance),
                        ]
                    ];
                }),
                'pagination' => [
                    'current_page' => $redemptions->currentPage(),
                    'per_page' => $redemptions->perPage(),
                    'total' => $redemptions->total(),
                    'last_page' => $redemptions->lastPage(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching my redemptions: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve redemption history'
            ], 500);
        }
    }

    /**
     * Get redemption by ID
     */
    public function getRedemptionById($id)
    {
        try {
            $redemption = InvestmentWeeklyRedemption::with(['weeklySchedule', 'investorInvestment', 'requestedBy', 'approvedBy'])
                ->where('unique_id', $id)
                ->first();

            if (!$redemption) {
                return response()->json([
                    'success' => false,
                    'message' => 'Redemption not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $redemption->id,
                    'unique_id' => $redemption->unique_id,
                    'investment_unique_id' => $redemption->investment_unique_id,
                    'week_number' => $redemption->week_number,
                    'transaction_id' => $redemption->transaction_id,
                    'payment_document' => $redemption->payment_document ? asset($redemption->payment_document) : null,
                    'redemption_amount' => round($redemption->redemption_amount),
                    'status' => $redemption->status,
                    'redemption_date' => $redemption->redemption_date,
                    'remarks' => $redemption->remarks,
                    'investor' => [
                        'name' => $redemption->requestedBy ? $redemption->requestedBy->name : 'N/A',
                        'user_id' => $redemption->requestedBy ? $redemption->requestedBy->user_id : 'N/A',
                    ],
                    'weekly_schedule' => [
                        'redemption_value' => round($redemption->weeklySchedule->redemption_value),
                        'total_earning' => round($redemption->weeklySchedule->total_earning),
                        'closing_balance' => round($redemption->weeklySchedule->closing_balance),
                    ],
                    'investor_investment' => [
                        'investor_unique_id' => $redemption->investorInvestment->investor_unique_id,
                        'total_amount' => round($redemption->investorInvestment->total_amount),
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching redemption: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve redemption'
            ], 500);
        }
    }

    /**
     * Approve redemption request
     */
    public function approveRedemption(Request $request, $id)
    {
        try {
            $redemption = InvestmentWeeklyRedemption::where('unique_id', $id)->first();

            if (!$redemption) {
                return response()->json([
                    'success' => false,
                    'message' => 'Redemption not found'
                ], 404);
            }

            if ($redemption->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Redemption is not in pending status'
                ], 400);
            }

            // Handle optional document upload
            $documentPath = $redemption->payment_document;
            if ($request->hasFile('payment_document')) {
                $file = $request->file('payment_document');
                $filename = 'redemption_' . $id . '_' . time() . '.' . $file->getClientOriginalExtension();
                $file->move(public_path('investment_redemptions'), $filename);
                $documentPath = 'investment_redemptions/' . $filename;
            }

            // Update redemption status
            $redemption->update([
                'status' => 'approved',
                'approved_by' => Auth::id(),
                'approved_at' => now(),
                'transaction_id' => $request->get('transaction_id', $redemption->transaction_id),
                'payment_document' => $documentPath,
                'remarks' => $request->get('remarks', $redemption->remarks)
            ]);

            // Update weekly schedule in database
            $weeklySchedule = $redemption->weeklySchedule;
            $newTotalRedeemed = $weeklySchedule->total_redeemed + $redemption->redemption_amount;
            
            $redemptionStatus = 'partially_redeemed';
            if ($newTotalRedeemed >= $weeklySchedule->total_earning) {
                $redemptionStatus = 'fully_redeemed';
            }

            // Calculate new closing balance and redeem amount
            $newClosingBalance = $weeklySchedule->redemption_value - $newTotalRedeemed;

            // Update all fields in database
            $weeklySchedule->update([
                'total_redeemed' => $newTotalRedeemed,
                'redeem' => $newTotalRedeemed, // Update redeem field to match total_redeemed
                'closing_balance' => $newClosingBalance,
                'redemption_status' => $redemptionStatus
            ]);

            Log::info('Redemption approved', [
                'redemption_id' => $redemption->unique_id,
                'approved_by' => Auth::id(),
                'amount' => $redemption->redemption_amount,
                'transaction_id' => $redemption->transaction_id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Redemption approved successfully',
                'data' => [
                    'id' => $redemption->id,
                    'unique_id' => $redemption->unique_id,
                    'status' => $redemption->status,
                    'transaction_id' => $redemption->transaction_id,
                    'payment_document' => $redemption->payment_document ? asset($redemption->payment_document) : null,
                    'approved_at' => $redemption->approved_at,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error approving redemption: ' . $e->getMessage(), [
                'redemption_id' => $id
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve redemption'
            ], 500);
        }
    }

    /**
     * Reject redemption request
     */
    public function rejectRedemption(Request $request, $id)
    {
        try {
            $redemption = InvestmentWeeklyRedemption::where('unique_id', $id)->first();

            if (!$redemption) {
                return response()->json([
                    'success' => false,
                    'message' => 'Redemption not found'
                ], 404);
            }

            if ($redemption->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Redemption is not in pending status'
                ], 400);
            }

            $redemption->update([
                'status' => 'rejected',
                'approved_by' => Auth::id(),
                'approved_at' => now(),
                'remarks' => $request->get('remarks', 'Redemption rejected by admin')
            ]);

            // Revert weekly schedule status back to not_redeemed
            $weeklySchedule = $redemption->weeklySchedule;
            $weeklySchedule->update([
                'redemption_status' => 'not_redeemed'
            ]);

            Log::info('Redemption rejected', [
                'redemption_id' => $redemption->unique_id,
                'rejected_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Redemption rejected successfully',
                'data' => $redemption
            ]);

        } catch (\Exception $e) {
            Log::error('Error rejecting redemption: ' . $e->getMessage(), [
                'redemption_id' => $id
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject redemption'
            ], 500);
        }
    }
}