<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Investor\BasicInformationRequest;
use App\Models\Investor\BasicInformation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BasicInformationController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = BasicInformation::query()->latest();

            if ($search = $request->get('search')) {
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('mobile', 'like', "%{$search}%")
                        ->orWhere('pan_number', 'like', "%{$search}%");
                });
            }

            if ($request->filled('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }

            if ($request->filled('cms_admin_id')) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            if ($request->filled('unique_id')) {
                $query->where('unique_id', $request->unique_id);
            }

            $perPage = (int) ($request->get('per_page', 10));
            $data = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $data->items(),
                'pagination' => [
                    'current_page' => $data->currentPage(),
                    'per_page' => $data->perPage(),
                    'total' => $data->total(),
                    'last_page' => $data->lastPage(),
                    'from' => $data->firstItem(),
                    'to' => $data->lastItem(),
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in BasicInformationController@index: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Database error',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }

    public function show(string $id)
    {
        $info = BasicInformation::where('unique_id', $id)
            ->orWhere('id', $id)
            ->first();

        if (! $info) {
            return response()->json([
                'success' => false,
                'message' => 'Record not found',
            ], 404);
        }

        // Get referral details if referral_id exists
        $referralDetails = null;
        if ($info->referral_id) {
            $referralDetails = BasicInformation::where('unique_id', $info->referral_id)
                ->orWhere('id', $info->referral_id)
                ->orWhere('investor_id', $info->referral_id)
                ->first();
        }

        // Count referrals - people who have this investor's unique_id as their referral_id
        $referralCount = BasicInformation::where('referral_id', $info->unique_id)
            ->count();

        // Get all referral transactions where this investor is the referrer (earning bonuses)
        $referralEarnings = \App\Models\ReferralTransaction::with(['referee', 'investment'])
            ->where('referrer_unique_id', $info->unique_id)
            ->orderBy('created_at', 'desc')
            ->get();

        // Get all investments made by this investor to see referral bonus usage
        $investments = \App\Models\InvestorInvestment::where('investor_unique_id', $info->unique_id)
            ->orderBy('created_at', 'desc')
            ->get();

        // Calculate referral bonus statistics
        $totalReferralEarned = $referralEarnings->sum('referral_amount');
        $totalReferralUsed = $investments->sum('used_referral_bonus');
        $currentAvailableBonus = $info->total_referral_bonus ?? 0;

        $responseData = $info->toArray();
        $responseData['total_referrals'] = $referralCount;
        
        // Add comprehensive referral bonus information
        $responseData['referral_bonus_summary'] = [
            'total_earned' => round($totalReferralEarned, 2),
            'total_used' => round($totalReferralUsed, 2),
            'current_available' => round($currentAvailableBonus, 2),
            'total_transactions' => $referralEarnings->count(),
            'total_investments_with_bonus' => $investments->where('used_referral_bonus', '>', 0)->count()
        ];

        // Weekly schedule data per investment (current week aware)
        $today = \Carbon\Carbon::today();
        $responseData['investments'] = $investments->map(function ($inv) use ($today) {
            $schedules   = \App\Models\InvestmentWeeklySchedule::where('investment_unique_id', $inv->unique_id)
                ->orderBy('week_number')
                ->get();
            $totalWeeks  = $schedules->count();
            $startDate   = \Carbon\Carbon::parse($inv->date);
            $currentWeek = max(1, (int) floor($startDate->diffInDays($today) / 7) + 1);
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
                    'week_number'       => $currentSchedule->week_number,
                    'date'              => \Carbon\Carbon::parse($currentSchedule->date)->format('Y-m-d'),
                    'self_bonus'        => round($currentSchedule->self_bonus),
                    'referral_bonus'    => round($currentSchedule->referral_bonus),
                    'total_earning'     => round($currentSchedule->total_earning),
                    'redemption_value'  => round($currentSchedule->redemption_value),
                    'closing_balance'   => round($currentSchedule->closing_balance),
                    'redemption_status' => $currentSchedule->redemption_status ?? 'not_redeemed',
                ] : null,
            ];
        })->values();

        // Add detailed referral earnings history
        $responseData['referral_earnings_history'] = $referralEarnings->map(function($transaction) {
            return [
                'transaction_id' => $transaction->unique_id,
                'date' => $transaction->created_at->format('Y-m-d H:i:s'),
                'referee_name' => $transaction->referee ? trim($transaction->referee->first_name . ' ' . $transaction->referee->last_name) : 'N/A',
                'referee_unique_id' => $transaction->referee_unique_id,
                'investment_unique_id' => $transaction->investment_unique_id,
                'investment_amount' => round($transaction->investment_amount, 2),
                'referral_percentage' => $transaction->referral_percentage,
                'referral_amount_earned' => round($transaction->referral_amount, 2),
                'status' => $transaction->status,
                'remarks' => $transaction->remarks
            ];
        });

        // Add referral bonus usage history
        $responseData['referral_bonus_usage_history'] = $investments->where('used_referral_bonus', '>', 0)->map(function($investment) {
            return [
                'investment_id' => $investment->unique_id,
                'investment_date' => $investment->date,
                'self_amount' => round($investment->self_amount ?? $investment->amount, 2),
                'referral_amount_used' => round($investment->used_referral_bonus, 2),
                'total_investment_amount' => round($investment->total_amount, 2),
                'created_at' => $investment->created_at->format('Y-m-d H:i:s')
            ];
        })->values();

        // Add people referred by this investor (ONLY those who have this investor's unique_id as their referral_id)
        $referredPeople = BasicInformation::where('referral_id', $info->unique_id)
            ->where('unique_id', '!=', $info->unique_id) // Exclude self
            ->get();

        $responseData['referred_investors'] = $referredPeople->map(function($person) use ($info) {
            // Get their first investment (which triggered referral bonus)
            $firstInvestment = \App\Models\InvestorInvestment::where('investor_unique_id', $person->unique_id)
                ->orderBy('created_at', 'asc')
                ->first();

            // Get the actual referral transaction to find the correct bonus amount
            $referralTransaction = null;
            $bonusEarned = 0;
            
            if ($firstInvestment) {
                $referralTransaction = \App\Models\ReferralTransaction::where('referrer_unique_id', $info->unique_id)
                    ->where('referee_unique_id', $person->unique_id)
                    ->where('investment_unique_id', $firstInvestment->unique_id)
                    ->first();
                
                if ($referralTransaction) {
                    $bonusEarned = $referralTransaction->referral_amount;
                }
            }

            return [
                'unique_id' => $person->unique_id,
                'name' => trim($person->first_name . ' ' . $person->last_name),
                'email' => $person->email,
                'mobile' => $person->mobile,
                'enrollment_date' => $person->enrollment_date,
                'referral_id' => $person->referral_id, // Show what referral_id they have
                'first_investment' => $firstInvestment ? [
                    'investment_id' => $firstInvestment->unique_id,
                    'amount' => round($firstInvestment->amount, 2),
                    'date' => $firstInvestment->date,
                    'bonus_earned_from_this' => round($bonusEarned, 2)
                ] : null
            ];
        });
        
        if ($referralDetails) {
            $responseData['referral_details'] = [
                'id' => $referralDetails->id,
                'unique_id' => $referralDetails->unique_id,
                'investor_id' => $referralDetails->investor_id,
                'full_name' => trim($referralDetails->first_name . ' ' . $referralDetails->last_name),
                'first_name' => $referralDetails->first_name,
                'last_name' => $referralDetails->last_name,
                'email' => $referralDetails->email,
                'mobile' => $referralDetails->mobile,
                'pan_number' => $referralDetails->pan_number,
                'enrollment_date' => $referralDetails->enrollment_date,
                'total_referral_bonus' => round($referralDetails->total_referral_bonus ?? 0),
                'profile_photo' => $referralDetails->profile_photo ? asset($referralDetails->profile_photo) : null,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $responseData,
        ]);
    }

    /**
     * Check if investor exists and get basic info
     */
    public function checkInvestor(Request $request, string $id = null)
    {
        // Handle both route parameter and query parameter
        $searchId = $id ?? $request->get('id');
        
        if (!$searchId) {
            return response()->json([
                'success' => false,
                'message' => 'No ID provided',
                'available' => false,
                'data' => null
            ], 400);
        }

        // URL decode the ID to handle forward slashes
        $searchId = urldecode($searchId);
        
        // Debug: Get all unique_ids to compare
        $allUniqueIds = BasicInformation::pluck('unique_id')->toArray();
        
        $info = BasicInformation::where('unique_id', $searchId)
            ->orWhere('id', $searchId)
            ->orWhere('investor_id', $searchId)
            ->first();

        if (! $info) {
            return response()->json([
                'success' => false,
                'message' => 'Investor not found',
                'available' => false,
                'data' => null,
                'debug' => [
                    'searched_for' => $searchId,
                    'search_length' => strlen($searchId),
                    'all_unique_ids' => $allUniqueIds,
                    'exact_match_test' => in_array($searchId, $allUniqueIds)
                ]
            ], 404);
        }

        // Count referrals - people who have this investor's unique_id as their referral_id
        $referralCount = BasicInformation::where('referral_id', $info->unique_id)
            ->orWhere('referral_id', $info->id)
            ->orWhere('referral_id', $info->investor_id)
            ->count();

        return response()->json([
            'success' => true,
            'message' => 'Investor found',
            'available' => true,
            'data' => [
                'id' => $info->id,
                'unique_id' => $info->unique_id,
                'investor_id' => $info->investor_id,
                'full_name' => trim($info->first_name . ' ' . $info->last_name),
                'first_name' => $info->first_name,
                'last_name' => $info->last_name,
                'email' => $info->email,
                'mobile' => $info->mobile,
                'pan_number' => $info->pan_number,
                'enrollment_date' => $info->enrollment_date,
                'referral_type' => $info->referral_type,
                'referral_id' => $info->referral_id,
                'total_referral_bonus' => round($info->total_referral_bonus ?? 0),
                'profile_photo' => $info->profile_photo ? asset($info->profile_photo) : null,
                'total_referrals' => $referralCount
            ]
        ]);
    }

    /**
     * Check if investor exists and get basic info (POST version to handle special characters)
     */
    public function checkInvestorPost(Request $request)
    {
        $searchId = $request->input('id');
        
        if (!$searchId) {
            return response()->json([
                'success' => false,
                'message' => 'No ID provided',
                'available' => false,
                'data' => null
            ], 400);
        }
        
        // Debug: Get all unique_ids to compare
        $allUniqueIds = BasicInformation::pluck('unique_id')->toArray();
        
        $info = BasicInformation::where('unique_id', $searchId)
            ->orWhere('id', $searchId)
            ->orWhere('investor_id', $searchId)
            ->first();

        if (! $info) {
            return response()->json([
                'success' => false,
                'message' => 'Investor not found',
                'available' => false,
                'data' => null,
                'debug' => [
                    'searched_for' => $searchId,
                    'search_length' => strlen($searchId),
                    'all_unique_ids' => $allUniqueIds,
                    'exact_match_test' => in_array($searchId, $allUniqueIds)
                ]
            ], 404);
        }

        // Count referrals - people who have this investor's unique_id as their referral_id
        $referralCount = BasicInformation::where('referral_id', $info->unique_id)
            ->orWhere('referral_id', $info->id)
            ->orWhere('referral_id', $info->investor_id)
            ->count();

        return response()->json([
            'success' => true,
            'message' => 'Investor found',
            'available' => true,
            'data' => [
                'id' => $info->id,
                'unique_id' => $info->unique_id,
                'investor_id' => $info->investor_id,
                'full_name' => trim($info->first_name . ' ' . $info->last_name),
                'first_name' => $info->first_name,
                'last_name' => $info->last_name,
                'email' => $info->email,
                'mobile' => $info->mobile,
                'pan_number' => $info->pan_number,
                'enrollment_date' => $info->enrollment_date,
                'referral_type' => $info->referral_type,
                'referral_id' => $info->referral_id,
                'total_referral_bonus' => round($info->total_referral_bonus ?? 0),
                'profile_photo' => $info->profile_photo ? asset($info->profile_photo) : null,
                'total_referrals' => $referralCount
            ]
        ]);
    }

   public function store(BasicInformationRequest $request)
{
    try {
        $payload = $request->validated();
        
        // Handle File Uploads
        $payload['profile_photo'] = $this->handleUpload($request, 'profile_photo', 'investors/profile_photos');
        $payload['pan_card_doc'] = $this->handleUpload($request, 'pan_card_doc', 'investors/documents');
        $payload['aadhaar_card_doc'] = $this->handleUpload($request, 'aadhaar_card_doc', 'investors/documents');
        $payload['passbook_doc'] = $this->handleUpload($request, 'passbook_doc', 'investors/documents');
        $payload['voter_id_doc'] = $this->handleUpload($request, 'voter_id_doc', 'investors/documents');

        // =========================
        // 🔥 CUSTOM UNIQUE ID LOGIC
        // =========================

        // Step 1: First 4 letters of first name (safe + uppercase)
        $firstName = preg_replace('/[^A-Za-z]/', '', $payload['first_name']); 
        $prefixName = strtoupper(substr($firstName, 0, 4));

        // Step 2: Fixed middle part
        $middle = 'ANV/INS';

        // Step 3: Get last record with same prefix for sequencing
        $lastRecord = BasicInformation::where('unique_id', 'like', $prefixName . '/' . $middle . '/%')
            ->orderBy('unique_id', 'desc')
            ->first();
        $nextNumber = 1;

        if ($lastRecord && $lastRecord->unique_id) {
            $parts = explode('/', $lastRecord->unique_id);
            if (count($parts) === 4) {
                $nextNumber = (int) $parts[3] + 1;
            }
        }

        // Step 4: Generate unique ID and ensure it doesn't exist
        do {
            $uniqueId = $prefixName . '/' . $middle . '/' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
            $exists = BasicInformation::where('unique_id', $uniqueId)->exists();
            if ($exists) {
                $nextNumber++;
            }
        } while ($exists);

        $payload['unique_id'] = $uniqueId;
        $payload['branch_id'] = $request->input('branch_id') ?? null;
        $payload['cms_admin_id'] = $request->input('cms_admin_id') ?? null;

        if (!empty($payload['password'])) {
            $payload['unhashed_password'] = $payload['password'];
            $payload['password'] = bcrypt($payload['password']);
        }

        $info = BasicInformation::create($payload);

        return response()->json([
            'success' => true,
            'message' => 'Basic information created successfully',
            'data' => $info,
        ], 201);
    } catch (\Exception $e) {
        \Log::error('Error in BasicInformationController@store: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Database error',
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
}

    public function update(BasicInformationRequest $request, string $id)
    {
        $info = BasicInformation::where('unique_id', $id)
            ->orWhere('id', $id)
            ->first();

        if (! $info) {
            return response()->json([
                'success' => false,
                'message' => 'Record not found',
            ], 404);
        }

        $payload = $request->validated();

        $files = [
            'profile_photo' => 'investors/profile_photos',
            'pan_card_doc' => 'investors/documents',
            'aadhaar_card_doc' => 'investors/documents',
            'passbook_doc' => 'investors/documents',
            'voter_id_doc' => 'investors/documents',
        ];

        foreach ($files as $field => $path) {
            if ($request->hasFile($field)) {
                if ($info->$field && file_exists(public_path($info->$field))) {
                    unlink(public_path($info->$field));
                }
                $payload[$field] = $this->handleUpload($request, $field, $path);
            }
        }

        $info->update($payload);

        return response()->json([
            'success' => true,
            'message' => 'Basic information updated successfully',
            'data' => $info,
        ]);
    }

    public function destroy(string $id)
    {
        $info = BasicInformation::where('unique_id', $id)
            ->orWhere('id', $id)
            ->first();

        if (! $info) {
            return response()->json([
                'success' => false,
                'message' => 'Record not found',
            ], 404);
        }

        // Soft delete all related weekly schedules and investments
        $investments = \App\Models\InvestorInvestment::where('investor_unique_id', $info->unique_id)->get();
        foreach ($investments as $investment) {
            $investment->investment_weekly_schedules()->delete();
            $investment->delete();
        }

        $info->delete();

        return response()->json([
            'success' => true,
            'message' => 'Investor deleted successfully',
        ]);
    }

    private function handleUpload(Request $request, string $field, string $path): ?string
    {
        if (! $request->hasFile($field)) {
            return null;
        }

        $file = $request->file($field);
        $fileName = time() . '_' . $file->getClientOriginalName();
        $fullPath = public_path($path);
        
        if (!file_exists($fullPath)) {
            mkdir($fullPath, 0777, true);
        }
        
        $file->move($fullPath, $fileName);

        return $path . '/' . $fileName;
    }
}