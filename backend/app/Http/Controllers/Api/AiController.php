<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Helpers\AuthContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

class AiController extends Controller
{
    private function respond(string $message, array $data, array $filters = []): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'filters' => $filters,
        ]);
    }

    private function baseFilters(Request $request): array
    {
        $validator = Validator::make($request->query(), [
            'from_date' => 'nullable|date_format:Y-m-d',
            'to_date' => 'nullable|date_format:Y-m-d|after_or_equal:from_date',
            'branch_id' => 'nullable|string|max:100',
            'search' => 'nullable|string|max:255',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        if ($validator->fails()) {
            abort(response()->json([
                'success' => false,
                'message' => 'Invalid request parameters',
                'errors' => $validator->errors(),
            ], 422));
        }

        $branch = $this->authorizedBranch($request);

        return [
            'from_date' => $request->query('from_date'),
            'to_date' => $request->query('to_date'),
            'branch_id' => $branch,
            'search' => $request->query('search'),
            'page' => (int) $request->query('page', 1),
            'per_page' => (int) $request->query('per_page', 25),
        ];
    }

    private function authorizedBranch(Request $request): ?string
    {
        $requested = $request->query('branch_id');
        $user = $request->user();

        if (AuthContext::isSuperAdmin()) {
            return $requested ?: null;
        }

        $ownBranch = $user?->branch ?? $user?->branch_id ?? null;
        if ($requested && $ownBranch && (string) $requested !== (string) $ownBranch) {
            abort(response()->json([
                'success' => false,
                'message' => 'You are not authorized to access this branch',
            ], 403));
        }

        return $requested ?: $ownBranch;
    }

    private function applyBranch($query, string $table, ?string $branch): void
    {
        if (!$branch) {
            return;
        }
        if (Schema::hasColumn($table, 'branch_id')) {
            $query->where($table . '.branch_id', $branch);
        } elseif (Schema::hasColumn($table, 'branch')) {
            $query->where($table . '.branch', $branch);
        }
    }

    private function applyDate($query, string $column, array $filters): void
    {
        if (!empty($filters['from_date'])) {
            $query->where($column, '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->where($column, '<=', $filters['to_date'] . ' 23:59:59');
        }
    }

    public function dashboard(Request $request): JsonResponse
    {
        $filters = $this->baseFilters($request);

        $investment = DB::table('investor_investments');
        $this->applyBranch($investment, 'investor_investments', $filters['branch_id']);
        $this->applyDate($investment, 'date', $filters);

        $sales = DB::table('inventory_sales_orders');
        $this->applyBranch($sales, 'inventory_sales_orders', $filters['branch_id']);
        $this->applyDate($sales, 'invoice_date', $filters);

        $purchases = DB::table('inventory_purchase_orders');
        $this->applyBranch($purchases, 'inventory_purchase_orders', $filters['branch_id']);
        $this->applyDate($purchases, 'purchase_date', $filters);

        $bookings = DB::table('inventory_advance_bookings');
        $this->applyBranch($bookings, 'inventory_advance_bookings', $filters['branch_id']);
        $this->applyDate($bookings, 'booking_date', $filters);

        $payments = DB::table('inventory_payments');
        $this->applyBranch($payments, 'inventory_payments', $filters['branch_id']);
        $this->applyDate($payments, 'payment_date', $filters);

        $data = [
            'total_investments' => (float) $investment->sum('amount'),
            'total_sales' => (float) $sales->sum('grand_total'),
            'total_purchases' => (float) $purchases->sum('total_amount'),
            'total_bookings' => (int) $bookings->count(),
            'pending_bookings' => (clone $bookings)->where('status', 'pending')->count(),
            'payments_received' => (float) $payments->sum('amount'),
            'sales_outstanding' => (float) (clone $sales)->sum('balance_amount'),
            'purchase_outstanding' => (float) (clone $purchases)->sum('due_amount'),
        ];

        return $this->respond('Business overview retrieved successfully', $data, $filters);
    }

    public function branches(Request $request): JsonResponse
    {
        $filters = $this->baseFilters($request);
        $query = DB::table('branches')->where('is_deleted', 0)->where('is_active', 1);

        if (!$filters['branch_id']) {
            $user = $request->user();
            if (!AuthContext::isSuperAdmin() && !empty($user?->branch)) {
                $query->where('code', $user->branch);
            }
        } else {
            $query->where('code', $filters['branch_id']);
        }
        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('code', 'like', '%' . $filters['search'] . '%');
            });
        }

        $branches = $query->paginate($filters['per_page'], ['id', 'code', 'name', 'address', 'phone', 'email'], 'page', $filters['page']);
        return $this->respond('Accessible branches retrieved successfully', $branches->items(), $filters + ['pagination' => [
            'current_page' => $branches->currentPage(),
            'per_page' => $branches->perPage(),
            'total' => $branches->total(),
        ]]);
    }

    public function investments(Request $request): JsonResponse
    {
        $filters = $this->baseFilters($request);
        $query = DB::table('investor_investments')->select([
            'unique_id', 'investor_unique_id', 'branch_id', 'amount', 'remaining_pool_balance',
            'total_amount', 'date', 'rate', 'maturity', 'payment_history',
        ]);
        $this->applyBranch($query, 'investor_investments', $filters['branch_id']);
        $this->applyDate($query, 'date', $filters);
        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('unique_id', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('investor_unique_id', 'like', '%' . $filters['search'] . '%');
            });
        }

        $investments = $query->orderByDesc('date')->paginate($filters['per_page'], ['*'], 'page', $filters['page']);

        $summaryQuery = DB::table('investor_investments');
        $this->applyBranch($summaryQuery, 'investor_investments', $filters['branch_id']);
        $this->applyDate($summaryQuery, 'date', $filters);

        $data = [
            'summary' => [
                'total_investment_amount' => (float) (clone $summaryQuery)->sum('amount'),
                'investor_count' => (int) (clone $summaryQuery)->distinct()->count('investor_unique_id'),
                'active_investment_count' => (int) (clone $summaryQuery)->count(),
            ],
            'investments' => $investments->items(),
            'pagination' => [
                'current_page' => $investments->currentPage(),
                'per_page' => $investments->perPage(),
                'total' => $investments->total(),
            ],
        ];
        return $this->respond('Investment information retrieved successfully', $data, $filters);
    }

    public function investmentDetail(string $uniqueId): JsonResponse
    {
        $investment = DB::table('investor_investments')->where('unique_id', $uniqueId)->first();
        if (!$investment) {
            return response()->json(['success' => false, 'message' => 'Investment not found'], 404);
        }
        if (!AuthContext::isSuperAdmin() && AuthContext::branchId() && $investment->branch_id !== AuthContext::branchId()) {
            return response()->json(['success' => false, 'message' => 'You are not authorized to access this investment'], 403);
        }

        $redemptions = DB::table('investment_weekly_redemptions')->where('investment_unique_id', $uniqueId)
            ->orderByDesc('redemption_date')
            ->get(['unique_id', 'week_number', 'redemption_amount', 'status', 'redemption_date'])
            ->toArray();

        return $this->respond('Investment details retrieved successfully', [
            'investment' => [
                'unique_id' => $investment->unique_id,
                'investor_unique_id' => $investment->investor_unique_id,
                'branch_id' => $investment->branch_id,
                'amount' => $investment->amount,
                'remaining_pool_balance' => $investment->remaining_pool_balance,
                'total_amount' => $investment->total_amount,
                'date' => $investment->date,
                'rate' => $investment->rate,
                'maturity' => $investment->maturity,
            ],
            'redemptions' => $redemptions,
        ]);
    }

    public function sales(Request $request): JsonResponse
    {
        $filters = $this->baseFilters($request);
        $query = DB::table('inventory_sales_orders')
            ->select(['id', 'invoice_no', 'customer_name', 'customer_phone', 'invoice_date', 'grand_total', 'paid_amount', 'balance_amount', 'payment_status', 'status', 'branch_id']);
        $this->applyBranch($query, 'inventory_sales_orders', $filters['branch_id']);
        $this->applyDate($query, 'invoice_date', $filters);
        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('invoice_no', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('customer_name', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('customer_phone', 'like', '%' . $filters['search'] . '%');
            });
        }
        $invoices = $query->orderByDesc('invoice_date')->paginate($filters['per_page'], ['*'], 'page', $filters['page']);

        $summary = DB::table('inventory_sales_orders');
        $this->applyBranch($summary, 'inventory_sales_orders', $filters['branch_id']);
        $this->applyDate($summary, 'invoice_date', $filters);

        return $this->respond('Sales information retrieved successfully', [
            'summary' => [
                'total_sales' => (float) (clone $summary)->sum('grand_total'),
                'received' => (float) (clone $summary)->sum('paid_amount'),
                'outstanding' => (float) (clone $summary)->sum('balance_amount'),
                'invoice_count' => (int) (clone $summary)->count(),
            ],
            'invoices' => $invoices->items(),
            'pagination' => ['current_page' => $invoices->currentPage(), 'per_page' => $invoices->perPage(), 'total' => $invoices->total()],
        ], $filters);
    }

    public function saleDetail(string $invoiceNo): JsonResponse
    {
        $invoice = DB::table('inventory_sales_orders')->where('invoice_no', $invoiceNo)->first();
        if (!$invoice) {
            return response()->json(['success' => false, 'message' => 'Sales invoice not found'], 404);
        }
        if (!AuthContext::isSuperAdmin() && AuthContext::branchId() && $invoice->branch_id !== AuthContext::branchId()) {
            return response()->json(['success' => false, 'message' => 'You are not authorized to access this invoice'], 403);
        }
        $items = DB::table('inventory_sales_order_items')->where('invoice_id', $invoiceNo)
            ->get(['product_name', 'attribute_summary', 'quantity', 'price', 'discount_amount', 'tax_amount', 'total']);
        $payments = Schema::hasTable('inventory_payments')
            ? DB::table('inventory_payments')->where('invoice_id', $invoiceNo)
                ->get(['amount', 'payment_date', 'payment_method', 'transaction_id'])
            : collect();

        return $this->respond('Sales invoice details retrieved successfully', [
            'invoice' => [
                'invoice_no' => $invoice->invoice_no,
                'customer_name' => $invoice->customer_name,
                'invoice_date' => $invoice->invoice_date,
                'grand_total' => $invoice->grand_total,
                'paid_amount' => $invoice->paid_amount,
                'balance_amount' => $invoice->balance_amount,
                'payment_status' => $invoice->payment_status,
                'status' => $invoice->status,
            ],
            'items' => $items,
            'payments' => $payments,
        ]);
    }

    public function purchases(Request $request): JsonResponse
    {
        $filters = $this->baseFilters($request);
        $query = DB::table('inventory_purchase_orders')
            ->select(['id', 'unique_id', 'vendor_id', 'vendor_name', 'invoice_no', 'purchase_date', 'total_amount', 'paid_amount', 'due_amount', 'payment_status', 'status', 'branch_id']);
        $this->applyBranch($query, 'inventory_purchase_orders', $filters['branch_id']);
        $this->applyDate($query, 'purchase_date', $filters);
        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('invoice_no', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('vendor_name', 'like', '%' . $filters['search'] . '%');
            });
        }
        $purchases = $query->orderByDesc('purchase_date')->paginate($filters['per_page'], ['*'], 'page', $filters['page']);

        $summary = DB::table('inventory_purchase_orders');
        $this->applyBranch($summary, 'inventory_purchase_orders', $filters['branch_id']);
        $this->applyDate($summary, 'purchase_date', $filters);

        return $this->respond('Purchase information retrieved successfully', [
            'summary' => [
                'total_purchases' => (float) (clone $summary)->sum('total_amount'),
                'paid' => (float) (clone $summary)->sum('paid_amount'),
                'outstanding' => (float) (clone $summary)->sum('due_amount'),
                'purchase_count' => (int) (clone $summary)->count(),
            ],
            'purchases' => $purchases->items(),
            'pagination' => ['current_page' => $purchases->currentPage(), 'per_page' => $purchases->perPage(), 'total' => $purchases->total()],
        ], $filters);
    }

    public function purchaseDetail(string $uniqueId): JsonResponse
    {
        $purchase = DB::table('inventory_purchase_orders')->where('unique_id', $uniqueId)->first();
        if (!$purchase) {
            $purchase = DB::table('inventory_purchase_orders')->where('invoice_no', $uniqueId)->first();
        }
        if (!$purchase) {
            return response()->json(['success' => false, 'message' => 'Purchase not found'], 404);
        }
        if (!AuthContext::isSuperAdmin() && AuthContext::branchId() && $purchase->branch_id !== AuthContext::branchId()) {
            return response()->json(['success' => false, 'message' => 'You are not authorized to access this purchase'], 403);
        }
        $items = DB::table('inventory_purchase_line_items')->where('purchase_id', $purchase->unique_id)
            ->get(['product_name', 'attribute_summary', 'quantity', 'purchase_price', 'tax_percent', 'tax_amount', 'line_total']);

        return $this->respond('Purchase invoice details retrieved successfully', [
            'purchase' => [
                'unique_id' => $purchase->unique_id,
                'invoice_no' => $purchase->invoice_no,
                'vendor_name' => $purchase->vendor_name,
                'purchase_date' => $purchase->purchase_date,
                'total_amount' => $purchase->total_amount,
                'paid_amount' => $purchase->paid_amount,
                'due_amount' => $purchase->due_amount,
                'payment_status' => $purchase->payment_status,
            ],
            'items' => $items,
        ]);
    }

    public function bookings(Request $request): JsonResponse
    {
        $filters = $this->baseFilters($request);
        $query = DB::table('inventory_advance_bookings')
            ->select(['id', 'booking_no', 'customer_name', 'customer_phone', 'booking_date', 'expected_delivery_date', 'grand_total', 'advance_paid', 'paid_amount', 'balance_amount', 'status', 'branch_id']);
        $this->applyBranch($query, 'inventory_advance_bookings', $filters['branch_id']);
        $this->applyDate($query, 'booking_date', $filters);
        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('booking_no', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('customer_name', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('customer_phone', 'like', '%' . $filters['search'] . '%');
            });
        }
        $status = $request->query('status');
        if ($status) {
            $query->where('status', $status);
        }
        $bookings = $query->orderByDesc('booking_date')->paginate($filters['per_page'], ['*'], 'page', $filters['page']);

        $summary = DB::table('inventory_advance_bookings');
        $this->applyBranch($summary, 'inventory_advance_bookings', $filters['branch_id']);
        $this->applyDate($summary, 'booking_date', $filters);

        return $this->respond('Booking information retrieved successfully', [
            'summary' => [
                'total_bookings' => (int) (clone $summary)->count(),
                'pending' => (clone $summary)->where('status', 'pending')->count(),
                'completed' => (clone $summary)->where('status', 'completed')->count(),
                'cancelled' => (clone $summary)->where('status', 'cancelled')->count(),
                'total_balance' => (float) (clone $summary)->sum('balance_amount'),
            ],
            'bookings' => $bookings->items(),
            'pagination' => ['current_page' => $bookings->currentPage(), 'per_page' => $bookings->perPage(), 'total' => $bookings->total()],
        ], $filters);
    }

    public function customers(Request $request): JsonResponse
    {
        $filters = $this->baseFilters($request);
        $query = DB::table('loan_customers')
            ->select(['customer_unique_id', 'first_name', 'middle_name', 'last_name', 'contact_number_1', 'email', 'branch_id', 'status', 'verification_status'])
            ->where('is_deleted', 0);
        if ($filters['branch_id']) {
            $query->where('branch_id', $filters['branch_id']);
        }
        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('customer_unique_id', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('first_name', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('last_name', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('contact_number_1', 'like', '%' . $filters['search'] . '%');
            });
        }
        $customers = $query->orderBy('first_name')->paginate($filters['per_page'], ['*'], 'page', $filters['page']);
        return $this->respond('Customer search results retrieved successfully', [
            'customers' => $customers->items(),
            'pagination' => ['current_page' => $customers->currentPage(), 'per_page' => $customers->perPage(), 'total' => $customers->total()],
        ], $filters);
    }

    public function customerDetail(string $customerUniqueId): JsonResponse
    {
        $customer = DB::table('loan_customers')->where('customer_unique_id', $customerUniqueId)->where('is_deleted', 0)->first();
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Customer not found'], 404);
        }
        if (!AuthContext::isSuperAdmin() && AuthContext::branchId() && $customer->branch_id !== AuthContext::branchId()) {
            return response()->json(['success' => false, 'message' => 'You are not authorized to access this customer'], 403);
        }

        $salesOutstanding = DB::table('inventory_sales_orders')->where('customer_phone', $customer->contact_number_1)->sum('balance_amount');
        $sales = DB::table('inventory_sales_orders')->where('customer_phone', $customer->contact_number_1)
            ->get(['invoice_no', 'invoice_date', 'grand_total', 'balance_amount', 'payment_status']);
        $bookings = DB::table('inventory_advance_bookings')->where('customer_phone', $customer->contact_number_1)
            ->get(['booking_no', 'booking_date', 'grand_total', 'balance_amount', 'status']);

        return $this->respond('Customer details retrieved successfully', [
            'customer' => [
                'customer_unique_id' => $customer->customer_unique_id,
                'name' => trim($customer->first_name . ' ' . $customer->middle_name . ' ' . $customer->last_name),
                'phone' => $customer->contact_number_1,
                'email' => $customer->email,
                'branch_id' => $customer->branch_id,
                'status' => $customer->status,
                'verification_status' => $customer->verification_status,
            ],
            'sales_outstanding' => (float) $salesOutstanding,
            'sales' => $sales,
            'bookings' => $bookings,
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        $filters = $this->baseFilters($request);
        $query = DB::table('inventory_payments')
            ->select(['id', 'invoice_id', 'amount', 'payment_date', 'payment_method', 'transaction_id', 'branch_id']);
        $this->applyBranch($query, 'inventory_payments', $filters['branch_id']);
        $this->applyDate($query, 'payment_date', $filters);
        $payments = $query->orderByDesc('payment_date')->paginate($filters['per_page'], ['*'], 'page', $filters['page']);

        $summary = DB::table('inventory_payments');
        $this->applyBranch($summary, 'inventory_payments', $filters['branch_id']);
        $this->applyDate($summary, 'payment_date', $filters);
        $salesOutstanding = DB::table('inventory_sales_orders');
        $this->applyBranch($salesOutstanding, 'inventory_sales_orders', $filters['branch_id']);
        $this->applyDate($salesOutstanding, 'invoice_date', $filters);

        return $this->respond('Payment information retrieved successfully', [
            'summary' => [
                'total_received' => (float) (clone $summary)->sum('amount'),
                'transaction_count' => (int) (clone $summary)->count(),
                'sales_outstanding' => (float) (clone $salesOutstanding)->sum('balance_amount'),
            ],
            'payments' => $payments->items(),
            'pagination' => ['current_page' => $payments->currentPage(), 'per_page' => $payments->perPage(), 'total' => $payments->total()],
        ], $filters);
    }

    public function branchSummary(Request $request): JsonResponse
    {
        $filters = $this->baseFilters($request);
        $branches = DB::table('branches')->where('is_deleted', 0)->where('is_active', 1);

        if ($filters['branch_id']) {
            $branches->where('code', $filters['branch_id']);
        } elseif (!AuthContext::isSuperAdmin() && AuthContext::branchId()) {
            $branches->where('code', AuthContext::branchId());
        }

        $result = $branches->get(['id', 'code', 'name'])->map(function ($branch) use ($filters) {
            $investments = DB::table('investor_investments')->where('branch_id', $branch->code);
            $sales = DB::table('inventory_sales_orders')->where('branch_id', $branch->code);
            $purchases = DB::table('inventory_purchase_orders')->where('branch_id', $branch->code);
            $bookings = DB::table('inventory_advance_bookings')->where('branch_id', $branch->code);

            if (!empty($filters['from_date'])) {
                $investments->where('date', '>=', $filters['from_date']);
                $sales->where('invoice_date', '>=', $filters['from_date']);
                $purchases->where('purchase_date', '>=', $filters['from_date']);
                $bookings->where('booking_date', '>=', $filters['from_date']);
            }
            if (!empty($filters['to_date'])) {
                $investments->where('date', '<=', $filters['to_date']);
                $sales->where('invoice_date', '<=', $filters['to_date']);
                $purchases->where('purchase_date', '<=', $filters['to_date']);
                $bookings->where('booking_date', '<=', $filters['to_date']);
            }

            return [
                'branch' => ['id' => $branch->id, 'code' => $branch->code, 'name' => $branch->name],
                'investment_amount' => (float) $investments->sum('amount'),
                'sales_amount' => (float) $sales->sum('grand_total'),
                'purchase_amount' => (float) $purchases->sum('total_amount'),
                'booking_count' => (int) $bookings->count(),
            ];
        });

        return $this->respond('Branch-wise business summary retrieved successfully', ['branches' => $result], $filters);
    }
}
