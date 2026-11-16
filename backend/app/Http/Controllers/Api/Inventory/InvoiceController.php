<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Inventory\Invoice;
use App\Models\Inventory\InvoiceItem;
use App\Models\Inventory\Payment;
use App\Models\Inventory\ProductMaster;
use App\Models\Inventory\PurchaseItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use App\Http\Helpers\AuthContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class InvoiceController extends Controller
{
    private ?bool $hasPurchaseItemIdColumn = null;
    private ?bool $hasAttributeSummaryColumn = null;
    private ?bool $hasCmsAdminColumn = null;
    private ?bool $hasPaymentsTable = null;
    private ?bool $hasSalesOrderIsDeletedColumn = null;
    private ?bool $hasSalesOrderItemsIsDeletedColumn = null;

    private function hasPurchaseItemIdColumn(): bool
    {
        if ($this->hasPurchaseItemIdColumn === null) {
            $this->hasPurchaseItemIdColumn = Schema::hasColumn('inventory_sales_order_items', 'purchase_item_id');
        }
        return $this->hasPurchaseItemIdColumn;
    }

    private function hasAttributeSummaryColumn(): bool
    {
        if ($this->hasAttributeSummaryColumn === null) {
            $this->hasAttributeSummaryColumn = Schema::hasColumn('inventory_sales_order_items', 'attribute_summary');
        }
        return $this->hasAttributeSummaryColumn;
    }

    private function hasCmsAdminColumn(): bool
    {
        if ($this->hasCmsAdminColumn === null) {
            $this->hasCmsAdminColumn = Schema::hasColumn('inventory_sales_order_items', 'cms_admin');
        }
        return $this->hasCmsAdminColumn;
    }

    private function hasPaymentsTable(): bool
    {
        if ($this->hasPaymentsTable === null) {
            $this->hasPaymentsTable = Schema::hasTable('inventory_payments');
        }

        return $this->hasPaymentsTable;
    }

    private function hasSalesOrderIsDeletedColumn(): bool
    {
        if ($this->hasSalesOrderIsDeletedColumn === null) {
            $this->hasSalesOrderIsDeletedColumn = Schema::hasColumn('inventory_sales_orders', 'is_deleted');
        }

        return $this->hasSalesOrderIsDeletedColumn;
    }

    private function hasSalesOrderItemsIsDeletedColumn(): bool
    {
        if ($this->hasSalesOrderItemsIsDeletedColumn === null) {
            $this->hasSalesOrderItemsIsDeletedColumn = Schema::hasColumn('inventory_sales_order_items', 'is_deleted');
        }

        return $this->hasSalesOrderItemsIsDeletedColumn;
    }

    private function formatInvoiceItemUniqueId(int $id): string
    {
        return 'INV-ITEM-' . str_pad((string) $id, 6, '0', STR_PAD_LEFT);
    }

    private function formatPurchaseItemUniqueId(int $id): string
    {
        return 'INV-PI-' . str_pad((string) $id, 6, '0', STR_PAD_LEFT);
    }

    private function resolveProduct($value): ?ProductMaster
    {
        if ($value === null || $value === '') {
            return null;
        }

        $input = trim((string) $value);
        if ($input === '') {
            return null;
        }

        if (preg_match('/^INV-PM-\d+$/', $input)) {
            return ProductMaster::where('unique_id', $input)->first();
        }

        if (ctype_digit($input)) {
            return ProductMaster::find((int) $input);
        }

        return ProductMaster::where('unique_id', $input)->first();
    }

    private function resolvePurchaseItem($value): ?PurchaseItem
    {
        if ($value === null || $value === '') {
            return null;
        }

        $input = trim((string) $value);
        if ($input === '') {
            return null;
        }

        if (preg_match('/^INV-PI-(\d+)$/', $input, $matches)) {
            return PurchaseItem::find((int) $matches[1]);
        }

        if (ctype_digit($input)) {
            return PurchaseItem::find((int) $input);
        }

        return null;
    }

    private function resolveCmsAdmin(Request $request): ?string
    {
        return AuthContext::cmsAdminId();
    }

    private function isInvoiceDeleted(Invoice $invoice): bool
    {
        if (!is_null($invoice->deleted_at)) {
            return true;
        }

        if ($this->hasSalesOrderIsDeletedColumn() && (int) ($invoice->is_deleted ?? 0) === 1) {
            return true;
        }

        return strtolower((string) ($invoice->status ?? '')) === 'cancelled';
    }

    protected function getValidationRules(): array
    {
        return [
            'customer_name' => 'required|string|max:255',
            'customer_phone' => ['required', 'regex:/^[0-9]{10}$/'],
            'customer_address' => 'required|string|max:1000',
            'order_date' => 'required_without:invoice_date|date',
            'invoice_date' => 'required_without:order_date|date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|string|max:100',
            'items.*.purchase_item_id' => 'nullable|string|max:100',
            'items.*.product_name' => 'required|string|max:255',
            'items.*.attribute_summary' => 'nullable|string|max:500',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.discount_type' => 'nullable|in:percentage,fixed',
            'items.*.discount_value' => 'nullable|numeric|min:0',
            'items.*.tax_type' => 'nullable|in:percentage,fixed',
            'items.*.tax_value' => 'nullable|numeric|min:0',
            'tax_type' => 'nullable|in:percentage,fixed',
            'tax_value' => 'nullable|numeric|min:0',
            'discount_type' => 'nullable|in:percentage,fixed',
            'discount_value' => 'nullable|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'payment_type' => 'nullable|string|max:50',
            'upi_reference_no' => 'nullable|string|max:100',
            'payment_screenshot' => 'nullable|file|image|max:5120',
            'notes' => 'nullable|string',
        ];
    }

    private function availableStockForProduct(int $productId, ?int $excludeInvoiceId = null): float
    {
        $product = ProductMaster::find($productId);
        if (!$product) {
            return 0;
        }

        $purchased = PurchaseItem::query()
            ->where(function ($q) use ($productId, $product) {
                $q->whereRaw('CAST(product_master_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [(string) $productId])
                    ->orWhereRaw('CAST(product_master_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [(string) $product->unique_id]);
            })
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('inventory_purchase_orders')
                    ->whereRaw('CAST(inventory_purchase_line_items.purchase_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(inventory_purchase_orders.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci');
            })
            ->sum('quantity');

        $soldQuery = InvoiceItem::query()
            ->where(function ($q) use ($productId, $product) {
                $q->whereRaw('CAST(product_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [(string) $product->unique_id])
                    ->orWhereRaw('CAST(product_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [(string) $productId])
                    ->orWhereRaw('CAST(product_unique_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [(string) $product->unique_id]);
            })
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('inventory_sales_orders')
                    ->whereRaw('CAST(inventory_sales_order_items.invoice_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(inventory_sales_orders.invoice_no AS CHAR) COLLATE utf8mb4_unicode_ci')
                    ->whereNull('inventory_sales_orders.deleted_at')
                    ->where('inventory_sales_orders.status', '!=', 'cancelled');
            });

        if ($this->hasSalesOrderIsDeletedColumn()) {
            $soldQuery->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('inventory_sales_orders')
                    ->whereRaw('CAST(inventory_sales_order_items.invoice_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(inventory_sales_orders.invoice_no AS CHAR) COLLATE utf8mb4_unicode_ci')
                    ->where('inventory_sales_orders.is_deleted', 0);
            });
        }

        if ($excludeInvoiceId) {
            $soldQuery->whereExists(function ($query) use ($excludeInvoiceId) {
                $query->select(DB::raw(1))
                    ->from('inventory_sales_orders')
                    ->whereRaw('CAST(inventory_sales_order_items.invoice_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(inventory_sales_orders.invoice_no AS CHAR) COLLATE utf8mb4_unicode_ci')
                    ->where('inventory_sales_orders.id', '!=', $excludeInvoiceId);
            });
        }

        $sold = $soldQuery->sum('quantity');

        return (float) $purchased - (float) $sold;
    }

    private function soldQuantityForPurchaseItem(int $purchaseItemId, ?int $excludeInvoiceId = null): float
    {
        if (!$this->hasPurchaseItemIdColumn()) {
            return 0.0;
        }

        $purchaseItemUniqueId = $this->formatPurchaseItemUniqueId($purchaseItemId);
        $query = InvoiceItem::query()->where(function ($q) use ($purchaseItemId, $purchaseItemUniqueId) {
            $q->whereRaw('CAST(purchase_item_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [(string) $purchaseItemUniqueId])
                ->orWhereRaw('CAST(purchase_item_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [(string) $purchaseItemId])
                ->orWhereRaw('CAST(purchase_item_unique_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [(string) $purchaseItemUniqueId]);
        });
        
        if ($excludeInvoiceId) {
            $query->whereExists(function ($subquery) use ($excludeInvoiceId) {
                $subquery->select(DB::raw(1))
                    ->from('inventory_sales_orders')
                    ->whereRaw('CAST(inventory_sales_order_items.invoice_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(inventory_sales_orders.invoice_no AS CHAR) COLLATE utf8mb4_unicode_ci')
                    ->whereNull('inventory_sales_orders.deleted_at')
                    ->where('inventory_sales_orders.status', '!=', 'cancelled')
                    ->where('inventory_sales_orders.id', '!=', $excludeInvoiceId);
            });
        } else {
            $query->whereExists(function ($subquery) {
                $subquery->select(DB::raw(1))
                    ->from('inventory_sales_orders')
                    ->whereRaw('CAST(inventory_sales_order_items.invoice_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(inventory_sales_orders.invoice_no AS CHAR) COLLATE utf8mb4_unicode_ci')
                    ->whereNull('inventory_sales_orders.deleted_at')
                    ->where('inventory_sales_orders.status', '!=', 'cancelled');
            });
        }

        if ($this->hasSalesOrderIsDeletedColumn()) {
            $query->whereExists(function ($subquery) {
                $subquery->select(DB::raw(1))
                    ->from('inventory_sales_orders')
                    ->whereRaw('CAST(inventory_sales_order_items.invoice_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(inventory_sales_orders.invoice_no AS CHAR) COLLATE utf8mb4_unicode_ci')
                    ->where('inventory_sales_orders.is_deleted', 0);
            });
        }

        return (float) $query->sum('quantity');
    }

    private function availableStockForPurchaseItem(int $purchaseItemId, ?int $excludeInvoiceId = null): float
    {
        $purchaseItem = PurchaseItem::find($purchaseItemId);
        if (!$purchaseItem) {
            return 0;
        }

        $purchased = (float) ($purchaseItem->quantity ?? 0);
        $sold = $this->soldQuantityForPurchaseItem($purchaseItemId, $excludeInvoiceId);

        return $purchased - $sold;
    }

    private function ensureStockAvailability(array $items, ?int $excludeInvoiceId = null): void
    {
        $requiredByProduct = [];
        $requiredByPurchaseItem = [];
        foreach ($items as $item) {
            $product = $this->resolveProduct($item['product_id'] ?? null);
            if (!$product) {
                throw new \Exception('Invalid product selected.');
            }

            $productId = (int) $product->id;
            $productUniqueId = (string) $product->unique_id;
            $qty = (float) ($item['quantity'] ?? 0);
            if (!isset($requiredByProduct[$productId])) {
                $requiredByProduct[$productId] = 0;
            }
            $requiredByProduct[$productId] += $qty;

            $purchaseItem = $this->resolvePurchaseItem($item['purchase_item_id'] ?? null);
            if ($purchaseItem) {
                $purchaseItemId = (int) $purchaseItem->id;
                if (!isset($requiredByPurchaseItem[$purchaseItemId])) {
                    $requiredByPurchaseItem[$purchaseItemId] = [
                        'product_unique_id' => $productUniqueId,
                        'product_id' => $productId,
                        'required' => 0.0,
                    ];
                }
                $requiredByPurchaseItem[$purchaseItemId]['required'] += $qty;
            }
        }

        foreach ($requiredByProduct as $productId => $requiredQty) {
            $product = ProductMaster::find($productId);
            if (!$product) {
                throw new \Exception("Product with ID {$productId} not found.");
            }

            $available = $this->availableStockForProduct($productId, $excludeInvoiceId);
            if ($requiredQty > $available) {
                throw new \Exception(
                    "Not enough stock for {$product->name}. Required: {$requiredQty}, Available: {$available}"
                );
            }
        }

        foreach ($requiredByPurchaseItem as $purchaseItemId => $data) {
            $purchaseItem = PurchaseItem::find($purchaseItemId);
            if (!$purchaseItem) {
                throw new \Exception("Invalid purchase item selected.");
            }

            $storedProductMasterId = (string) $purchaseItem->product_master_id;
            $expectedUniqueId = (string) $data['product_unique_id'];
            $expectedIntId = (string) $data['product_id'];

            // product_master_id is stored as unique_id (e.g. "INV-PM-0001") — compare against both forms
            if ($storedProductMasterId !== $expectedUniqueId && $storedProductMasterId !== $expectedIntId) {
                \Log::warning('InvoiceController: purchase_item product mismatch', [
                    'purchase_item_id' => $purchaseItemId,
                    'purchase_item.product_master_id' => $storedProductMasterId,
                    'expected_unique_id' => $expectedUniqueId,
                    'expected_int_id' => $expectedIntId,
                ]);
                throw new \Exception("Selected product variant does not belong to this product.");
            }

            $available = $this->availableStockForPurchaseItem((int) $purchaseItemId, $excludeInvoiceId);
            if ((float) $data['required'] > $available) {
                $label = trim((string) ($purchaseItem->attribute_summary ?? '')) ?: 'Default';
                throw new \Exception(
                    "Not enough stock for {$label}. Required: {$data['required']}, Available: {$available}"
                );
            }
        }
    }

    private function generateInvoiceNo(string $invoiceDate): string
    {
        $datePrefix = date('Ymd', strtotime($invoiceDate));

        $lastInvoice = Invoice::withTrashed()->withoutGlobalScopes()
            ->where('invoice_no', 'like', "INV-{$datePrefix}-%")
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();

        $nextNumber = 1;
        if ($lastInvoice) {
            $parts = explode('-', (string) $lastInvoice->invoice_no);
            $nextNumber = (int) end($parts) + 1;
        }

        $candidate = "INV-{$datePrefix}-" . str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
        while (Invoice::withTrashed()->withoutGlobalScopes()->where('invoice_no', $candidate)->exists()) {
            $nextNumber++;
            $candidate = "INV-{$datePrefix}-" . str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
        }

        return $candidate;
    }

    public function index(Request $request)
    {
        try {
            $branchId = AuthContext::branchId();
            $perPage = $request->get('per_page', 10);
            $search = $request->get('search', '');
            $includeDeleted = $request->boolean('include_deleted', false);

            $query = Invoice::withoutGlobalScopes()
                ->with('items')
                ->orderBy('created_at', 'desc');

            if (!$includeDeleted) {
                $query->whereNull('deleted_at')
                    ->where('status', '!=', 'cancelled');

                if ($this->hasSalesOrderIsDeletedColumn()) {
                    $query->where('is_deleted', 0);
                }
            }

            if ($branchId) {
                $query->where(function($q) use ($branchId) {
                    $q->where('branch_id', $branchId)
                      ->orWhere(function($q2) use ($branchId) {
                          $q2->whereNull('branch_id')->where('branch', $branchId);
                      });
                });
            }

            if (!empty($search)) {
                $query->where(function($q) use ($search) {
                    $q->where('invoice_no', 'like', "%$search%")
                      ->orWhere('customer_name', 'like', "%$search%")
                      ->orWhere('customer_phone', 'like', "%$search%");
                });
            }

            $invoices = $query->paginate($perPage);
            return response()->json([
                'status' => 'success',
                'data' => $invoices
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        $relations = ['items', 'payments'];

        $invoice = Invoice::withoutGlobalScopes()
            ->withTrashed()
            ->with($relations)
            ->where(function($query) use ($id) {
                $query->where('id', $id)
                      ->orWhere('invoice_no', $id);
            })
            ->first();

        if (!$invoice) {
            return response()->json(['status' => 'error', 'message' => 'Invoice not found'], 404);
        }

        if ($this->isInvoiceDeleted($invoice)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invoice is deleted',
                'data' => [
                    'id' => $invoice->id,
                    'invoice_no' => $invoice->invoice_no,
                    'is_deleted' => 1,
                ],
            ], 410);
        }

        return response()->json([
            'status' => 'success',
            'data' => $invoice
        ]);
    }

    public function addPayment(Request $request, $id): JsonResponse
    {
        if (!$this->hasPaymentsTable()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Payment table is missing. Please run database repair/migrations.',
            ], 503);
        }

        $invoice = Invoice::withoutGlobalScopes()
            ->withTrashed()
            ->where('id', $id)
            ->orWhere('invoice_no', $id)
            ->first();
        if (!$invoice) {
            return response()->json(['status' => 'error', 'message' => 'Invoice not found'], 404);
        }

        if ($this->isInvoiceDeleted($invoice)) {
            return response()->json(['status' => 'error', 'message' => 'Cannot add payment to a deleted invoice'], 410);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'payment_method' => 'nullable|string',
            'transaction_id' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        try {
            DB::transaction(function () use ($request, $invoice) {
                $amount = (float) $request->amount;

                $screenshotPath = null;
                if ($request->hasFile('payment_screenshot')) {
                    $file = $request->file('payment_screenshot');
                    $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                    $file->move(public_path('inventory/payments'), $filename);
                    $screenshotPath = 'inventory/payments/' . $filename;
                }

                Payment::create([
                    'branch' => $invoice->branch,
                    'invoice_id' => (string) $invoice->invoice_no,
                    'amount' => $amount,
                    'payment_date' => $request->payment_date,
                    'payment_method' => $request->payment_method ?? 'Cash',
                    'transaction_id' => $request->transaction_id,
                    'payment_screenshot' => $screenshotPath,
                    'notes' => $request->notes,
                ]);

                $newPaidAmount = (float) $invoice->paid_amount + $amount;
                $newBalanceAmount = (float) $invoice->grand_total - $newPaidAmount;
                
                $paymentStatus = 'Pending';
                if ($newBalanceAmount <= 0) {
                    $paymentStatus = 'Paid';
                    $newBalanceAmount = 0;
                } elseif ($newPaidAmount > 0) {
                    $paymentStatus = 'Partial';
                }

                $invoice->update([
                    'paid_amount' => $newPaidAmount,
                    'balance_amount' => $newBalanceAmount,
                    'payment_status' => $paymentStatus,
                ]);
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Payment added successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to add payment: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), $this->getValidationRules());

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        try {
            $invoice = DB::transaction(function () use ($request) {
                $this->ensureStockAvailability($request->items, null);
                $cmsAdmin = $this->resolveCmsAdmin($request);

                $subtotal = 0;
                foreach ($request->items as $item) {
                    $qty = (float) ($item['quantity'] ?? 0);
                    $price = (float) ($item['price'] ?? 0);
                    $discType = $item['discount_type'] ?? 'percentage';
                    $discValue = (float) ($item['discount_value'] ?? 0);
                    $taxType = $item['tax_type'] ?? 'percentage';
                    $taxValue = (float) ($item['tax_value'] ?? 0);

                    $itemTotal = $qty * $price;
                    $itemDisc = ($discType === 'percentage') ? (($itemTotal * $discValue) / 100) : $discValue;
                    $itemTax = ($taxType === 'percentage') ? ((($itemTotal - $itemDisc) * $taxValue) / 100) : $taxValue;
                    $subtotal += ($itemTotal - $itemDisc + $itemTax);
                }

                $invoiceDate = (string) ($request->order_date ?? $request->invoice_date);
                $invoiceNo = $this->generateInvoiceNo($invoiceDate);

                $orderDiscountType = $request->discount_type ?? 'percentage';
                $orderDiscountValue = (float) ($request->discount_value ?? 0);
                $orderDiscountAmount = 0;
                if ($orderDiscountValue > 0) {
                    $orderDiscountAmount = $orderDiscountType === 'percentage'
                        ? (($subtotal * $orderDiscountValue) / 100)
                        : $orderDiscountValue;
                    $orderDiscountAmount = min($orderDiscountAmount, $subtotal);
                }

                $paidAmount = (float) ($request->paid_amount ?? 0);
                $grandTotal = max(0, $subtotal - $orderDiscountAmount);
                $balanceAmount = $grandTotal - $paidAmount;
                $paymentStatus = 'Pending';
                if ($balanceAmount <= 0) {
                    $paymentStatus = 'Paid';
                    $balanceAmount = 0;
                } elseif ($paidAmount > 0) {
                    $paymentStatus = 'Partial';
                }

                $screenshotPath = null;
                if ($request->hasFile('payment_screenshot')) {
                    $file = $request->file('payment_screenshot');
                    $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                    $file->move(public_path('inventory/payments'), $filename);
                    $screenshotPath = 'inventory/payments/' . $filename;
                }

                $invoice = Invoice::create([
                    'invoice_no'      => $invoiceNo,
                    'customer_name'   => $request->customer_name,
                    'customer_phone'  => $request->customer_phone,
                    'customer_address'=> $request->customer_address,
                    'invoice_date'    => $request->order_date ?? $request->invoice_date,
                    'subtotal'        => $subtotal,
                    'tax_type'        => $request->tax_type ?? 'percentage',
                    'tax_value'       => $request->tax_value ?? 0,
                    'tax_amount'      => 0,
                    'discount_type'   => $request->discount_type ?? 'percentage',
                    'discount_value'  => $request->discount_value ?? 0,
                    'discount_amount' => $orderDiscountAmount,
                    'grand_total'     => $grandTotal,
                    'paid_amount'     => $paidAmount,
                    'balance_amount'  => $balanceAmount,
                    'payment_status'  => $paymentStatus,
                    'payment_method'  => $request->payment_type ?? 'Cash',
                    'upi_reference_no'=> $request->upi_reference_no,
                    'payment_screenshot' => $screenshotPath,
                    'notes'           => $request->notes,
                    'status'          => 'active',
                    'branch'          => AuthContext::branchId(),
                    'branch_id'       => AuthContext::branchId(),
                    'cms_admin_id'    => $cmsAdmin,
                ]);

                if ($this->hasSalesOrderIsDeletedColumn()) {
                    $invoice->is_deleted = 0;
                    $invoice->save();
                }

                foreach ($request->items as $item) {
                    $qty = (float) ($item['quantity'] ?? 0);
                    $price = (float) ($item['price'] ?? 0);
                    $discType = $item['discount_type'] ?? 'percentage';
                    $discValue = (float) ($item['discount_value'] ?? 0);
                    $taxType = $item['tax_type'] ?? 'percentage';
                    $taxValue = (float) ($item['tax_value'] ?? 0);

                    $itemTotal = $qty * $price;
                    $itemDisc = ($discType === 'percentage') ? (($itemTotal * $discValue) / 100) : $discValue;
                    $itemTax = ($taxType === 'percentage') ? ((($itemTotal - $itemDisc) * $taxValue) / 100) : $taxValue;

                    $product = $this->resolveProduct($item['product_id'] ?? null);
                    if (!$product) {
                        throw new \Exception('Invalid product selected.');
                    }

                    $purchaseItemUniqueId = null;
                    $purchaseItem = $this->resolvePurchaseItem($item['purchase_item_id'] ?? null);
                    if ($purchaseItem) {
                        $purchaseItemUniqueId = $this->formatPurchaseItemUniqueId((int) $purchaseItem->id);
                    }

                    $invoiceItem = InvoiceItem::create([
                        'invoice_id'          => (string) $invoice->invoice_no,
                        'invoice_unique_id'   => (string) $invoice->invoice_no,
                        'product_id'          => (string) $product->unique_id,
                        'product_unique_id'   => $product?->unique_id,
                        'product_name'        => $item['product_name'],
                        'quantity'            => $qty,
                        'price'               => $price,
                        'discount_type'       => $discType,
                        'discount_value'      => $discValue,
                        'discount_amount'     => $itemDisc,
                        'tax_type'            => $taxType,
                        'tax_value'           => $taxValue,
                        'tax_amount'          => $itemTax,
                        'total'               => $itemTotal - $itemDisc + $itemTax,
                        'purchase_item_unique_id' => $purchaseItemUniqueId,
                        'purchase_item_id'    => $purchaseItemUniqueId,
                        'attribute_summary'   => $item['attribute_summary'] ?? null,
                        'cms_admin'           => $cmsAdmin,
                        'cms_admin_id'        => $cmsAdmin,
                        'branch_id'           => AuthContext::branchId(),
                    ]);

                    if ($this->hasSalesOrderItemsIsDeletedColumn()) {
                        $invoiceItem->is_deleted = 0;
                        $invoiceItem->save();
                    }

                    if (empty($invoiceItem->unique_id)) {
                        $invoiceItem->unique_id = $this->formatInvoiceItemUniqueId((int) $invoiceItem->id);
                        $invoiceItem->save();
                    }
                }

                return $invoice;
            });

            return response()->json([
                'status'  => 'success',
                'message' => 'Invoice created successfully',
                'data'    => $invoice->load('items'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Failed to create invoice: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        $invoice = Invoice::withoutGlobalScopes()
            ->withTrashed()
            ->where('id', $id)
            ->orWhere('invoice_no', $id)
            ->first();
        if (!$invoice) {
            return response()->json(['status' => 'error', 'message' => 'Invoice not found'], 404);
        }

        if ($this->isInvoiceDeleted($invoice)) {
            return response()->json(['status' => 'error', 'message' => 'Cannot update a deleted invoice'], 410);
        }

        $validator = Validator::make($request->all(), $this->getValidationRules());
        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        try {
            $invoice = DB::transaction(function () use ($request, $invoice) {
                $this->ensureStockAvailability($request->items, (int) $invoice->id);
                $cmsAdmin = $this->resolveCmsAdmin($request);

                $subtotal = 0;
                foreach ($request->items as $item) {
                    $qty = (float) ($item['quantity'] ?? 0);
                    $price = (float) ($item['price'] ?? 0);
                    $discType = $item['discount_type'] ?? 'percentage';
                    $discValue = (float) ($item['discount_value'] ?? 0);
                    $taxType = $item['tax_type'] ?? 'percentage';
                    $taxValue = (float) ($item['tax_value'] ?? 0);

                    $itemTotal = $qty * $price;
                    $itemDisc = ($discType === 'percentage') ? (($itemTotal * $discValue) / 100) : $discValue;
                    $itemTax = ($taxType === 'percentage') ? ((($itemTotal - $itemDisc) * $taxValue) / 100) : $taxValue;
                    $subtotal += ($itemTotal - $itemDisc + $itemTax);
                }

                $orderDiscountType = $request->discount_type ?? 'percentage';
                $orderDiscountValue = (float) ($request->discount_value ?? 0);
                $orderDiscountAmount = 0;
                if ($orderDiscountValue > 0) {
                    $orderDiscountAmount = $orderDiscountType === 'percentage'
                        ? (($subtotal * $orderDiscountValue) / 100)
                        : $orderDiscountValue;
                    $orderDiscountAmount = min($orderDiscountAmount, $subtotal);
                }

                $paidAmount = (float) ($request->paid_amount ?? 0);
                $grandTotal = max(0, $subtotal - $orderDiscountAmount);
                $balanceAmount = $grandTotal - $paidAmount;
                $paymentStatus = 'Pending';
                if ($balanceAmount <= 0) {
                    $paymentStatus = 'Paid';
                    $balanceAmount = 0;
                } elseif ($paidAmount > 0) {
                    $paymentStatus = 'Partial';
                }

                $invoice->update([
                    'customer_name' => $request->customer_name,
                    'customer_phone' => $request->customer_phone,
                    'customer_address' => $request->customer_address,
                    'invoice_date' => $request->order_date ?? $request->invoice_date,
                    'subtotal' => $subtotal,
                    'tax_type' => $request->tax_type ?? 'percentage',
                    'tax_value' => $request->tax_value ?? 0,
                    'tax_amount' => 0,
                    'discount_type' => $request->discount_type ?? 'percentage',
                    'discount_value' => $request->discount_value ?? 0,
                    'discount_amount' => $orderDiscountAmount,
                    'grand_total' => $grandTotal,
                    'paid_amount' => $paidAmount,
                    'balance_amount' => $balanceAmount,
                    'payment_status' => $paymentStatus,
                    'payment_method' => $request->payment_type ?? 'Cash',
                    'upi_reference_no' => $request->upi_reference_no,
                    'notes' => $request->notes,
                ]);

                // Update screenshot only if a new file is uploaded
                if ($request->hasFile('payment_screenshot')) {
                    $file = $request->file('payment_screenshot');
                    $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                    $file->move(public_path('inventory/payments'), $filename);
                    $screenshotPath = 'inventory/payments/' . $filename;
                    $invoice->update(['payment_screenshot' => $screenshotPath]);
                }

                InvoiceItem::where('invoice_id', (string) $invoice->invoice_no)->delete();

                foreach ($request->items as $item) {
                    $qty = (float) ($item['quantity'] ?? 0);
                    $price = (float) ($item['price'] ?? 0);
                    $discType = $item['discount_type'] ?? 'percentage';
                    $discValue = (float) ($item['discount_value'] ?? 0);
                    $taxType = $item['tax_type'] ?? 'percentage';
                    $taxValue = (float) ($item['tax_value'] ?? 0);

                    $itemTotal = $qty * $price;
                    $itemDisc = ($discType === 'percentage') ? (($itemTotal * $discValue) / 100) : $discValue;
                    $itemTax = ($taxType === 'percentage') ? ((($itemTotal - $itemDisc) * $taxValue) / 100) : $taxValue;

                    $product = $this->resolveProduct($item['product_id'] ?? null);
                    if (!$product) {
                        throw new \Exception('Invalid product selected.');
                    }

                    $purchaseItemUniqueId = null;
                    $purchaseItem = $this->resolvePurchaseItem($item['purchase_item_id'] ?? null);
                    if ($purchaseItem) {
                        $purchaseItemUniqueId = $this->formatPurchaseItemUniqueId((int) $purchaseItem->id);
                    }

                    $invoiceItem = InvoiceItem::create([
                        'invoice_id'          => (string) $invoice->invoice_no,
                        'invoice_unique_id'   => (string) $invoice->invoice_no,
                        'product_id'          => (string) $product->unique_id,
                        'product_unique_id'   => $product?->unique_id,
                        'product_name'        => $item['product_name'],
                        'quantity'            => $qty,
                        'price'               => $price,
                        'discount_type'       => $discType,
                        'discount_value'      => $discValue,
                        'discount_amount'     => $itemDisc,
                        'tax_type'            => $taxType,
                        'tax_value'           => $taxValue,
                        'tax_amount'          => $itemTax,
                        'total'               => $itemTotal - $itemDisc + $itemTax,
                        'purchase_item_unique_id' => $purchaseItemUniqueId,
                        'purchase_item_id'    => $purchaseItemUniqueId,
                        'attribute_summary'   => $item['attribute_summary'] ?? null,
                        'cms_admin'           => $cmsAdmin,
                        'cms_admin_id'        => $cmsAdmin,
                        'branch_id'           => AuthContext::branchId(),
                    ]);

                    if ($this->hasSalesOrderItemsIsDeletedColumn()) {
                        $invoiceItem->is_deleted = 0;
                        $invoiceItem->save();
                    }

                    if (empty($invoiceItem->unique_id)) {
                        $invoiceItem->unique_id = $this->formatInvoiceItemUniqueId((int) $invoiceItem->id);
                        $invoiceItem->save();
                    }
                }

                return $invoice;
            });

            return response()->json([
                'status'  => 'success',
                'message' => 'Invoice updated successfully',
                'data'    => $invoice->load('items'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Failed to update invoice: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        $invoice = Invoice::withoutGlobalScopes()
            ->withTrashed()
            ->where('id', $id)
            ->orWhere('invoice_no', $id)
            ->first();
        if (!$invoice) {
            return response()->json(['status' => 'error', 'message' => 'Invoice not found'], 404);
        }

        if ($this->isInvoiceDeleted($invoice)) {
            return response()->json([
                'status'  => 'success',
                'message' => 'Invoice already deleted',
            ]);
        }

        try {
            DB::transaction(function () use ($invoice) {
                // Soft delete — record stays, just marked deleted
                $invoice->update([
                    'status' => 'cancelled',
                    ...($this->hasSalesOrderIsDeletedColumn() ? ['is_deleted' => 1] : []),
                ]);

                if ($this->hasSalesOrderItemsIsDeletedColumn()) {
                    InvoiceItem::where('invoice_id', (string) $invoice->invoice_no)->update(['is_deleted' => 1]);
                }

                InvoiceItem::where('invoice_id', (string) $invoice->invoice_no)->delete();
                $invoice->delete(); // sets deleted_at via SoftDeletes
            });

            return response()->json([
                'status'  => 'success',
                'message' => 'Invoice cancelled successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Failed to cancel invoice: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function searchProducts(Request $request)
    {
        $query = $request->get('q', '');
        $products = ProductMaster::with(['brand', 'category'])
            ->where('status', 'active');
            
        if (!empty($query)) {
            $products->where(function($q) use ($query) {
                $q->where('name', 'like', "%$query%")
                  ->orWhere('sku_code', 'like', "%$query%");
            });
        }
            
        $data = $products->limit(15)->get();
            
        return response()->json($data);
    }
}
