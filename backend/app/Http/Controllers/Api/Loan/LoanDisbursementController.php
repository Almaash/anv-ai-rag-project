<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\Loan\LoanDisbursement;
use App\Models\LoanApplication;
use App\Models\Loan\CreditApplicationForm;
use App\Models\Loan\CAM;
use App\Models\Loan\PdInformation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LoanDisbursementController extends Controller
{
    public function disburseLoan(Request $request)
    {
        try {
            $request->validate([
                'loan_application_id' => 'required|string|exists:loan_applications,loan_application_id',
                'branch_id'           => 'nullable|string',
                'cms_admin_id'        => 'nullable|string',
                'customer_unique_id'  => 'nullable|string',
                'pd_application_id'   => 'nullable|string',
                'cam_unique_id'       => 'nullable|string',
                'date_of_disbursement' => 'nullable|date',
                'booking_date'        => 'nullable|date',
                'disbursement_status' => 'nullable|string',
            ]);

            $loanApplication = LoanApplication::where('loan_application_id', $request->loan_application_id)->firstOrFail();

            $existingDisbursement = LoanDisbursement::where('loan_application_id', $request->loan_application_id)
                ->where('is_disbursed', 1)
                ->first();

            if ($existingDisbursement) {
                return response()->json([
                    'success' => false,
                    'message' => 'Loan amount already disbursed'
                ], 400);
            }

            $disbursement = LoanDisbursement::create([
                'loan_application_id'  => $request->loan_application_id,
                'branch_id'            => $request->branch_id ?? $loanApplication->branch_id,
                'cms_admin_id'         => $request->cms_admin_id ?? $loanApplication->cms_admin_id,
                'customer_unique_id'   => $request->customer_unique_id ?? $loanApplication->customer_unique_id,
                'pd_application_id'    => $request->pd_application_id,
                'cam_unique_id'        => $request->cam_unique_id,
                'date_of_disbursement' => $request->date_of_disbursement,
                'booking_date'         => $request->booking_date,
                'disbursement_status'  => $request->disbursement_status ?? 'pending',
            ]);

            $loanApplication->update(['is_disbursed' => true]);

            CreditApplicationForm::where('loan_application_id', $request->loan_application_id)
                ->update(['is_disbursement_created' => true]);

            CAM::where('loan_application_id', $request->loan_application_id)
                ->update(['is_disbursement_created' => true]);

            return response()->json([
                'success' => true,
                'message' => 'Disbursement created successfully',
                'data'    => $disbursement
            ]);
        } catch (\Exception $e) {
            Log::error('Loan Disbursement Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Internal server error',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    public function getAllDisbursements(Request $request)
    {
        $userRole = str_replace(' ', '_', strtolower($request->user()->role));
        // if (!in_array($userRole, ['admin', 'loan_admin','loan_verify_application','loan_disbursement'])) {
        //     return response()->json([
        //         'success' => false, 
        //         'message' => 'Unauthorized'
        //     ], 403);
        // }

        $query = LoanDisbursement::with(['loanApplication', 'user', 'disbursedBy']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('disbursement_id', 'LIKE', "%{$search}%")
                    ->orWhere('loan_application_id', 'LIKE', "%{$search}%")
                    ->orWhere('transaction_reference', 'LIKE', "%{$search}%")
                    ->orWhere('cheque_number', 'LIKE', "%{$search}%");
            });
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }
        if ($request->filled('cms_admin_id')) {
            $query->where('cms_admin_id', $request->cms_admin_id);
        }

        if ($request->filled('status')) {
            $query->where('disbursement_status', $request->status);
        }

        if ($request->filled('method')) {
            $query->where('disbursement_method', $request->method);
        }

        if ($request->filled('from_date') && $request->filled('to_date')) {
            $query->whereBetween('disbursement_date', [$request->from_date, $request->to_date]);
        }

        $disbursements = $query->orderBy('created_at', 'desc')->paginate(50);

        return response()->json([
            'success' => true,
            'data' => $disbursements
        ]);
    }

    public function getAllDisbursementsWithDates(Request $request)
    {
        try {
            $query = LoanDisbursement::with([
                'loanApplication',
                'customer',
                'pdInformation',
                'cam',
                'disbursedBy'
            ])
                ->whereNotNull('date_of_disbursement')
                ->whereNotNull('booking_date')
                ->whereNull('dfa_document')
                ->whereNull('cfa_document')
                ->whereNull('dpn_document')
                ->whereNull('vernacular_document');

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('disbursement_id', 'LIKE', "%{$search}%")
                        ->orWhere('loan_application_id', 'LIKE', "%{$search}%")
                        ->orWhere('customer_unique_id', 'LIKE', "%{$search}%")
                        ->orWhere('transaction_reference', 'LIKE', "%{$search}%");
                });
            }

            // Filter by branch_id
            if ($request->filled('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }

            // Filter by cms_admin_id
            if ($request->filled('cms_admin_id')) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            // Filter by customer_unique_id
            if ($request->filled('customer_unique_id')) {
                $query->where('customer_unique_id', $request->customer_unique_id);
            }

            // Filter by disbursement method
            if ($request->filled('disbursement_method')) {
                $query->where('disbursement_method', $request->disbursement_method);
            }

            // Filter by payment status
            if ($request->filled('payment_status')) {
                $query->where('payment_status', $request->payment_status);
            }

            // Filter by disbursement status
            if ($request->filled('disbursement_status')) {
                $query->where('disbursement_status', $request->disbursement_status);
            }

            // Filter by loan started status
            if ($request->filled('is_loan_started')) {
                $isLoanStarted = $request->is_loan_started;
                if (in_array(strtolower($isLoanStarted), ['true', '1', 'yes'])) {
                    $query->where('is_loan_started', true);
                } elseif (in_array(strtolower($isLoanStarted), ['false', '0', 'no'])) {
                    $query->where('is_loan_started', false);
                }
            }

            // Filter by disbursed amount range
            if ($request->filled('amount_from')) {
                $query->where('disbursed_amount', '>=', $request->amount_from);
            }
            if ($request->filled('amount_to')) {
                $query->where('disbursed_amount', '<=', $request->amount_to);
            }

            // Filter by disbursement date range
            if ($request->filled('date_from')) {
                $query->whereDate('date_of_disbursement', '>=', $request->date_from);
            }
            if ($request->filled('date_to')) {
                $query->whereDate('date_of_disbursement', '<=', $request->date_to);
            }

            // Filter by booking date range
            if ($request->filled('booking_date_from')) {
                $query->whereDate('booking_date', '>=', $request->booking_date_from);
            }
            if ($request->filled('booking_date_to')) {
                $query->whereDate('booking_date', '<=', $request->booking_date_to);
            }

            $disbursements = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $disbursements,
                'filters_applied' => [
                    'search' => $request->search,
                    'branch_id' => $request->branch_id,
                    'cms_admin_id' => $request->cms_admin_id,
                    'customer_unique_id' => $request->customer_unique_id,
                    'disbursement_method' => $request->disbursement_method,
                    'payment_status' => $request->payment_status,
                    'disbursement_status' => $request->disbursement_status,
                    'is_loan_started' => $request->is_loan_started,
                    'amount_from' => $request->amount_from,
                    'amount_to' => $request->amount_to,
                    'date_from' => $request->date_from,
                    'date_to' => $request->date_to,
                    'booking_date_from' => $request->booking_date_from,
                    'booking_date_to' => $request->booking_date_to,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getAllDisbursementsWithDates: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Internal server error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getFinalDisbursements(Request $request)
    {
        $query = LoanDisbursement::with([
            'customer:customer_unique_id,first_name,last_name,contact_number_1',
        ])
            ->select([
                'id',
                'disbursement_id',
                'loan_application_id',
                'customer_unique_id',
                'branch_id',
                'cms_admin_id',
                'pd_application_id',
                'cam_unique_id',
                'payment_status',
                'disbursement_status',
                'is_loan_started',
                'is_disbursed',
                'dfa_document',
                'cfa_document',
                'dpn_document',
                'vernacular_document',
                'date_of_disbursement',
                'booking_date',
                'payment_date',
                'created_at',
                'updated_at'
            ])
            ->where('is_disbursed', 0)
            ->whereNotNull('date_of_disbursement')
            ->whereNotNull('booking_date')
            ->whereNotNull('dfa_document')
            ->whereNotNull('cfa_document')
            ->whereNotNull('dpn_document')
            ->whereNotNull('vernacular_document');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('disbursement_id', 'LIKE', "%{$search}%")
                    ->orWhere('loan_application_id', 'LIKE', "%{$search}%")
                    ->orWhere('customer_unique_id', 'LIKE', "%{$search}%");
            });
        }

        // Filter by branch_id
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        // Filter by cms_admin_id
        if ($request->filled('cms_admin_id')) {
            $query->where('cms_admin_id', $request->cms_admin_id);
        }

        // Filter by customer_unique_id
        if ($request->filled('customer_unique_id')) {
            $query->where('customer_unique_id', $request->customer_unique_id);
        }

        // Filter by payment status
        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        // Filter by disbursement status
        if ($request->filled('disbursement_status')) {
            $query->where('disbursement_status', $request->disbursement_status);
        }

        // Filter by loan started status
        if ($request->filled('is_loan_started')) {
            $isLoanStarted = $request->is_loan_started;
            if (in_array(strtolower($isLoanStarted), ['true', '1', 'yes'])) {
                $query->where('is_loan_started', true);
            } elseif (in_array(strtolower($isLoanStarted), ['false', '0', 'no'])) {
                $query->where('is_loan_started', false);
            }
        }

        // Filter by disbursement date range
        if ($request->filled('date_from')) {
            $query->whereDate('date_of_disbursement', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date_of_disbursement', '<=', $request->date_to);
        }

        // Filter by booking date range
        if ($request->filled('booking_date_from')) {
            $query->whereDate('booking_date', '>=', $request->booking_date_from);
        }
        if ($request->filled('booking_date_to')) {
            $query->whereDate('booking_date', '<=', $request->booking_date_to);
        }

        $data = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $data,
            'filters_applied' => [
                'search' => $request->search,
                'branch_id' => $request->branch_id,
                'cms_admin_id' => $request->cms_admin_id,
                'customer_unique_id' => $request->customer_unique_id,
                'payment_status' => $request->payment_status,
                'disbursement_status' => $request->disbursement_status,
                'is_loan_started' => $request->is_loan_started,
                'date_from' => $request->date_from,
                'date_to' => $request->date_to,
                'booking_date_from' => $request->booking_date_from,
                'booking_date_to' => $request->booking_date_to,
            ]
        ]);
    }

    /**
     * Get all raw data from loan_disbursements table including all columns.
     */
    public function getAllRawDisbursements(Request $request)
    {
        try {
            $query = \App\Models\Loan\LoanDisbursement::with(['customer:customer_unique_id,first_name,last_name,contact_number_1'])
                ->where('is_disbursed', 1)
                ->orderBy('created_at', 'desc');

            // Search functionality
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('loan_application_id', 'LIKE', "%{$search}%")
                        ->orWhere('customer_unique_id', 'LIKE', "%{$search}%")
                        ->orWhere('bank_name', 'LIKE', "%{$search}%")
                        ->orWhere('transaction_reference', 'LIKE', "%{$search}%")
                        ->orWhere('disbursement_id', 'LIKE', "%{$search}%");
                });
            }

            // Filter by loan started status
            if ($request->filled('is_loan_started')) {
                $isLoanStarted = $request->is_loan_started;
                if (in_array(strtolower($isLoanStarted), ['true', '1', 'yes'])) {
                    $query->where('is_loan_started', true);
                } elseif (in_array(strtolower($isLoanStarted), ['false', '0', 'no'])) {
                    $query->where('is_loan_started', false);
                }
            }

            // Filter by branch_id
            if ($request->filled('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }

            // Filter by cms_admin_id
            if ($request->filled('cms_admin_id')) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            // Filter by customer_unique_id
            if ($request->filled('customer_unique_id')) {
                $query->where('customer_unique_id', $request->customer_unique_id);
            }

            // Filter by disbursement method
            if ($request->filled('disbursement_method')) {
                $query->where('disbursement_method', $request->disbursement_method);
            }

            // Filter by payment status
            if ($request->filled('payment_status')) {
                $query->where('payment_status', $request->payment_status);
            }

            // Filter by disbursement status
            if ($request->filled('disbursement_status')) {
                $query->where('disbursement_status', $request->disbursement_status);
            }

            // Filter by disbursed amount range
            if ($request->filled('amount_from')) {
                $query->where('disbursed_amount', '>=', $request->amount_from);
            }
            if ($request->filled('amount_to')) {
                $query->where('disbursed_amount', '<=', $request->amount_to);
            }

            // Filter by date range
            if ($request->filled('date_from')) {
                $query->whereDate('disbursement_date', '>=', $request->date_from);
            }
            if ($request->filled('date_to')) {
                $query->whereDate('disbursement_date', '<=', $request->date_to);
            }

            // Filter by booking date range
            if ($request->filled('booking_date_from')) {
                $query->whereDate('booking_date', '>=', $request->booking_date_from);
            }
            if ($request->filled('booking_date_to')) {
                $query->whereDate('booking_date', '<=', $request->booking_date_to);
            }

            // Pagination
            $perPage = $request->get('per_page', 50);
            $perPage = min($perPage, 100); // Limit max per page to 100

            if ($request->get('paginate', 'true') === 'false') {
                $disbursements = $query->get();
                $paginationData = null;
            } else {
                $paginatedResult = $query->paginate($perPage);
                $disbursements = $paginatedResult->getCollection();
                $paginationData = [
                    'current_page' => $paginatedResult->currentPage(),
                    'per_page' => $paginatedResult->perPage(),
                    'total' => $paginatedResult->total(),
                    'last_page' => $paginatedResult->lastPage(),
                    'from' => $paginatedResult->firstItem(),
                    'to' => $paginatedResult->lastItem(),
                ];
            }

            // Transform data to include loan started status clearly
            $transformedData = $disbursements->map(function ($disbursement) {
                $data = $disbursement->toArray();
                $data['loan_started_status'] = $disbursement->is_loan_started ? 'Yes' : 'No';
                $data['customer_name'] = $disbursement->customer ?
                    trim(($disbursement->customer->first_name ?? '') . ' ' . ($disbursement->customer->last_name ?? '')) : 'N/A';
                return $data;
            });

            // Calculate summary statistics
            $totalDisbursements = $query->count();
            $loanStartedCount = \App\Models\Loan\LoanDisbursement::where('is_disbursed', 1)
                ->where('is_loan_started', true)
                ->count();
            $loanNotStartedCount = \App\Models\Loan\LoanDisbursement::where('is_disbursed', 1)
                ->where('is_loan_started', false)
                ->count();

            $response = [
                'success' => true,
                'message' => 'Raw disbursement data retrieved successfully',
                'data' => $transformedData,
                'summary' => [
                    'total_disbursements' => $totalDisbursements,
                    'loan_started_count' => $loanStartedCount,
                    'loan_not_started_count' => $loanNotStartedCount,
                    'loan_started_percentage' => $totalDisbursements > 0 ? round(($loanStartedCount / $totalDisbursements) * 100, 2) : 0,
                ],
                'filters_applied' => [
                    'search' => $request->search,
                    'is_loan_started' => $request->is_loan_started,
                    'branch_id' => $request->branch_id,
                    'cms_admin_id' => $request->cms_admin_id,
                    'customer_unique_id' => $request->customer_unique_id,
                    'disbursement_method' => $request->disbursement_method,
                    'payment_status' => $request->payment_status,
                    'disbursement_status' => $request->disbursement_status,
                    'amount_from' => $request->amount_from,
                    'amount_to' => $request->amount_to,
                    'date_from' => $request->date_from,
                    'date_to' => $request->date_to,
                    'booking_date_from' => $request->booking_date_from,
                    'booking_date_to' => $request->booking_date_to,
                ]
            ];

            if ($paginationData) {
                $response['pagination'] = $paginationData;
            }

            return response()->json($response);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch raw disbursement data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getDisbursementById($id)
    {
        // Try to find by business disbursement_id first, then by table id
        $disbursement = LoanDisbursement::with([
            'disbursedBy',
            'loanApplication'
        ])
            ->where('disbursement_id', $id)
            ->orWhere('id', $id)
            ->first();

        if (!$disbursement) {
            return response()->json([
                'success' => false,
                'message' => 'Disbursement not found'
            ], 404);
        }
        $productNames = collect(
            $disbursement->loanApplication?->products ?? []
        )
            ->pluck('product_name')
            ->implode(', ');
        return response()->json([
            'success' => true,
            'data' => [
                ...$disbursement->toArray(),
                'product' => $productNames,
            ]
        ]);
    }

    public function getDisbursementsByLoanApplication($loanApplicationId)
    {
        $disbursements = LoanDisbursement::with(['loanApplication', 'user', 'disbursedBy'])
            ->where('loan_application_id', $loanApplicationId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $disbursements
        ]);
    }

    public function getDisbursementDetails($id)
    {
        $disbursement = LoanDisbursement::with([
            'loanApplication',
            'customer'
        ])
            ->where('id', $id)
            ->first();

        if (!$disbursement) {
            return response()->json([
                'success' => false,
                'message' => 'Disbursement not found'
            ], 404);
        }

        $caf = $disbursement->loanApplication;
        $customer = $disbursement->customer;

        $productName = 'N/A';
        if ($caf && !empty($caf->products)) {
            $products = is_array($caf->products) ? $caf->products : json_decode($caf->products, true);
            if (!empty($products)) {
                $productNames = collect($products)->pluck('product_name')->filter()->implode(', ');
                $productName = $productNames ?: 'N/A';
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $disbursement->id,
                'date_of_disbursement' => $disbursement->date_of_disbursement,
                'member_name' => $customer ? ($customer->first_name . ' ' . $customer->last_name) : 'N/A',
                'cust_id' => $disbursement->customer_unique_id,
                'loan_id' => $disbursement->loan_application_id,
                'product' => $productName,
                'product_type' => $caf->credit_mode ?? 'N/A',
                'loan_amount' => $disbursement->disbursed_amount,
                'bank_name' => $caf->bank_name ?? 'N/A',
                'account_number' => $caf->account_number ?? 'N/A',
                'ifsc' => $caf->ifsc_code ?? 'N/A',
                'payment_date' => $disbursement->payment_date,
                'payment_status' => $disbursement->payment_status,
            ]
        ]);
    }

    public function getFinalDisbursementsForInventory(Request $request)
    {
        try {
            $query = LoanDisbursement::with([
                'loanApplication',
                'customer'
            ])
                ->where('is_disbursed', 0)
                ->whereNotNull('date_of_disbursement')
                ->whereNotNull('booking_date')
                ->whereNotNull('dfa_document')
                ->whereNotNull('cfa_document')
                ->whereNotNull('dpn_document')
                ->whereNotNull('vernacular_document');

            // Apply filters
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('disbursement_id', 'LIKE', "%{$search}%")
                        ->orWhere('loan_application_id', 'LIKE', "%{$search}%")
                        ->orWhere('customer_unique_id', 'LIKE', "%{$search}%")
                        ->orWhere('transaction_reference', 'LIKE', "%{$search}%");
                });
            }

            // Filter by branch_id
            if ($request->filled('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }

            // Filter by cms_admin_id
            if ($request->filled('cms_admin_id')) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            // Filter by customer_unique_id
            if ($request->filled('customer_unique_id')) {
                $query->where('customer_unique_id', $request->customer_unique_id);
            }

            // Filter by disbursement method
            if ($request->filled('disbursement_method')) {
                $query->where('disbursement_method', $request->disbursement_method);
            }

            // Filter by payment status
            if ($request->filled('payment_status')) {
                $query->where('payment_status', $request->payment_status);
            }

            // Filter by disbursement status
            if ($request->filled('disbursement_status')) {
                $query->where('disbursement_status', $request->disbursement_status);
            }

            // Filter by loan started status
            if ($request->filled('is_loan_started')) {
                $isLoanStarted = $request->is_loan_started;
                if (in_array(strtolower($isLoanStarted), ['true', '1', 'yes'])) {
                    $query->where('is_loan_started', true);
                } elseif (in_array(strtolower($isLoanStarted), ['false', '0', 'no'])) {
                    $query->where('is_loan_started', false);
                }
            }

            // Filter by disbursed amount range
            if ($request->filled('amount_from')) {
                $query->where('disbursed_amount', '>=', $request->amount_from);
            }
            if ($request->filled('amount_to')) {
                $query->where('disbursed_amount', '<=', $request->amount_to);
            }

            // Filter by disbursement date range
            if ($request->filled('date_from')) {
                $query->whereDate('date_of_disbursement', '>=', $request->date_from);
            }
            if ($request->filled('date_to')) {
                $query->whereDate('date_of_disbursement', '<=', $request->date_to);
            }

            // Filter by booking date range
            if ($request->filled('booking_date_from')) {
                $query->whereDate('booking_date', '>=', $request->booking_date_from);
            }
            if ($request->filled('booking_date_to')) {
                $query->whereDate('booking_date', '<=', $request->booking_date_to);
            }

            $disbursements = $query->orderBy('created_at', 'desc')->get();

            $formatted = $disbursements->map(function ($d) {
                // Direct fetch to ensure we get data even if eloquent relationships are tricky
                $caf = \App\Models\Loan\CreditApplicationForm::where('loan_application_id', $d->loan_application_id)->first();
                $customer = \App\Models\Loan\LoanCustomer::where('customer_unique_id', $d->customer_unique_id)->first();

                // Fetch CAM as a fallback source only
                $cam = \App\Models\Loan\CAM::where('loan_application_id', $d->loan_application_id)->first();

                // Payment inventory should show CAF applied amount first (credit_applied_for).
                // CAM proposedEmi is an installment value and was causing 12 vs 121 mismatch.
                $loanAmount = 'N/A';
                if ($caf && !is_null($caf->credit_applied_for) && $caf->credit_applied_for !== '') {
                    $loanAmount = $caf->credit_applied_for;
                } elseif ($cam && is_array($cam->net_surplus) && isset($cam->net_surplus['proposedEmi'])) {
                    $loanAmount = $cam->net_surplus['proposedEmi'];
                }

                $productName = 'N/A';
                if ($caf && !empty($caf->products)) {
                    $products = is_array($caf->products) ? $caf->products : json_decode($caf->products, true);
                    if (!empty($products)) {
                        $productNames = collect($products)->pluck('product_name')->filter()->implode(', ');
                        $productName = $productNames ?: 'N/A';
                    }
                }

                return [
                    'id' => $d->id,
                    'date_of_disbursement' => $d->date_of_disbursement,
                    'member_name' => $customer ? ($customer->first_name . ' ' . $customer->last_name) : 'N/A',
                    'cust_id' => $d->customer_unique_id,
                    'loan_id' => $d->loan_application_id,
                    'investor_unique_id' => $d->investor_unique_id,
                    'product' => $productName,
                    'product_type' => $caf->credit_mode ?? 'N/A',
                    'loan_amount' => $loanAmount,
                    'bank_name' => $caf->bank_name ?? 'N/A',
                    'account_number' => $caf->account_number ?? 'N/A',
                    'ifsc' => $caf->ifsc_code ?? 'N/A',
                    'payment_id' => $d->payment_id,
                    'payment_method' => $d->payment_method,
                    'upi_reference_no' => $d->upi_reference_no,
                    'payment_screenshot' => $d->payment_screenshot,
                    'payment_date' => $d->payment_date,
                    'payment_status' => $d->payment_status === 'on_process' ? 'On Process' : ($d->payment_status === 'NEFT_done' ? 'NEFT Done' : ($d->payment_status === 'NEFT_failed' ? 'NEFT Failed' : $d->payment_status))
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formatted,
                'filters_applied' => [
                    'search' => $request->search,
                    'branch_id' => $request->branch_id,
                    'cms_admin_id' => $request->cms_admin_id,
                    'customer_unique_id' => $request->customer_unique_id,
                    'disbursement_method' => $request->disbursement_method,
                    'payment_status' => $request->payment_status,
                    'disbursement_status' => $request->disbursement_status,
                    'is_loan_started' => $request->is_loan_started,
                    'amount_from' => $request->amount_from,
                    'amount_to' => $request->amount_to,
                    'date_from' => $request->date_from,
                    'date_to' => $request->date_to,
                    'booking_date_from' => $request->booking_date_from,
                    'booking_date_to' => $request->booking_date_to,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Internal Server Error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function updateInventoryPayment(Request $request, $id)
    {
        try {
            $request->validate([
                'payment_date' => 'required|date',
                'payment_status' => 'required|string',
                'payment_method' => 'nullable|string|in:Cash,UPI,Bank Transfer',
                'upi_reference_no' => 'required_if:payment_method,UPI|nullable|string',
                'payment_screenshot' => 'nullable|image|mimes:jpg,png,jpeg|max:2048',
            ]);

            return \Illuminate\Support\Facades\DB::transaction(function () use ($request, $id) {
                $disbursement = LoanDisbursement::lockForUpdate()->findOrFail($id);

                // Map frontend display status to backend database enum values
                $statusMap = [
                    'On Process' => 'on_process',
                    'NEFT Done' => 'NEFT_done',
                    'NEFT Failed' => 'NEFT_failed'
                ];

                $dbStatus = $statusMap[$request->payment_status] ?? $request->payment_status;

                $data = [
                    'payment_date' => $request->payment_date,
                    'payment_status' => $dbStatus,
                    'is_disbursed' => 1
                ];

                // Product disbursement flow can be completed without payment method.
                if ($request->filled('payment_method')) {
                    $data['payment_method'] = $request->payment_method;
                    $data['upi_reference_no'] = $request->payment_method === 'UPI'
                        ? $request->upi_reference_no
                        : null;
                }

                // Only generate a new Payment ID if it's currently empty
                if (empty($disbursement->payment_id)) {
                    // Generate payment ID with retry logic to handle duplicates
                    $maxRetries = 5;
                    $paymentId = null;

                    for ($i = 0; $i < $maxRetries; $i++) {
                        try {
                            $paymentId = LoanDisbursement::generatePaymentId();
                            // Test if this payment_id already exists
                            $exists = LoanDisbursement::where('payment_id', $paymentId)->exists();
                            if (!$exists) {
                                break; // Found unique payment_id
                            }
                            $paymentId = null; // Reset and try again
                        } catch (\Exception $e) {
                            $paymentId = null;
                        }
                    }

                    if ($paymentId) {
                        $data['payment_id'] = $paymentId;
                    }
                }

                if ($request->hasFile('payment_screenshot')) {
                    $file = $request->file('payment_screenshot');
                    $filename = time() . '_' . $file->getClientOriginalName();

                    $uploadPath = public_path('uploads/payment_proofs');
                    if (!file_exists($uploadPath)) {
                        mkdir($uploadPath, 0777, true);
                    }

                    $file->move($uploadPath, $filename);
                    $data['payment_screenshot'] = 'uploads/payment_proofs/' . $filename;
                }

                $disbursement->update($data);

                return response()->json([
                    'success' => true,
                    'message' => 'Payment status updated successfully',
                    'data' => $disbursement
                ]);
            });
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update payment status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getCompletedInventoryPayments(Request $request)
    {
        try {

            $disbursements = LoanDisbursement::where('is_disbursed', 1)->get();

            $formatted = $disbursements->map(function ($d) {

                $caf = \App\Models\Loan\CreditApplicationForm::where(
                    'loan_application_id',
                    $d->loan_application_id
                )->first();

                $customer = \App\Models\Loan\LoanCustomer::where(
                    'customer_unique_id',
                    $d->customer_unique_id
                )->first();

                $cam = \App\Models\Loan\CAM::where(
                    'loan_application_id',
                    $d->loan_application_id
                )->first();

                // Product Name
                $productName = 'N/A';

                if ($caf && !empty($caf->products)) {

                    $products = is_array($caf->products)
                        ? $caf->products
                        : json_decode($caf->products, true);

                    if (!empty($products)) {

                        $productNames = collect($products)
                            ->pluck('product_name')
                            ->filter()
                            ->implode(', ');

                        $productName = $productNames ?: 'N/A';
                    }
                }

                // Loan Amount
                $loanAmount = 'N/A';

                if (
                    $caf &&
                    !is_null($caf->credit_applied_for) &&
                    $caf->credit_applied_for !== ''
                ) {
                    $loanAmount = $caf->credit_applied_for;
                } elseif (
                    $cam &&
                    is_array($cam->net_surplus) &&
                    isset($cam->net_surplus['proposedEmi'])
                ) {
                    $loanAmount = $cam->net_surplus['proposedEmi'];
                }

                $statusDisplayMap = [
                    'on_process' => 'On Process',
                    'NEFT_done' => 'NEFT Done',
                    'NEFT_failed' => 'NEFT Failed',
                ];

                return [
                    'id' => $d->id,
                    'date_of_disbursement' => $d->date_of_disbursement,

                    'member_name' => $customer
                        ? trim($customer->first_name . ' ' . $customer->last_name)
                        : 'N/A',

                    'cust_id' => $d->customer_unique_id,
                    'loan_id' => $d->loan_application_id,

                    'product' => $productName,
                    'product_type' => $caf->credit_mode ?? 'N/A',

                    'loan_amount' => $loanAmount,

                    'bank_name' => $caf->bank_name ?? 'N/A',
                    'account_number' => $caf->account_number ?? 'N/A',
                    'ifsc' => $caf->ifsc_code ?? 'N/A',

                    'payment_date' => $d->payment_date,

                    'payment_status' => $statusDisplayMap[$d->payment_status]
                        ?? $d->payment_status,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formatted
            ]);
        } catch (\Exception $e) {

            \Log::error('Completed Inventory Payments Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Internal Server Error',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function getDisbursementCompleteDetails(Request $request)
    {
        try {
            $request->validate([
                'disbursement_id' => 'required|string'
            ]);

            $disbursement = LoanDisbursement::where('disbursement_id', $request->disbursement_id)->first();

            if (!$disbursement) {
                return response()->json([
                    'success' => false,
                    'message' => 'Disbursement not found'
                ], 404);
            }

            // Get related data
            $loanApplication = \App\Models\LoanApplication::where('loan_application_id', $disbursement->loan_application_id)->first();
            $caf = \App\Models\Loan\CreditApplicationForm::where('loan_application_id', $disbursement->loan_application_id)->first();
            $customer = \App\Models\Loan\LoanCustomer::where('customer_unique_id', $disbursement->customer_unique_id)->first();
            $pdInfo = \App\Models\Loan\PdInformation::where('pd_application_id', $disbursement->pd_application_id)->first();
            $cam = \App\Models\Loan\CAM::where('cam_unique_id', $disbursement->cam_unique_id)->first();

            return response()->json([
                'success' => true,
                'data' => [
                    'disbursement' => $disbursement,
                    'loan_application' => $loanApplication,
                    'credit_application_form' => $caf,
                    'customer' => $customer,
                    'pd_information' => $pdInfo,
                    'cam' => $cam
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch disbursement details',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function updateDisbursementDates(Request $request, $id)
    {
        try {
            $request->validate([
                'booking_date' => 'nullable|date',
                'date_of_disbursement' => 'nullable|date',
            ]);

            $disbursement = LoanDisbursement::findOrFail($id);

            $disbursement->update([
                'booking_date' => $request->booking_date,
                'date_of_disbursement' => $request->date_of_disbursement,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Disbursement dates updated successfully',
                'data' => $disbursement
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update disbursement dates',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
