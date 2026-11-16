<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\Loan\LoanCustomer;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class CustomerReportController extends Controller
{
    /**
     * Customer Report - Filterable and searchable list of customers
     */
    public function index(Request $request)
    {
        try {
            $user = auth()->user();
            $query = LoanCustomer::query();

            // Branch filtering based on user permissions
            $branchId = $user->branch;
            if ($user->role !== 'super_admin' && !empty($branchId)) {
                $query->where('branch_id', $branchId);
            }

            // Filtering by branch_id if provided in request (for super admins)
            if ($request->filled('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }

            // Date filtering (registration date)
            if ($request->filled('start_date') && $request->filled('end_date')) {
                $query->whereBetween('created_at', [
                    Carbon::parse($request->start_date)->startOfDay(),
                    Carbon::parse($request->end_date)->endOfDay()
                ]);
            }

            // Status filtering
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Verification status filtering
            if ($request->filled('verification_status')) {
                $query->where('verification_status', $request->verification_status);
            }

            // Multipurpose Search (Name, Email, ID, Adhaar, Pan, Mobile)
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('customer_unique_id', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('adhaar_number', 'like', "%{$search}%")
                        ->orWhere('pan_number', 'like', "%{$search}%")
                        ->orWhere('contact_number_1', 'like', "%{$search}%");
                });
            }

            $perPage = $request->get('per_page', 15);
            $customers = $query->latest()->paginate($perPage);

            return response()->json([
                'success' => true,
                'message' => 'Customer report generated successfully',
                'data' => $customers
            ]);
        } catch (\Exception $e) {
            Log::error('Customer Report Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate customer report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Detailed Report for a single customer
     */
    public function show($id)
    {
        try {
            // Find by ID or Customer Unique ID
            $customer = LoanCustomer::where('id', $id)
                ->orWhere('customer_unique_id', $id)
                ->firstOrFail();

            // Load related data if needed
            // $customer->load(['loans', 'cafs']);

            return response()->json([
                'success' => true,
                'data' => $customer
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found'
            ], 404);
        }
    }
}
