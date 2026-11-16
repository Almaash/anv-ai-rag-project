<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InvestorInvestment;
use App\Models\Investment;
use App\Models\Loan\InvestorType;
use App\Models\MoneyPool;
use App\Services\InvestmentService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class InvestorInvestmentController extends Controller
{
    protected InvestmentService $investmentService;

    private function resolvePool($value): ?MoneyPool
    {
        if ($value === null || $value === '') {
            return null;
        }

        $input = trim((string) $value);
        if ($input === '') {
            return null;
        }

        if (ctype_digit($input)) {
            return MoneyPool::find((int) $input);
        }

        return MoneyPool::where('unique_id', $input)->first();
    }

    private function resolveInvestorType($value): ?InvestorType
    {
        if ($value === null || $value === '') {
            return null;
        }

        $input = trim((string) $value);
        if ($input === '') {
            return null;
        }

        if (ctype_digit($input)) {
            return InvestorType::find((int) $input);
        }

        return InvestorType::where('unique_id', $input)->first();
    }

    private function resolveAuthContext(Request $request): array
    {
        $user = $request->user() ?: Auth::user();

        return [
            'branch_id' => $request->input('branch_id')
                ?? ($user->branch_id ?? null)
                ?? ($user->branch ?? null),
            'cms_admin_id' => $request->input('cms_admin_id')
                ?? ($user->cms_admin_id ?? null)
                ?? ($user->cms_admin ?? null)
                ?? ($user->created_by ?? null)
                ?? ($user->id ?? null),
        ];
    }

    public function __construct(InvestmentService $investmentService)
    {
        $this->investmentService = $investmentService;
    }

    public function store(Request $request)
    {
        try {
            $data = $request->validate([
                'branch_id' => 'nullable|string|max:255',
                'cms_admin_id' => 'nullable|string|max:255',
                'investor_id' => 'required|exists:investor_basic_information,id',
                'investor_unique_id' => 'required',
                'pool_id' => 'required|string|max:255',
                'pool_unique_id' => 'nullable',
                'investor_type_id' => 'required|string|max:255',
                'investor_type_unique_id' => 'nullable',
                'amount' => 'required|numeric|min:0',
                'self_amount' => 'nullable|numeric|min:0',
                'referral_amount' => 'nullable|numeric|min:0',
                'total_amount' => 'nullable|numeric|min:0',
                'date' => 'required|date',
                'rate' => 'required|numeric|min:0|max:100',
                'referral_commission' => 'nullable|numeric',
                'allocation_charges' => 'nullable|numeric|min:0|max:100',
                'yearly' => 'required|numeric',
                'maturity' => 'required|numeric',
                'lockin' => 'nullable',
                'declaration_text' => 'nullable|string',
                'declaration_accepted' => 'nullable|boolean',
                'use_referral_bonus' => 'nullable|boolean', // New field to indicate if using referral bonus
            ]);

            // Set default allocation charges if not provided (5% from Excel sheet)
            if (!isset($data['allocation_charges'])) {
                $data['allocation_charges'] = 5;
            }

            $resolvedPool = $this->resolvePool($data['pool_id'] ?? null);
            $resolvedInvestorType = $this->resolveInvestorType($data['investor_type_id'] ?? null);
            if (!$resolvedPool) {
                return response()->json([
                    'success' => false,
                    'message' => 'Selected pool is invalid',
                ], 422);
            }
            if (!$resolvedInvestorType) {
                return response()->json([
                    'success' => false,
                    'message' => 'Selected investor type is invalid',
                ], 422);
            }

            $authContext = $this->resolveAuthContext($request);
            $data['pool_id'] = (string) $resolvedPool->unique_id;
            $data['pool_unique_id'] = (string) $resolvedPool->unique_id;
            $data['investor_type_id'] = (string) $resolvedInvestorType->unique_id;
            $data['investor_type_unique_id'] = (string) $resolvedInvestorType->unique_id;
            $data['branch_id'] = $authContext['branch_id'] ?? $data['branch_id'] ?? null;
            $data['cms_admin_id'] = $authContext['cms_admin_id'] ?? $data['cms_admin_id'] ?? null;

            // Handle referral bonus usage
            $investor = \App\Models\Investor\BasicInformation::where('unique_id', $data['investor_unique_id'])->first();
            if (!$investor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Investor not found'
                ], 404);
            }

            $usedReferralBonus = 0;
            
            // Check if referral_amount is provided and investor has available bonus
            if (isset($data['referral_amount']) && $data['referral_amount'] > 0) {
                $requestedReferralAmount = $data['referral_amount'];
                $availableBonus = $investor->total_referral_bonus ?? 0;
                
                if ($requestedReferralAmount > $availableBonus) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Insufficient referral bonus. Available: ₹' . number_format($availableBonus, 2) . ', Requested: ₹' . number_format($requestedReferralAmount, 2)
                    ], 400);
                }
                
                // Use the requested referral amount
                $usedReferralBonus = $requestedReferralAmount;
                
                // Subtract from investor's total referral bonus
                $newTotalBonus = $availableBonus - $usedReferralBonus;
                $investor->update(['total_referral_bonus' => $newTotalBonus]);
                
                // Update total_amount to include both self_amount and referral_amount
                $data['total_amount'] = ($data['self_amount'] ?? $data['amount']) + $data['referral_amount'];
                
                Log::info('Used referral bonus in investment', [
                    'investor_id' => $data['investor_unique_id'],
                    'requested_amount' => $requestedReferralAmount,
                    'used_amount' => $usedReferralBonus,
                    'previous_total_bonus' => $availableBonus,
                    'new_total_bonus' => $newTotalBonus
                ]);
            } else if ($request->get('use_referral_bonus', false) && $investor->total_referral_bonus > 0) {
                // Fallback: use all available bonus if use_referral_bonus flag is true
                $usedReferralBonus = $investor->total_referral_bonus;
                
                // Update investment amounts
                if (!isset($data['referral_amount'])) {
                    $data['referral_amount'] = $usedReferralBonus;
                } else {
                    $data['referral_amount'] += $usedReferralBonus;
                }
                
                // Recalculate total amount
                $data['total_amount'] = ($data['self_amount'] ?? $data['amount']) + $data['referral_amount'];
                
                // Reset investor's total referral bonus to 0
                $investor->update(['total_referral_bonus' => 0]);
                
                Log::info('Used all available referral bonus in investment', [
                    'investor_id' => $data['investor_unique_id'],
                    'used_amount' => $usedReferralBonus,
                    'new_total_referral_bonus' => 0
                ]);
            }

            // Generate Custom Unique ID: ANVINVYYMMDD001
            $datePrefix = 'ANVINV' . date('ymd');
            
            $lastRecord = InvestorInvestment::where('unique_id', 'like', $datePrefix . '%')
                ->orderBy('unique_id', 'desc')
                ->first();

            $nextNumber = 1;
            if ($lastRecord) {
                $lastId = $lastRecord->unique_id;
                $lastSuffix = substr($lastId, -3);
                $nextNumber = (int)$lastSuffix + 1;
            }

            $data['unique_id'] = $datePrefix . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
            $data['used_referral_bonus'] = $usedReferralBonus; // Track how much referral bonus was used

            // Create only the investor investment record
            $investment = InvestorInvestment::create($data);

            // Generate weekly schedules directly for this investment only if investor type is not "self"
            $shouldGenerateSchedule = true;
            if ($resolvedInvestorType) {
                // Check if investor type name contains "self" (case insensitive)
                $investorTypeName = strtolower($resolvedInvestorType->name ?? '');
                if (strpos($investorTypeName, 'self') !== false) {
                    $shouldGenerateSchedule = false;
                    Log::info('Skipping weekly schedule generation for self investor type', [
                        'investor_type_id' => $resolvedInvestorType->unique_id,
                        'investor_type_name' => $resolvedInvestorType->name,
                        'investment_id' => $investment->unique_id
                    ]);
                }
            }

            if ($shouldGenerateSchedule) {
                $this->generateWeeklySchedules($investment);
            }

            // Process referral bonus if this investor was referred
            $this->processReferralBonus($investment);

            Log::info('Investment created with weekly schedules', [
                'investor_investment_id' => $investment->id,
                'unique_id' => $investment->unique_id,
                'used_referral_bonus' => $usedReferralBonus
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Investment created successfully',
                'data' => array_merge($investment->toArray(), [
                    'used_referral_bonus' => $usedReferralBonus,
                    'remaining_referral_bonus' => 0
                ])
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating investor investment: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create investment: ' . $e->getMessage()
            ], 500);
        }
    }

    public function index(Request $request)
    {
        try {
            $query = InvestorInvestment::with(['investor', 'investor_type', 'pool']);
            $hasWeeklyPortfolioTable = Schema::hasTable((new Investment())->getTable());

            // Branch-wise filtering
            $branchId = $request->query('branch_id');
            $cmsAdminId = $request->query('cms_admin_id');
            if ($branchId) {
                $query->where('branch_id', $branchId);
            }
            if ($cmsAdminId) {
                $query->where('cms_admin_id', $cmsAdminId);
            }

            if ($request->filled('investor_unique_id')) {
                $query->where('investor_unique_id', $request->investor_unique_id);
            }

            // Add filtering options
            if ($request->has('investor_id') && !empty($request->investor_id)) {
                $query->where('investor_id', $request->investor_id);
            }

            if ($request->has('start_date') && !empty($request->start_date)) {
                $query->where('date', '>=', $request->start_date);
            }

            if ($request->has('end_date') && !empty($request->end_date)) {
                $query->where('date', '<=', $request->end_date);
            }

            $perPage = $request->get('per_page', 10);
            $investments = $query->latest('date')->paginate($perPage);

            // Add weekly portfolio summary for each investment
            $investmentsWithPortfolio = $investments->getCollection()->map(function ($investment) use ($hasWeeklyPortfolioTable) {
                $weeklyPortfolio = null;
                if ($hasWeeklyPortfolioTable) {
                    $weeklyPortfolio = Investment::where('investor_id', $investment->investor_unique_id)
                        ->where('investment_start_date', $investment->date)
                        ->first();
                }

                $investmentData = $investment->toArray();
                
                if ($weeklyPortfolio) {
                    $portfolioSummary = $this->investmentService->getInvestmentSummary($weeklyPortfolio);
                    $investmentData['weekly_portfolio_summary'] = [
                        'total_earnings' => $portfolioSummary['total_earnings'],
                        'maturity_amount' => $portfolioSummary['maturity_amount'],
                        'total_weeks' => $portfolioSummary['total_weeks'],
                        'weekly_total_earning' => $portfolioSummary['weekly_total_earning'],
                        'has_weekly_schedule' => true
                    ];
                } else {
                    $investmentData['weekly_portfolio_summary'] = [
                        'has_weekly_schedule' => false
                    ];
                }

                return $investmentData;
            });

            return response()->json([
                'success' => true,
                'data' => $investmentsWithPortfolio,
                'pagination' => [
                    'current_page' => $investments->currentPage(),
                    'per_page' => $investments->perPage(),
                    'total' => $investments->total(),
                    'last_page' => $investments->lastPage(),
                    'from' => $investments->firstItem(),
                    'to' => $investments->lastItem(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching investor investments: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve investments'
            ], 500);
        }
    }

    public function investorDashboard($investor_unique_id)
    {
        try {
            $investor = \App\Models\Investor\BasicInformation::where('unique_id', $investor_unique_id)->first();

            if (!$investor) {
                return response()->json(['success' => false, 'message' => 'Investor not found'], 404);
            }

            $today = Carbon::today();
            $investments = InvestorInvestment::where('investor_unique_id', $investor_unique_id)->get();
            $investmentUniqueIds = $investments->pluck('unique_id');

            // Per-investment week info
            $investmentsWithWeek = $investments->map(function ($inv) use ($today) {
                $startDate      = Carbon::parse($inv->date);
                $daysSinceStart = $startDate->diffInDays($today);
                $currentWeek    = max(1, (int) floor($daysSinceStart / 7) + 1);

                // Get the current week's schedule row
                $schedules = \App\Models\InvestmentWeeklySchedule::where('investment_unique_id', $inv->unique_id)->get();
                $totalWeeks = $schedules->count();
                $currentWeek = min($currentWeek, $totalWeeks ?: 1);

                $currentSchedule = $schedules->firstWhere('week_number', $currentWeek);

                return [
                    'investment_unique_id' => $inv->unique_id,
                    'investment_date'      => $inv->date,
                    'amount'               => $inv->amount,
                    'rate'                 => $inv->rate,
                    'lockin'               => $inv->lockin,
                    'total_weeks'          => $totalWeeks,
                    'current_week'         => $currentWeek,
                    'current_week_data'    => $currentSchedule ? [
                        'week_number'      => $currentSchedule->week_number,
                        'date'             => Carbon::parse($currentSchedule->date)->format('Y-m-d'),
                        'self_bonus'       => round($currentSchedule->self_bonus),
                        'referral_bonus'   => round($currentSchedule->referral_bonus),
                        'total_earning'    => round($currentSchedule->total_earning),
                        'redemption_value' => round($currentSchedule->redemption_value),
                        'closing_balance'  => round($currentSchedule->closing_balance),
                        'redemption_status'=> $currentSchedule->redemption_status ?? 'not_redeemed',
                    ] : null,
                ];
            });

            // Aggregate portfolio stats using only current-week schedule rows per investment
            $currentWeekEarnings    = 0;
            $currentWeekRedemption  = 0;
            $currentWeekClosing     = 0;

            foreach ($investmentsWithWeek as $invData) {
                if ($invData['current_week_data']) {
                    $currentWeekEarnings   += $invData['current_week_data']['total_earning'];
                    $currentWeekRedemption += $invData['current_week_data']['redemption_value'];
                    $currentWeekClosing    += $invData['current_week_data']['closing_balance'];
                }
            }

            // All-time totals from schedules
            $allSchedules   = \App\Models\InvestmentWeeklySchedule::whereIn('investment_unique_id', $investmentUniqueIds)->get();
            $totalRedeemed  = $allSchedules->sum('total_redeemed');

            // Referral stats
            $referralTransactions   = \App\Models\ReferralTransaction::where('referrer_unique_id', $investor_unique_id)->get();
            $totalReferralEarned    = $referralTransactions->sum('referral_amount');
            $availableReferralBonus = $investor->total_referral_bonus ?? 0;

            // Redemption requests
            $redemptions = \App\Models\InvestmentWeeklyRedemption::whereIn('investment_unique_id', $investmentUniqueIds)->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'investor' => [
                        'unique_id' => $investor->unique_id,
                        'name'      => trim($investor->first_name . ' ' . $investor->last_name),
                        'email'     => $investor->email,
                        'mobile'    => $investor->mobile,
                        'branch_id' => $investor->branch_id,
                    ],
                    'investment_stats' => [
                        'total_investments'   => $investments->count(),
                        'total_invested'      => round($investments->sum('amount'), 2),
                        'total_self_amount'   => round($investments->sum('self_amount'), 2),
                        'total_referral_used' => round($investments->sum('used_referral_bonus'), 2),
                    ],
                    'portfolio_stats' => [
                        'current_week_total_earning'    => round($currentWeekEarnings, 2),
                        'current_week_redemption_value' => round($currentWeekRedemption, 2),
                        'current_week_closing_balance'  => round($currentWeekClosing, 2),
                        'total_redeemed_all_time'       => round($totalRedeemed, 2),
                    ],
                    'referral_stats' => [
                        'total_referral_earned'    => round($totalReferralEarned, 2),
                        'available_referral_bonus' => round($availableReferralBonus, 2),
                        'total_referrals'          => $referralTransactions->count(),
                    ],
                    'redemption_stats' => [
                        'total_requests' => $redemptions->count(),
                        'pending'        => $redemptions->where('status', 'pending')->count(),
                        'approved'       => $redemptions->where('status', 'approved')->count(),
                        'rejected'       => $redemptions->where('status', 'rejected')->count(),
                        'total_amount'   => round($redemptions->where('status', 'approved')->sum('redemption_amount'), 2),
                    ],
                    'investments' => $investmentsWithWeek->values(),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in investorDashboard: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function dashboard()
    {
        try {
            $branchId = request()->query('branch_id');
            $cmsAdminId = request()->query('cms_admin_id');

            $investorQuery = \App\Models\Investor\BasicInformation::query();
            if ($branchId) {
                $investorQuery->where('branch_id', $branchId);
            }
            if ($cmsAdminId) {
                $investorQuery->where('cms_admin_id', $cmsAdminId);
            }

            $investmentQuery = \App\Models\InvestorInvestment::query();
            if ($branchId) {
                $investmentQuery->where('branch_id', $branchId);
            }
            if ($cmsAdminId) {
                $investmentQuery->where('cms_admin_id', $cmsAdminId);
            }

            $poolQuery = \App\Models\MoneyPool::query();
            if ($branchId) {
                $poolQuery->where('branch_id', $branchId);
            }
            if ($cmsAdminId) {
                $poolQuery->where('cms_admin_id', $cmsAdminId);
            }

            $totalInvestors = $investorQuery->count();
            $totalInvestmentAmount = (clone $investmentQuery)->sum('amount');
            $activeInvestments = (clone $investmentQuery)->count(); // Assuming all are active for now or add status check
            $inactiveInvestments = 0; // Placeholder
            
            $totalPools = $poolQuery->count();
            $avgInvestment = (clone $investmentQuery)->avg('amount') ?? 0;

            $recentInvestmentsQuery = \App\Models\InvestorInvestment::with(['investor', 'investor_type', 'pool']);
            if ($branchId) {
                $recentInvestmentsQuery->where('branch_id', $branchId);
            }
            if ($cmsAdminId) {
                $recentInvestmentsQuery->where('cms_admin_id', $cmsAdminId);
            }

            $recentInvestments = $recentInvestmentsQuery
                ->latest()
                ->limit(5)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => [
                        'total_investors' => $totalInvestors,
                        'total_investment_amount' => $totalInvestmentAmount,
                        'active_investments' => $activeInvestments,
                        'inactive_investments' => $inactiveInvestments,
                        'total_pools' => $totalPools,
                        'avg_investment' => $avgInvestment,
                    ],
                    'recent_investments' => $recentInvestments
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        try {
            // IF THE ID CONTAINS A SLASH, IT MIGHT BE AN OVER-MATCHED ROUTE
            if (str_contains($id, '/')) {
                 $parts = explode('/', $id);
                 if (end($parts) === 'weekly-schedule') {
                     return $this->getWeeklyScheduleFromTable($parts[0]);
                 }
            }

            // Debug: Log the incoming ID
            
            // Accept either investment unique_id (ANVINV...) or investor_unique_id (MUZM/...)
            $investment = InvestorInvestment::with(['investor', 'investor_type', 'pool'])
                ->where('unique_id', $id)
                ->orWhere('investor_unique_id', $id)
                ->latest('id')
                ->first();

            if (!$investment) {
                // Debug: Check what investments actually exist
                $allInvestments = InvestorInvestment::select('id', 'unique_id', 'investor_unique_id', 'amount', 'date')
                    ->orderBy('created_at', 'desc')
                    ->limit(10)
                    ->get();
                    
                return response()->json([
                    'success' => false, 
                    'message' => 'Investment not found',
                    'debug' => [
                        'searching_for' => $id,
                        'recent_investments' => $allInvestments->toArray(),
                        'total_investments' => InvestorInvestment::count()
                    ]
                ], 404);
            }

            // Initialize missing fields for backward compatibility
            if ($investment->remaining_pool_balance === null) {
                $investment->remaining_pool_balance = $investment->amount;
                $investment->save();
            }
            
            if ($investment->payment_history === null) {
                $investment->payment_history = [];
                $investment->save();
            }

            $response = [
                'success' => true,
                'data' => [
                    'investment' => $investment
                ]
            ];

            // Weekly portfolio is optional. Any issue here should not break base investor details.
            try {
                $weeklyPortfolio = Investment::where('investor_id', $investment->investor_unique_id)
                    ->where('investment_start_date', $investment->date)
                    ->with(['weeklySchedules' => function ($query) {
                        $query->orderBy('week_number');
                    }])
                    ->first();

                if ($weeklyPortfolio) {
                    $portfolioSummary = $this->investmentService->getInvestmentSummary($weeklyPortfolio);
                    $response['data']['weekly_portfolio'] = [
                        'investment' => $portfolioSummary['investment'],
                        'total_earnings' => $portfolioSummary['total_earnings'],
                        'maturity_amount' => $portfolioSummary['maturity_amount'],
                        'allocation_charges_total' => $portfolioSummary['allocation_charges_total'],
                        'weekly_schedule' => $weeklyPortfolio->weeklySchedules->map(function ($schedule) {
                            $scheduleDate = null;
                            if ($schedule->date instanceof \DateTimeInterface) {
                                $scheduleDate = $schedule->date->format('Y-m-d');
                            } elseif (!empty($schedule->date)) {
                                try {
                                    $scheduleDate = Carbon::parse((string) $schedule->date)->format('Y-m-d');
                                } catch (\Throwable $e) {
                                    $scheduleDate = (string) $schedule->date;
                                }
                            }

                            return [
                                'week_number' => $schedule->week_number,
                                'date' => $scheduleDate,
                                'self_bonus' => round((float) ($schedule->self_bonus ?? 0)),
                                'referral_bonus' => round((float) ($schedule->referral_bonus ?? 0)),
                                'total_earning' => round((float) ($schedule->total_earning ?? 0)),
                                'redemption_value' => round((float) ($schedule->redemption_value ?? 0)),
                                'redeem' => round((float) ($schedule->redeem ?? 0)),
                                'closing_balance' => round((float) ($schedule->closing_balance ?? 0)),
                            ];
                        })
                    ];
                }
            } catch (\Throwable $weeklyError) {
                Log::warning('Weekly portfolio generation failed in investor show endpoint', [
                    'investment_id' => $id,
                    'error' => $weeklyError->getMessage(),
                ]);
            }

            return response()->json($response);

        } catch (\Exception $e) {
            Log::error('Error fetching investor investment: ' . $e->getMessage(), [
                'investment_id' => $id
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve investment'
            ], 500);
        }
    }

    /**
     * POST fallback for getting investment by ID when URL encoding causes issues
     */
    public function showByPost(Request $request)
    {
        $request->validate([
            'id' => 'required|string'
        ]);
        
        return $this->show($request->id);
    }

    public function update(Request $request, $id)
    {
        $investment = InvestorInvestment::where('unique_id', $id)->first();
        if (!$investment) {
            return response()->json(['success' => false, 'message' => 'Investment not found'], 404);
        }

        $data = $request->validate([
            'branch_id' => 'nullable|string|max:255',
            'cms_admin_id' => 'nullable|string|max:255',
            'investor_id' => 'required|exists:investor_basic_information,id',
            'investor_unique_id' => 'required',
            'pool_id' => 'required|string|max:255',
            'pool_unique_id' => 'nullable',
            'investor_type_id' => 'required|string|max:255',
            'investor_type_unique_id' => 'nullable',
            'amount' => 'required|numeric',
            'self_amount' => 'nullable|numeric',
            'referral_amount' => 'nullable|numeric',
            'total_amount' => 'nullable|numeric',
            'date' => 'required|date',
            'rate' => 'required|numeric',
            'referral_commission' => 'nullable|numeric',
            'allocation_charges' => 'nullable|numeric|min:0|max:100',
            'yearly' => 'required|numeric',
            'maturity' => 'required|numeric',
            'lockin' => 'nullable',
            'declaration_text' => 'nullable|string',
            'declaration_accepted' => 'nullable|boolean',
        ]);

        if (!isset($data['allocation_charges'])) {
            $data['allocation_charges'] = 5;
        }

        $resolvedPool = $this->resolvePool($data['pool_id'] ?? null);
        $resolvedInvestorType = $this->resolveInvestorType($data['investor_type_id'] ?? null);
        if (!$resolvedPool) {
            return response()->json([
                'success' => false,
                'message' => 'Selected pool is invalid',
            ], 422);
        }
        if (!$resolvedInvestorType) {
            return response()->json([
                'success' => false,
                'message' => 'Selected investor type is invalid',
            ], 422);
        }

        $authContext = $this->resolveAuthContext($request);
        $data['pool_id'] = (string) $resolvedPool->unique_id;
        $data['pool_unique_id'] = (string) $resolvedPool->unique_id;
        $data['investor_type_id'] = (string) $resolvedInvestorType->unique_id;
        $data['investor_type_unique_id'] = (string) $resolvedInvestorType->unique_id;

        $data['branch_id'] = $authContext['branch_id'] ?? $investment->branch_id;
        $data['cms_admin_id'] = $authContext['cms_admin_id'] ?? $investment->cms_admin_id;

        $investment->update($data);
        return response()->json(['success' => true, 'data' => $investment]);
    }

    public function destroy($id)
    {
        try {
            $investment = InvestorInvestment::where('unique_id', $id)->first();
            if (!$investment) {
                return response()->json(['success' => false, 'message' => 'Investment not found'], 404);
            }

            // Soft delete all related weekly schedules
            $investment->investment_weekly_schedules()->delete();

            $investment->delete();

            return response()->json([
                'success' => true,
                'message' => 'Investment deleted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting investor investment: ' . $e->getMessage(), [
                'investment_id' => $id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete investment'
            ], 500);
        }
    }

    /**
     * Get full weekly schedule for an investment
     */
    public function getWeeklySchedule($id)
    {
        try {
            $investment = InvestorInvestment::where('unique_id', $id)->first();
            if (!$investment) {
                return response()->json(['success' => false, 'message' => 'Investment not found'], 404);
            }

            $weeklyPortfolio = Investment::where('investor_id', $investment->investor_unique_id)
                ->where('investment_start_date', $investment->date)
                ->with(['weeklySchedules' => function ($query) {
                    $query->orderBy('week_number');
                }])
                ->first();

            if (!$weeklyPortfolio) {
                return response()->json([
                    'success' => false,
                    'message' => 'Weekly portfolio not found for this investment'
                ], 404);
            }

            $portfolioSummary = $this->investmentService->getInvestmentSummary($weeklyPortfolio);

            return response()->json([
                'success' => true,
                'message' => 'Weekly schedule retrieved successfully',
                'data' => [
                    'investment' => $investment,
                    'portfolio_summary' => $portfolioSummary,
                    'weekly_schedule' => $weeklyPortfolio->weeklySchedules->map(function ($schedule) {
                        return [
                            'week_number' => $schedule->week_number,
                            'date' => $schedule->date->format('Y-m-d'),
                            'self_bonus' => round($schedule->self_bonus),
                            'referral_bonus' => round($schedule->referral_bonus),
                            'total_earning' => round($schedule->total_earning),
                            'redemption_value' => round($schedule->redemption_value),
                            'redeem' => round($schedule->redeem),
                            'closing_balance' => round($schedule->closing_balance),
                        ];
                    })
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching weekly schedule: ' . $e->getMessage(), [
                'investment_id' => $id
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve weekly schedule'
            ], 500);
        }
    }

    /**
     * Generate weekly schedules directly for investor investment
     */
    public function generateWeeklySchedules($investment)
    {
        $lockinYears = 3; // Default
        if ($investment->lockin) {
            if (is_numeric($investment->lockin)) {
                $lockinYears = (int)$investment->lockin;
            } else {
                try {
                    $startDate = new \DateTime($investment->date);
                    $endDate = new \DateTime($investment->lockin);
                    $lockinYears = $startDate->diff($endDate)->y;
                    if ($lockinYears < 1) $lockinYears = 1;
                } catch (\Exception $e) {
                    $lockinYears = 3;
                }
            }
        }

        $totalWeeks = $lockinYears * 52;
        $selfAmount = $investment->self_amount ?? $investment->amount;
        $referralAmount = $investment->referral_amount ?? 0;
        $totalAmount = $selfAmount + $referralAmount;
        
        $referralCommissionRate = $investment->referral_commission ?? 1.2;
        $allocationChargesRate = ($investment->allocation_charges ?? 0) / 100;

        $currentDate = new \DateTime($investment->date);
        $currentDate->modify('+1 week'); // Start from next week
        
        $cumulativeRedeem = 0;
        $previousClosingBalance = 0;
        $runningTotalEarning = 0;

        for ($week = 1; $week <= $totalWeeks; $week++) {
            // Self Bonus: (($selfAmount + Previous Closing Balance) * rate%) / 52
            $weeklySelfBonus = (($selfAmount + $previousClosingBalance) * ($investment->rate / 100)) / 52;
            
            // Referral Bonus: (Referral Amount * 1.2%) / 52
            $weeklyReferralBonus = ($referralAmount * (1.2 / 100)) / 52;
            
            // Total Earning = Previous Total Earning + current bonuses (do NOT round intermediate values for accuracy)
            $runningTotalEarning += ($weeklySelfBonus + $weeklyReferralBonus);
            
            // Redemption Value = Total Earning * (1 - Allocation Charges)
            // (Round ONLY at the end as in the Excel logic)
            $redemptionValue = round($runningTotalEarning * (1 - $allocationChargesRate));
            
            // Closing Balance = Redemption Value - Cumulative Redeem
            $closingBalance = $redemptionValue - $cumulativeRedeem;
            
            \App\Models\InvestmentWeeklySchedule::create([
                'investment_unique_id' => $investment->unique_id,
                'week_number' => $week,
                'date' => $currentDate->format('Y-m-d'),
                'self_bonus' => round($weeklySelfBonus),
                'referral_bonus' => round($weeklyReferralBonus),
                'total_earning' => round($runningTotalEarning),
                'redemption_value' => $redemptionValue,
                'redeem' => 0, // Always 0 for new schedules
                'closing_balance' => $closingBalance,
                'redemption_status' => 'not_redeemed', // Explicitly set status
                'total_redeemed' => 0, // Always 0 for new schedules
            ]);
            
            // VERY IMPORTANT: Previous Closing Balance MUST be based on the rounded closing balance 
            // to match the spreadsheet feedback loop
            $previousClosingBalance = $closingBalance;
            $currentDate->modify('+1 week');
        }
    }

    /**
     * Get weekly schedules directly from investment_weekly_schedules table
     */
    /**
     * POST /loan/investor-investments/{id}/deduct-balance
     * Atomically deduct payment from remaining_pool_balance and append to payment_history.
     */
    public function deductPoolBalance(Request $request, $id)
    {
        $request->validate([
            'payment_amount' => 'required|numeric|min:0.01',
            'loan_id'        => 'required|string',
            'payment_date'   => 'required|date',
        ]);

        try {
            return \Illuminate\Support\Facades\DB::transaction(function () use ($request, $id) {
                // Accept both investment unique_id (ANVINV...) and investor_unique_id (MUZM/...)
                $investment = InvestorInvestment::where('unique_id', $id)
                    ->orWhere('investor_unique_id', $id)
                    ->lockForUpdate()
                    ->latest('id')
                    ->first();

                if (!$investment) {
                    return response()->json(['success' => false, 'message' => 'Investment not found'], 404);
                }

                $currentBalance = $investment->remaining_pool_balance ?? $investment->amount;
                $paymentAmount  = (float) $request->payment_amount;

                if ($paymentAmount > $currentBalance) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Insufficient pool balance. Available: ₹' . number_format($currentBalance, 2),
                    ], 422);
                }

                $newBalance = $currentBalance - $paymentAmount;
                $history    = $investment->payment_history ?? [];
                $paymentId  = 'PAY-' . str_pad(count($history) + 1, 5, '0', STR_PAD_LEFT);

                $history[] = [
                    'payment_id' => $paymentId,
                    'loan_id'    => $request->loan_id,
                    'amount'     => $paymentAmount,
                    'date'       => $request->payment_date,
                    'type'       => 'disbursement/cash',
                ];

                $investment->remaining_pool_balance = $newBalance;
                $investment->payment_history        = $history;
                $investment->save();

                return response()->json([
                    'success'                => true,
                    'message'               => 'Pool balance deducted successfully',
                    'previous_balance'      => $currentBalance,
                    'deducted_amount'       => $paymentAmount,
                    'remaining_pool_balance'=> $newBalance,
                    'payment_id'            => $paymentId,
                    'payment_history'       => $history,
                ]);
            });
        } catch (\Exception $e) {
            Log::error('deductPoolBalance error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

  public function getWeeklyScheduleFromTable($investmentId)
    {
        try {
            // Find investor investment by unique_id
            $investorInvestment = InvestorInvestment::where('unique_id', $investmentId)->first();
            
            if (!$investorInvestment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Investment not found',
                    'debug' => 'No investor_investment found with unique_id: ' . $investmentId
                ], 404);
            }

            // Get weekly schedules directly using investment_unique_id with redemption info
            $weeklySchedules = \App\Models\InvestmentWeeklySchedule::with(['redemptions' => function($query) {
                    $query->orderBy('created_at', 'desc');
                }])
                ->where('investment_unique_id', $investmentId)
                ->orderBy('week_number')
                ->get();

            // Debug info
            $totalSchedules = $weeklySchedules->count();
            
            if ($totalSchedules === 0) {
                // Check if there are any schedules with different investment_unique_id values
                $allSchedules = \App\Models\InvestmentWeeklySchedule::select('investment_unique_id')
                    ->distinct()
                    ->get()
                    ->pluck('investment_unique_id');
                    
                return response()->json([
                    'success' => false,
                    'message' => 'No weekly schedules found',
                    'debug' => [
                        'searching_for' => $investmentId,
                        'available_investment_unique_ids' => $allSchedules,
                        'investor_investment_found' => true
                    ]
                ], 404);
            }

            // Calculate current week: find which week's date window contains today
            $investmentStartDate = \Carbon\Carbon::parse($investorInvestment->date);
            $today = \Carbon\Carbon::today();
            // Each week's date = investment_date + week_number weeks
            // So current week = floor(days since investment_date / 7) + 1, minimum 1
            $daysSinceStart = $investmentStartDate->diffInDays($today);
            $currentWeek = (int) floor($daysSinceStart / 7) + 1;
            $currentWeek = max(1, min($currentWeek, $totalSchedules));

            return response()->json([
                'success' => true,
                'message' => 'Weekly schedules retrieved successfully',
                'data' => [
                    'investment_unique_id' => $investorInvestment->unique_id,
                    'investment_date'      => $investorInvestment->date,
                    'total_schedules'      => $totalSchedules,
                    'current_week'         => $currentWeek,
                    'weekly_schedules' => $weeklySchedules->map(function ($schedule) use ($currentWeek) {
                        return [
                            'id'                        => $schedule->id,
                            'week_number'               => $schedule->week_number,
                            'is_current_week'           => $schedule->week_number === $currentWeek,
                            'is_past'                   => $schedule->week_number < $currentWeek,
                            'is_future'                 => $schedule->week_number > $currentWeek,
                            'date'                      => $schedule->date->format('Y-m-d'),
                            'self_bonus'                => round($schedule->self_bonus),
                            'referral_bonus'            => round($schedule->referral_bonus),
                            'total_earning'             => round($schedule->total_earning),
                            'redemption_value'          => round($schedule->redemption_value),
                            'redeem'                    => round($schedule->redeem),
                            'closing_balance'           => round($schedule->closing_balance),
                            'redemption_status'         => $schedule->redemption_status ?? 'not_redeemed',
                            'total_redeemed'            => round($schedule->total_redeemed ?? 0),
                            'available_for_redemption'  => round(($schedule->total_earning ?? 0) - ($schedule->total_redeemed ?? 0)),
                            'redemptions_count'         => $schedule->redemptions->count(),
                            'latest_redemption'         => $schedule->redemptions->first() ? [
                                'unique_id' => $schedule->redemptions->first()->unique_id,
                                'amount'    => round($schedule->redemptions->first()->redemption_amount),
                                'status'    => $schedule->redemptions->first()->status,
                                'date'      => $schedule->redemptions->first()->redemption_date->format('Y-m-d')
                            ] : null
                        ];
                    })
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching weekly schedules from table: ' . $e->getMessage(), [
                'investment_id' => $investmentId,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve weekly schedules',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process referral bonus for new investment
     */
    private function processReferralBonus($investment)
    {
        try {
            // Get the investor who made this investment
            $investor = \App\Models\Investor\BasicInformation::where('unique_id', $investment->investor_unique_id)->first();
            
            if (!$investor || $investor->referral_type !== 'Referral' || !$investor->referral_id) {
                Log::info('No referral bonus applicable', [
                    'investment_id' => $investment->unique_id,
                    'investor_id' => $investment->investor_unique_id,
                    'referral_type' => $investor->referral_type ?? 'N/A'
                ]);
                return;
            }

            // Find the referrer (parent)
            $referrer = \App\Models\Investor\BasicInformation::where('unique_id', $investor->referral_id)
                ->orWhere('id', $investor->referral_id)
                ->orWhere('investor_id', $investor->referral_id)
                ->first();

            if (!$referrer) {
                Log::warning('Referrer not found', [
                    'investment_id' => $investment->unique_id,
                    'referral_id' => $investor->referral_id
                ]);
                return;
            }

            // Check if this is the investor's first investment
            $previousInvestments = InvestorInvestment::where('investor_unique_id', $investment->investor_unique_id)
                ->where('id', '!=', $investment->id)
                ->count();

            if ($previousInvestments > 0) {
                Log::info('Referral bonus only for first investment', [
                    'investment_id' => $investment->unique_id,
                    'previous_investments' => $previousInvestments
                ]);
                return;
            }

            // Calculate referral bonus (100% of investment amount)
            $referralPercentage = 100;
            $referralAmount = $investment->amount;

            // Create referral transaction record
            $referralTransaction = \App\Models\ReferralTransaction::create([
                'referrer_unique_id' => $referrer->unique_id,
                'referee_unique_id' => $investor->unique_id,
                'investment_unique_id' => $investment->unique_id,
                'investment_amount' => $investment->amount,
                'referral_percentage' => $referralPercentage,
                'referral_amount' => $referralAmount,
                'status' => 'credited',
                'credited_at' => now(),
                'remarks' => 'First investment referral bonus for ' . $investor->first_name . ' ' . $investor->last_name
            ]);

            // Update referrer's total referral earnings in both tables
            $referrerInvestment = InvestorInvestment::where('investor_unique_id', $referrer->unique_id)
                ->orderBy('created_at', 'desc')
                ->first();

            if ($referrerInvestment) {
                // Update referral amount earned in investor_investments table
                $currentEarned = $referrerInvestment->referral_amount_earned ?? 0;
                $newTotal = $currentEarned + $referralAmount;
                
                // Update referral history
                $currentHistory = $referrerInvestment->referral_history ?? [];
                $currentHistory[] = [
                    'transaction_id' => $referralTransaction->unique_id,
                    'from_investor' => $investor->unique_id,
                    'from_name' => $investor->first_name . ' ' . $investor->last_name,
                    'investment_id' => $investment->unique_id,
                    'amount' => $referralAmount,
                    'date' => now()->toDateString(),
                    'percentage' => $referralPercentage
                ];

                $referrerInvestment->update([
                    'referral_amount_earned' => $newTotal,
                    'referral_history' => $currentHistory
                ]);
            }

            // Update total referral bonus in investor_basic_information table
            $currentTotalBonus = $referrer->total_referral_bonus ?? 0;
            $referrer->update([
                'total_referral_bonus' => $currentTotalBonus + $referralAmount
            ]);

            Log::info('Referral bonus processed successfully', [
                'referral_transaction_id' => $referralTransaction->unique_id,
                'referrer' => $referrer->unique_id,
                'referee' => $investor->unique_id,
                'amount' => $referralAmount
            ]);

        } catch (\Exception $e) {
            Log::error('Error processing referral bonus: ' . $e->getMessage(), [
                'investment_id' => $investment->unique_id,
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Get referral earnings for an investor
     */
    public function getReferralEarnings($investorUniqueId)
    {
        try {
            // Get investor's latest investment to check referral earnings
            $investment = InvestorInvestment::where('investor_unique_id', $investorUniqueId)
                ->orderBy('created_at', 'desc')
                ->first();

            if (!$investment) {
                return response()->json([
                    'success' => false,
                    'message' => 'No investments found for this investor'
                ], 404);
            }

            // Get all referral transactions where this investor is the referrer
            $referralTransactions = \App\Models\ReferralTransaction::with(['referee', 'investment'])
                ->where('referrer_unique_id', $investorUniqueId)
                ->orderBy('created_at', 'desc')
                ->get();

            $totalEarned = $referralTransactions->sum('referral_amount');

            // Get current available referral bonus from investor_basic_information
            $investor = \App\Models\Investor\BasicInformation::where('unique_id', $investorUniqueId)->first();
            $availableBonus = $investor ? $investor->total_referral_bonus : 0;

            return response()->json([
                'success' => true,
                'data' => [
                    'investor_unique_id' => $investorUniqueId,
                    'total_referral_earned' => round($totalEarned, 2),
                    'available_referral_bonus' => round($availableBonus, 2),
                    'total_transactions' => $referralTransactions->count(),
                    'referral_history' => $referralTransactions->map(function($transaction) {
                        return [
                            'transaction_id' => $transaction->unique_id,
                            'referee_name' => $transaction->referee ? $transaction->referee->first_name . ' ' . $transaction->referee->last_name : 'N/A',
                            'referee_unique_id' => $transaction->referee_unique_id,
                            'investment_amount' => round($transaction->investment_amount, 2),
                            'referral_percentage' => $transaction->referral_percentage,
                            'referral_amount' => round($transaction->referral_amount, 2),
                            'status' => $transaction->status,
                            'date' => $transaction->created_at->format('Y-m-d'),
                            'remarks' => $transaction->remarks
                        ];
                    })
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching referral earnings: ' . $e->getMessage(), [
                'investor_unique_id' => $investorUniqueId
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve referral earnings'
            ], 500);
        }
    }

    /**
     * Get available referral bonus for investment
     */
    public function getAvailableReferralBonus($investorUniqueId)
    {
        try {
            $investor = \App\Models\Investor\BasicInformation::where('unique_id', $investorUniqueId)->first();
            
            if (!$investor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Investor not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'investor_unique_id' => $investorUniqueId,
                    'investor_name' => trim($investor->first_name . ' ' . $investor->last_name),
                    'available_referral_bonus' => round($investor->total_referral_bonus, 2),
                    'can_use_bonus' => $investor->total_referral_bonus > 0
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching available referral bonus: ' . $e->getMessage(), [
                'investor_unique_id' => $investorUniqueId
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve available referral bonus'
            ], 500);
        }
    }
}
