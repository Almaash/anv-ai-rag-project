<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Investment;
use App\Services\InvestmentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class InvestmentController extends Controller
{
    protected InvestmentService $investmentService;

    public function __construct(InvestmentService $investmentService)
    {
        $this->investmentService = $investmentService;
    }

    /**
     * Create new investment with weekly schedule
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'investor_id' => 'required|string',
                'self_amount' => 'required|numeric|min:0',
                'referral_amount' => 'required|numeric|min:0',
                'investment_start_date' => 'required|date',
                'lockin_years' => 'integer|min:1|max:10',
                'annual_roi' => 'required|numeric|min:0|max:100',
                'allocation_charges' => 'required|numeric|min:0|max:100',
            ]);

            // Set default lockin_years if not provided
            if (!isset($validatedData['lockin_years'])) {
                $validatedData['lockin_years'] = 3;
            }

            // Validate that at least one amount is greater than 0
            if ($validatedData['self_amount'] <= 0 && $validatedData['referral_amount'] <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Either self_amount or referral_amount must be greater than 0',
                ], 422);
            }

            $investment = $this->investmentService->createInvestment($validatedData);
            
            $summary = $this->investmentService->getInvestmentSummary($investment);
            
            return response()->json([
                'success' => true,
                'message' => 'Investment created successfully',
                'data' => [
                    'investment' => $summary['investment'],
                    'total_earnings' => $summary['total_earnings'],
                    'maturity_amount' => $summary['maturity_amount'],
                    'allocation_charges_total' => $summary['allocation_charges_total'],
                    'weekly_schedule' => $investment->weeklySchedules->map(function ($schedule) {
                        return [
                            'week_number' => $schedule->week_number,
                            'date' => $schedule->date->format('Y-m-d'),
                            'self_bonus' => $schedule->self_bonus,
                            'referral_bonus' => $schedule->referral_bonus,
                            'total_earning' => $schedule->total_earning,
                            'redemption_value' => $schedule->redemption_value,
                            'redeem' => $schedule->redeem,
                            'closing_balance' => $schedule->closing_balance,
                        ];
                    }),
                ],
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating investment: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create investment: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get investment with full weekly schedule
     */
    public function show(int $id): JsonResponse
    {
        try {
            $investment = $this->investmentService->getInvestmentWithSchedule($id);
            $summary = $this->investmentService->getInvestmentSummary($investment);
            
            return response()->json([
                'success' => true,
                'message' => 'Investment retrieved successfully',
                'data' => [
                    'investment' => $summary['investment'],
                    'total_earnings' => $summary['total_earnings'],
                    'maturity_amount' => $summary['maturity_amount'],
                    'allocation_charges_total' => $summary['allocation_charges_total'],
                    'weekly_schedule' => $investment->weeklySchedules->map(function ($schedule) {
                        return [
                            'week_number' => $schedule->week_number,
                            'date' => $schedule->date->format('Y-m-d'),
                            'self_bonus' => $schedule->self_bonus,
                            'referral_bonus' => $schedule->referral_bonus,
                            'total_earning' => $schedule->total_earning,
                            'redemption_value' => $schedule->redemption_value,
                            'redeem' => $schedule->redeem,
                            'closing_balance' => $schedule->closing_balance,
                        ];
                    }),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching investment: ' . $e->getMessage(), [
                'investment_id' => $id,
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Investment not found',
            ], 404);
        }
    }

    /**
     * Get all investments
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Investment::with(['weeklySchedules' => function ($query) {
                $query->orderBy('week_number');
            }]);

            // Filter by investor_id if provided
            if ($request->has('investor_id') && !empty($request->investor_id)) {
                $query->where('investor_id', $request->investor_id);
            }

            // Filter by date range if provided
            if ($request->has('start_date') && !empty($request->start_date)) {
                $query->where('investment_start_date', '>=', $request->start_date);
            }

            if ($request->has('end_date') && !empty($request->end_date)) {
                $query->where('investment_start_date', '<=', $request->end_date);
            }

            $perPage = $request->get('per_page', 10);
            $investments = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'message' => 'Investments retrieved successfully',
                'data' => $investments->items(),
                'pagination' => [
                    'current_page' => $investments->currentPage(),
                    'per_page' => $investments->perPage(),
                    'total' => $investments->total(),
                    'last_page' => $investments->lastPage(),
                    'from' => $investments->firstItem(),
                    'to' => $investments->lastItem(),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching investments: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve investments',
            ], 500);
        }
    }

    /**
     * Process redemption for specific week
     */
    public function processRedemption(Request $request, int $id): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'week_number' => 'required|integer|min:1',
                'redeem_amount' => 'required|numeric|min:0',
            ]);

            $investment = Investment::findOrFail($id);
            
            $this->investmentService->processRedemption(
                $investment,
                $validatedData['week_number'],
                $validatedData['redeem_amount']
            );

            $updatedInvestment = $this->investmentService->getInvestmentWithSchedule($id);
            $summary = $this->investmentService->getInvestmentSummary($updatedInvestment);

            return response()->json([
                'success' => true,
                'message' => 'Redemption processed successfully',
                'data' => [
                    'investment' => $summary['investment'],
                    'total_earnings' => $summary['total_earnings'],
                    'maturity_amount' => $summary['maturity_amount'],
                    'weekly_schedule' => $updatedInvestment->weeklySchedules->map(function ($schedule) {
                        return [
                            'week_number' => $schedule->week_number,
                            'date' => $schedule->date->format('Y-m-d'),
                            'self_bonus' => $schedule->self_bonus,
                            'referral_bonus' => $schedule->referral_bonus,
                            'total_earning' => $schedule->total_earning,
                            'redemption_value' => $schedule->redemption_value,
                            'redeem' => $schedule->redeem,
                            'closing_balance' => $schedule->closing_balance,
                        ];
                    }),
                ],
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error processing redemption: ' . $e->getMessage(), [
                'investment_id' => $id,
                'request_data' => $request->all(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to process redemption: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get investment summary only
     */
    public function summary(int $id): JsonResponse
    {
        try {
            $investment = Investment::findOrFail($id);
            $summary = $this->investmentService->getInvestmentSummary($investment);
            
            return response()->json([
                'success' => true,
                'message' => 'Investment summary retrieved successfully',
                'data' => $summary,
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching investment summary: ' . $e->getMessage(), [
                'investment_id' => $id,
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Investment not found',
            ], 404);
        }
    }
}