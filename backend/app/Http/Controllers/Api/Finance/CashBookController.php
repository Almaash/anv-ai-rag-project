<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use App\Models\Finance\CashBook;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class CashBookController extends Controller
{
    /**
     * Return today's cash book entry.
     * If it doesn't exist yet, return a prefilled object with opening_balance
     * taken from the previous day's closing_balance (auto-fill on login).
     */
    public function today(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            // User can send a specific date, otherwise defaults to today
            $date = $request->get('date', Carbon::today()->toDateString());

            // Filter by branch and cms_admin_id to ensure private data scoping
            $entry = CashBook::whereDate('date', $date)
                ->where('branch', $user->branch)
                ->first();

            if ($entry) {
                return response()->json(['success' => true, 'data' => $entry, 'exists' => true]);
            }

            // Find the most recent previous entry before the requested date for this branch
            $previous = CashBook::where('date', '<', $date)
                ->where('branch', $user->branch)
                ->orderBy('date', 'desc')
                ->first();

            $openingBalance = $previous ? (float) $previous->closing_balance : 0.00;

            return response()->json([
                'success' => true,
                'exists'  => false,
                'data'    => [
                    'date'            => $date,
                    'opening_balance' => $openingBalance,
                    'cash_in'         => 0,
                    'cash_out'        => 0,
                    'closing_balance' => $openingBalance,
                    'payment_mode'    => null,
                    'description'     => null,
                    'note'            => null,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('CashBook today error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to load today\'s cash book'], 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            $query = CashBook::with('creator')
                ->where('branch', $user->branch) // Scoping results to the user's branch
                ->when($request->from_date, fn($q) => $q->whereDate('date', '>=', $request->from_date))
                ->when($request->to_date, fn($q) => $q->whereDate('date', '<=', $request->to_date))
                ->orderBy('date', 'desc');

            $perPage = $request->per_page ?? 15;
            $data = $query->paginate($perPage);

            return response()->json(['success' => true, 'data' => $data]);
        } catch (\Exception $e) {
            Log::error('CashBook index error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to retrieve cash book entries'], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
            }
            
            // Check if an entry already exists for the given date and branch
            $userBranch = $request->branch ?? $user->branch;
            $existing = CashBook::whereDate('date', $request->date)
                ->where('branch', $userBranch)
                ->exists();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'An entry for this date already exists. You can only add one cash book entry per day.'
                ], 422);
            }

            $validated = $request->validate([
                'date'            => 'required|date',
                'opening_balance' => 'required|numeric|min:0',
                'cash_in'         => 'required|numeric|min:0',
                'cash_out'        => 'required|numeric|min:0',
                'payment_mode'    => 'nullable|string|max:50',
                'description'     => 'nullable|string|max:500',
                'note'            => 'nullable|string',
                'branch'          => 'nullable|string',
                'cms_admin_id'    => 'nullable|string',
                'user_id'         => 'nullable|string',
            ]);

            // Prefer data from request (sent from frontend) but fallback to Auth user
            $validated['created_by'] = $request->user_id ?? $user->user_id; 
            $validated['branch'] = $request->branch ?? $user->branch;
            $validated['cms_admin_id'] = $request->cms_admin_id ?? $user->cms_admin; 

            $entry = CashBook::create($validated);
            $entry->load('creator');

            return response()->json(['success' => true, 'message' => 'Cash book entry created', 'data' => $entry], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('CashBook store error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to create cash book entry'], 500);
        }
    }

    public function show($id): JsonResponse
    {
        $entry = CashBook::with('creator')
            ->where(fn($q) => $q->where('id', $id)->orWhere('cash_book_id', $id))
            ->first();

        if (!$entry) {
            return response()->json(['success' => false, 'message' => 'Entry not found'], 404);
        }

        return response()->json(['success' => true, 'data' => $entry]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $entry = CashBook::find($id);

            if (!$entry) {
                return response()->json(['success' => false, 'message' => 'Entry not found'], 404);
            }

            $validated = $request->validate([
                'opening_balance' => 'sometimes|numeric|min:0',
                'cash_in'         => 'sometimes|numeric|min:0',
                'cash_out'        => 'sometimes|numeric|min:0',
                'payment_mode'    => 'nullable|string|max:50',
                'description'     => 'nullable|string|max:500',
                'note'            => 'nullable|string',
            ]);

            $entry->update($validated);

            return response()->json(['success' => true, 'message' => 'Cash book entry updated', 'data' => $entry]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('CashBook update error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to update cash book entry'], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $entry = CashBook::find($id);

            if (!$entry) {
                return response()->json(['success' => false, 'message' => 'Entry not found'], 404);
            }

            $entry->delete();

            return response()->json(['success' => true, 'message' => 'Cash book entry deleted']);
        } catch (\Exception $e) {
            Log::error('CashBook destroy error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to delete cash book entry'], 500);
        }
    }
}
