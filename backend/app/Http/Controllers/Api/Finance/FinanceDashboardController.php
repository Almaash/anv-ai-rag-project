<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use App\Models\Finance\FinanceTransaction;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class FinanceDashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = FinanceTransaction::query();

            $totalCredit = (clone $query)->where('transaction_type', 'credit')->sum('amount');
            $totalDebit  = (clone $query)->where('transaction_type', 'debit')->sum('amount');
            $netBalance  = (float) $totalCredit - (float) $totalDebit;

            $stats = [
                'total_credit'       => (float) $totalCredit,
                'total_debit'        => (float) $totalDebit,
                'net_balance'        => $netBalance,
                'total_transactions' => (clone $query)->count(),
            ];

            // Monthly summary for last 6 months
            $monthlySummary = [];
            for ($i = 5; $i >= 0; $i--) {
                $date = Carbon::now()->subMonths($i);
                $monthQuery = (clone $query)
                    ->whereMonth('transaction_date', $date->month)
                    ->whereYear('transaction_date', $date->year);

                $monthlySummary[] = [
                    'month'  => $date->format('M Y'),
                    'credit' => (float) (clone $monthQuery)->where('transaction_type', 'credit')->sum('amount'),
                    'debit'  => (float) (clone $monthQuery)->where('transaction_type', 'debit')->sum('amount'),
                ];
            }

            $recentTransactions = (clone $query)
                ->with('creator:id,name')
                ->latest('transaction_date')
                ->limit(10)
                ->get();

            return response()->json([
                'success' => true,
                'data'    => [
                    'stats'               => $stats,
                    'monthly_summary'     => $monthlySummary,
                    'recent_transactions' => $recentTransactions,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Finance dashboard error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to load dashboard'], 500);
        }
    }
}
