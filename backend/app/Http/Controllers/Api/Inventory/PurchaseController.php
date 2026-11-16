<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory\Purchase;
use App\Models\Inventory\PurchaseItem;
use App\Models\Inventory\ProductMaster;
use Illuminate\Http\Request;
use App\Http\Helpers\AuthContext;
use App\Models\InvestorInvestment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;

class PurchaseController extends Controller
{
    private function deleteStoredFileIfExists(?string $path): void
    {
        if (!$path || !is_string($path)) {
            return;
        }

        if (preg_match('/^https?:\/\//i', $path)) {
            return;
        }

        $normalized = ltrim($path, '/');
        $absolutePath = public_path($normalized);
        if (is_file($absolutePath)) {
            @unlink($absolutePath);
            return;
        }

        if (Storage::disk('public')->exists($normalized)) {
            Storage::disk('public')->delete($normalized);
        }
    }

    private function ensureDirectoryExists(string $path): void
    {
        if (!is_dir($path)) {
            mkdir($path, 0755, true);
        }
    }

    private function getBranchId($request = null): ?string
    {
        return AuthContext::branchId();
    }
    private function resolveVendor($value)
    {
        if ($value === null || $value === '') return null;
        $input = trim((string) $value);
        if ($input === '') return null;

        // Search without status filter so deleted/inactive vendors still work for edits
        if (ctype_digit($input)) {
            return \App\Models\Inventory\Vendor::withoutGlobalScopes()->find((int) $input);
        }
        return \App\Models\Inventory\Vendor::withoutGlobalScopes()->where('unique_id', $input)->first();
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

    /**
     * Generate invoice number directly in purchase_orders table.
     */
    private function generatePurchaseOrderInvoiceNo(string $invoiceDate): string
    {
        $datePrefix = date('Ymd', strtotime($invoiceDate));

        $lastInvoice = Purchase::withoutBranchScope()
            ->where('invoice_no', 'like', "PINV-{$datePrefix}-%")
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();

        $nextNumber = 1;
        if ($lastInvoice && !empty($lastInvoice->invoice_no)) {
            $parts = explode('-', (string) $lastInvoice->invoice_no);
            $nextNumber = (int) end($parts) + 1;
        }

        $candidate = "PINV-{$datePrefix}-" . str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
        while (Purchase::withoutBranchScope()->where('invoice_no', $candidate)->exists()) {
            $nextNumber++;
            $candidate = "PINV-{$datePrefix}-" . str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
        }

        return $candidate;
    }

    /**
     * Keep product-level default GST in sync with latest line-item GST%.
     * This helps sale screen auto-fill tax from product configuration.
     */
    private function syncProductDefaultGst(int $productMasterId, $taxPercent): void
    {
        if ($taxPercent === null || $taxPercent === '') {
            return;
        }

        $rate = (float) $taxPercent;
        if ($rate < 0 || $rate > 100) {
            return;
        }

        ProductMaster::where('id', $productMasterId)->update([
            'gst_percent' => $rate,
        ]);
    }

    /**
     * Keep product-level selling price in sync with latest purchase entry.
     */
    private function syncProductSellingPrice(int $productMasterId, $sellingPrice): void
    {
        if ($sellingPrice === null || $sellingPrice === '') {
            return;
        }

        $price = (float) $sellingPrice;
        if ($price < 0) {
            return;
        }

        ProductMaster::where('id', $productMasterId)->update([
            'selling_price' => $price,
        ]);
    }

    /**
     * Compute purchase monetary totals (subtotal + GST - discount, then paid/due split).
     */
    private function computePurchaseTotals(array $items, string $discountType, float $discountValue, float $paidAmount): array
    {
        $subtotal = 0.0;
        $gstTotal = 0.0;

        foreach ($items as $item) {
            $qty = (float) ($item['quantity'] ?? 0);
            $price = (float) ($item['purchase_price'] ?? 0);
            $lineSubtotal = $qty * $price;
            $subtotal += $lineSubtotal;

            $itemTaxAmount = (float) ($item['tax_amount'] ?? 0);
            if ($itemTaxAmount > 0) {
                $gstTotal += $itemTaxAmount;
            } else {
                $itemTaxPercent = (float) ($item['tax_percent'] ?? 0);
                if ($itemTaxPercent > 0) {
                    $gstTotal += ($lineSubtotal * $itemTaxPercent) / 100;
                }
            }
        }

        $grossTotal = $subtotal + $gstTotal;

        if ($discountType === 'fixed') {
            $discountAmount = $discountValue;
        } else {
            $discountAmount = ($grossTotal * $discountValue) / 100;
        }

        $discountAmount = max(0.0, min($discountAmount, $grossTotal));
        $netTotal = max(0.0, $grossTotal - $discountAmount);

        // Round netTotal to 2 decimal places before comparing with paid amount
        $netTotal = round($netTotal, 2);

        $paid = max(0.0, min($paidAmount, $netTotal));
        $due = max(0.0, $netTotal - $paid);

        $paymentStatus = 'unpaid';
        if ($due < 0.01) {
            $paymentStatus = 'paid';
            $due = 0.0;
        } elseif ($paid > 0) {
            $paymentStatus = 'partial';
        }

        return [
            'subtotal' => round($subtotal, 2),
            'gst_total' => round($gstTotal, 2),
            'gross_total' => round($grossTotal, 2),
            'discount_amount' => round($discountAmount, 2),
            'net_total' => round($netTotal, 2),
            'paid_amount' => round($paid, 2),
            'due_amount' => round($due, 2),
            'payment_status' => $paymentStatus,
        ];
    }

    /**
     * Common validation rules for Store and Update.
     */
    protected function getValidationRules(): array
    {
        return [
            'vendor_id' => 'required|string|max:100',
            'purchase_date' => 'nullable|date',
            'items' => 'required|array|min:1',
            'items.*.product_master_id' => 'required|string|max:100',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.purchase_price' => 'required|numeric|min:0',
            'items.*.selling_price' => 'nullable|numeric|min:0',
            'items.*.tax_percent' => 'nullable|numeric|min:0|max:100',
            'items.*.tax_amount' => 'nullable|numeric|min:0',
            'items.*.attribute_summary' => 'nullable|string',
            'items.*.attachments' => 'nullable|array',
            'items.*.attachments.*' => 'nullable|file|max:10240',
            'discount_type' => 'nullable|in:percentage,fixed',
            'discount_value' => 'nullable|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string|max:100',
            'upi_reference_no' => 'nullable|string|max:100',
            'payment_screenshot' => 'nullable|file|image|max:5120',
            'payment_note' => 'nullable|string',
            'investor_investment_id' => 'nullable|string|max:100',
            // For updates
            'items.*.id' => 'nullable|exists:inventory_purchase_line_items,id',
            'items.*.existing_attachments' => 'nullable|array',
        ];
    }

    /**
     * List purchases for current branch.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $branchId = AuthContext::branchId();

            $query = Purchase::withoutGlobalScopes()
                ->with(['vendor', 'items.productMaster'])
                ->where('status', 'completed')
                ->orderBy('created_at', 'desc');

            if ($branchId) {
                $query->where(function($q) use ($branchId) {
                    $q->where('branch_id', $branchId)
                      ->orWhere(function($q2) use ($branchId) {
                          $q2->whereNull('branch_id')->where('branch', $branchId);
                      });
                });
            }

            $purchases = $query->get();

            return response()->json([
                'success' => true,
                'message' => 'Purchases retrieved successfully',
                'data' => $purchases,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Database error',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a new purchase with atomic stock updates and concurrency-safe ID generation.
     */
    public function store(Request $request): JsonResponse
    {
        $branchId = AuthContext::branchId();
        $cmsAdmin = AuthContext::cmsAdminId();
        $validator = Validator::make($request->all(), $this->getValidationRules());

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        return DB::transaction(function () use ($request, $branchId, $cmsAdmin) {
            $vendor = $this->resolveVendor($request->vendor_id);
            if (!$vendor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid vendor selected',
                ], 422);
            }

            // 1. Generate Unique ID using Row Locking to prevent race conditions
            $lastPurchase = Purchase::withoutBranchScope()
                ->lockForUpdate()
                ->orderBy('id', 'desc')
                ->first();

            if (!$lastPurchase) {
                $uniqueId = 'INV-PUR-0001';
            } else {
                $numericPart = (int) str_replace('INV-PUR-', '', $lastPurchase->unique_id);
                $uniqueId = 'INV-PUR-' . str_pad($numericPart + 1, 4, '0', STR_PAD_LEFT);
            }

            $purchaseDate = $request->purchase_date ?? now()->toDateString();
            $itemsData = $request->input('items');
            $discountType = $request->input('discount_type', 'percentage');
            $discountValue = (float) $request->input('discount_value', 0);
            $paidAmount = (float) $request->input('paid_amount', 0);
            $totals = $this->computePurchaseTotals($itemsData, $discountType, $discountValue, $paidAmount);
            $invoiceNo = $this->generatePurchaseOrderInvoiceNo((string) $purchaseDate);

            // 1.5 Handle Payment Screenshot
            $screenshotPath = null;
            if ($request->hasFile('payment_screenshot')) {
                $this->ensureDirectoryExists(public_path('inventory/payments'));
                $file = $request->file('payment_screenshot');
                $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                $file->move(public_path('inventory/payments'), $filename);
                $screenshotPath = 'inventory/payments/' . $filename;
            }

            // 2. Create Purchase Header
            $investorInvestmentId = $request->input('investor_investment_id');
            $purchase = Purchase::create([
                'unique_id'               => $uniqueId,
                'invoice_no'              => $invoiceNo,
                'vendor_id'               => $vendor->unique_id,
                'vendor_name'             => $vendor->business_name ?: $vendor->name,
                'vendor_phone'            => $vendor->phone,
                'vendor_address'          => $vendor->address,
                'cms_admin'               => $cmsAdmin,
                'cms_admin_id'            => $cmsAdmin,
                'purchase_date'           => $purchaseDate,
                'total_amount'            => $totals['net_total'],
                'discount_type'           => $discountType,
                'discount_value'          => $discountValue,
                'discount_amount'         => $totals['discount_amount'],
                'paid_amount'             => $totals['paid_amount'],
                'due_amount'              => $totals['due_amount'],
                'payment_status'          => $totals['payment_status'],
                'payment_method'          => $request->input('payment_method', 'Cash'),
                'upi_reference_no'        => $request->input('upi_reference_no'),
                'payment_screenshot'      => $screenshotPath,
                'payment_note'            => $request->input('payment_note'),
                'status'                  => 'completed',
                'branch'                  => $branchId,
                'branch_id'               => $branchId,
                'investor_investment_id'  => $investorInvestmentId,
            ]);

            // Deduct from investor pool if investor selected
            if ($investorInvestmentId && $totals['paid_amount'] > 0) {
                $investment = InvestorInvestment::where('unique_id', $investorInvestmentId)
                    ->lockForUpdate()->first();
                if ($investment) {
                    $currentBalance = $investment->remaining_pool_balance ?? $investment->amount;
                    if ($totals['paid_amount'] > $currentBalance) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Insufficient investor pool balance. Available: ₹' . number_format($currentBalance, 2),
                        ], 422);
                    }
                    
                    // Collect product details for payment history
                    $productDetails = [];
                    foreach ($itemsData as $item) {
                        $product = $this->resolveProduct($item['product_master_id'] ?? null);
                        if ($product) {
                            $productDetails[] = [
                                'product_id' => $product->unique_id,
                                'product_name' => $product->name,
                                'quantity' => $item['quantity'],
                                'price' => $item['purchase_price'],
                                'total' => $item['purchase_price'] * $item['quantity']
                            ];
                        }
                    }
                    
                    $history   = $investment->payment_history ?? [];
                    $paymentId = 'PAY-' . str_pad(count($history) + 1, 5, '0', STR_PAD_LEFT);
                    $history[] = [
                        'payment_id'   => $paymentId,
                        'loan_id'      => null,
                        'inventory_id' => $uniqueId,
                        'purchase_invoice' => $invoiceNo,
                        'vendor_name'  => $vendor->business_name ?: $vendor->name,
                        'products'     => $productDetails,
                        'amount'       => $totals['paid_amount'],
                        'date'         => now()->toDateString(),
                        'type'         => 'inventory/product',
                    ];
                    $investment->remaining_pool_balance = $currentBalance - $totals['paid_amount'];
                    $investment->payment_history        = $history;
                    $investment->save();
                    $purchase->update(['investor_unique_id' => $investment->investor_unique_id]);
                }
            }

            // 3. Process Items and Stock
            foreach ($itemsData as $index => $item) {
                $product = $this->resolveProduct($item['product_master_id'] ?? null);
                if (!$product) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid product selected',
                    ], 422);
                }

                $attachmentsPaths = [];
                if ($request->hasFile("items.$index.attachments")) {
                    $this->ensureDirectoryExists(public_path('inventory/purchases'));
                    foreach ($request->file("items.$index.attachments") as $file) {
                        $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                        $file->move(public_path('inventory/purchases'), $filename);
                        $attachmentsPaths[] = 'inventory/purchases/' . $filename;
                    }
                }

                $purchase->items()->create([
                    'product_master_id' => $product->unique_id,
                    'branch'            => $branchId,
                    'branch_id'         => $branchId,
                    'cms_admin'         => $cmsAdmin,
                    'cms_admin_id'      => $cmsAdmin,
                    'tax_percent'       => $item['tax_percent'] ?? 0,
                    'tax_amount'        => $item['tax_amount'] ?? 0,
                    'quantity'          => $item['quantity'],
                    'purchase_price'    => $item['purchase_price'],
                    'selling_price'     => $item['selling_price'] ?? null,
                    'line_total'        => $item['purchase_price'] * $item['quantity'],
                    'attribute_summary' => $item['attribute_summary'] ?? null,
                    'attachments'       => !empty($attachmentsPaths) ? $attachmentsPaths : null,
                ]);

                // Atomic Stock Update
                ProductMaster::where('id', $product->id)
                    ->increment('stock', $item['quantity']);

                // Sync product default GST% with item GST%
                $this->syncProductDefaultGst(
                    (int) $product->id,
                    $item['tax_percent'] ?? null
                );
                $this->syncProductSellingPrice(
                    (int) $product->id,
                    $item['selling_price'] ?? null
                );
            }

            $purchase = $purchase->refresh()->load(['vendor', 'items.productMaster']);

            return response()->json([
                'success' => true,
                'message' => 'Purchase created successfully',
                'data' => $purchase,
            ]);
        });
    }

    /**
     * Show a single purchase.
     */
    public function show($id): JsonResponse
    {
        $branchId = AuthContext::branchId();
        $purchase = Purchase::with(['vendor', 'items.productMaster'])
            ->where('branch', $branchId)
            ->where(function($query) use ($id) {
                $query->where('id', $id)
                      ->orWhere('unique_id', $id);
            })
            ->first();

        if (!$purchase) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Purchase retrieved successfully',
            'data' => $purchase,
        ]);
    }

    /**
     * Update an existing purchase using Delta Quantity logic for stock management.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $branchId = AuthContext::branchId();
        $cmsAdmin = AuthContext::cmsAdminId();
        $purchase = Purchase::with('items')->where('branch', $branchId)
            ->where(function($query) use ($id) {
                $query->where('id', $id)
                      ->orWhere('unique_id', $id);
            })
            ->first();

        if (!$purchase) {
            return response()->json(['success' => false, 'message' => 'Purchase not found'], 404);
        }

        $validator = Validator::make($request->all(), $this->getValidationRules());
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        return DB::transaction(function () use ($request, $purchase, $cmsAdmin) {
            $vendor = $this->resolveVendor($request->vendor_id);
            if (!$vendor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid vendor selected',
                ], 422);
            }

            $existingItemIds = $purchase->items->pluck('id')->toArray();
            $newItemData = $request->input('items');
            $processedItemIds = [];
            $previousPaid = (float) ($purchase->paid_amount ?? 0);
            $newPayment = (float) $request->input('paid_amount', 0);
            $paidAmount = $previousPaid + $newPayment;

            $discountType = $request->input('discount_type', 'percentage');
            $discountValue = (float) $request->input('discount_value', 0);
            $totals = $this->computePurchaseTotals($newItemData, $discountType, $discountValue, $paidAmount);
            $purchaseDate = $request->purchase_date ?? $purchase->purchase_date ?? now()->toDateString();
            $invoiceNo = $purchase->invoice_no ?: $this->generatePurchaseOrderInvoiceNo((string) $purchaseDate);

            foreach ($newItemData as $index => $data) {
                $product = $this->resolveProduct($data['product_master_id'] ?? null);
                if (!$product) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid product selected',
                    ], 422);
                }

                $resolvedProductId = (int) $product->id;
                $resolvedProductUniqueId = (string) $product->unique_id;
                $lineTotal = ($data['purchase_price'] ?? 0) * ($data['quantity'] ?? 0);

                // Handle Attachments (Merge logic)
                $finalAttachments = [];
                if (isset($data['existing_attachments']) && is_array($data['existing_attachments'])) {
                    $finalAttachments = $data['existing_attachments'];
                }

                if ($request->hasFile("items.$index.attachments")) {
                    $this->ensureDirectoryExists(public_path('inventory/purchases'));
                    foreach ($request->file("items.$index.attachments") as $file) {
                        $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                        $file->move(public_path('inventory/purchases'), $filename);
                        $finalAttachments[] = 'inventory/purchases/' . $filename;
                    }
                }

                // Delta Logic for Stock
                $oldItem = null;
                if (isset($data['id'])) {
                    $oldItem = $purchase->items->find($data['id']);
                }

                if ($oldItem) {
                    $processedItemIds[] = $oldItem->id;
                    $qtyDelta = (int)$data['quantity'] - (int)$oldItem->quantity;

                    // Only update stock if product is the same. Otherwise, swap logic required.
                    if ((string) $oldItem->product_master_id === $resolvedProductUniqueId) {
                        if ($qtyDelta > 0) {
                            ProductMaster::where('id', $resolvedProductId)->increment('stock', abs($qtyDelta));
                        } elseif ($qtyDelta < 0) {
                            ProductMaster::where('id', $resolvedProductId)->decrement('stock', abs($qtyDelta));
                        }
                    } else {
                        // Product changed: Revert old, Increment new
                        ProductMaster::where('unique_id', $oldItem->product_master_id)->decrement('stock', $oldItem->quantity);
                        ProductMaster::where('id', $resolvedProductId)->increment('stock', $data['quantity']);
                    }

                    $oldItem->update([
                        'product_master_id' => $resolvedProductUniqueId,
                        'branch'            => $purchase->branch,
                        'branch_id'         => $purchase->branch_id ?? $purchase->branch,
                        'cms_admin'         => $purchase->cms_admin,
                        'cms_admin_id'      => $purchase->cms_admin_id,
                        'quantity'          => $data['quantity'],
                        'purchase_price'    => $data['purchase_price'],
                        'selling_price'     => $data['selling_price'] ?? $oldItem->selling_price,
                        'line_total'        => $lineTotal,
                        'tax_percent'       => $data['tax_percent'] ?? 0,
                        'tax_amount'        => $data['tax_amount'] ?? 0,
                        'attribute_summary' => $data['attribute_summary'] ?? null,
                        'attachments'       => !empty($finalAttachments) ? $finalAttachments : null,
                    ]);

                    $this->syncProductDefaultGst(
                        $resolvedProductId,
                        $data['tax_percent'] ?? null
                    );
                    $this->syncProductSellingPrice(
                        $resolvedProductId,
                        $data['selling_price'] ?? null
                    );
                } else {
                    // New line item added during edit
                    $newItem = $purchase->items()->create([
                        'product_master_id' => $resolvedProductUniqueId,
                        'branch'            => $purchase->branch,
                        'branch_id'         => $purchase->branch_id ?? $purchase->branch,
                        'cms_admin'         => $purchase->cms_admin,
                        'cms_admin_id'      => $purchase->cms_admin_id,
                        'quantity'          => $data['quantity'],
                        'purchase_price'    => $data['purchase_price'],
                        'selling_price'     => $data['selling_price'] ?? null,
                        'line_total'        => $lineTotal,
                        'tax_percent'       => $data['tax_percent'] ?? 0,
                        'tax_amount'        => $data['tax_amount'] ?? 0,
                        'attribute_summary' => $data['attribute_summary'] ?? null,
                        'attachments'       => !empty($finalAttachments) ? $finalAttachments : null,
                    ]);
                    ProductMaster::where('id', $resolvedProductId)->increment('stock', $data['quantity']);
                    $processedItemIds[] = $newItem->id;

                    $this->syncProductDefaultGst(
                        $resolvedProductId,
                        $data['tax_percent'] ?? null
                    );
                    $this->syncProductSellingPrice(
                        $resolvedProductId,
                        $data['selling_price'] ?? null
                    );
                }
            }

            // Remove items that were deleted from the UI
            $itemsToDelete = array_diff($existingItemIds, $processedItemIds);
            foreach ($itemsToDelete as $delId) {
                $delItem = PurchaseItem::find($delId);
                ProductMaster::where('unique_id', $delItem->product_master_id)->decrement('stock', $delItem->quantity);
                $delItem->delete();
            }

            $purchase->update([
                'invoice_no'     => $invoiceNo,
                'vendor_id'      => $vendor->unique_id,
                'vendor_name'    => $vendor->business_name ?: $vendor->name,
                'vendor_phone'   => $vendor->phone,
                'vendor_address' => $vendor->address,
                'cms_admin'      => $cmsAdmin,
                'cms_admin_id'   => $cmsAdmin,
                'purchase_date'  => $purchaseDate,
                'total_amount'   => $totals['net_total'],
                'discount_type'  => $discountType,
                'discount_value' => $discountValue,
                'discount_amount' => $totals['discount_amount'],
                'paid_amount'    => $totals['paid_amount'],
                'due_amount'     => $totals['due_amount'],
                'payment_status' => $totals['payment_status'],
                'payment_method' => $request->input('payment_method', 'Cash'),
                'upi_reference_no' => $request->input('upi_reference_no'),
                'payment_note'   => $request->input('payment_note'),
                'investor_investment_id' => $request->input('investor_investment_id') ?? $purchase->investor_investment_id,
            ]);

            // Deduct from investor pool if investor selected and NEW payment made
            $investorInvestmentId = $request->input('investor_investment_id');
            if ($investorInvestmentId && $newPayment > 0) {
                $investment = InvestorInvestment::where('unique_id', $investorInvestmentId)
                    ->lockForUpdate()->first();
                if ($investment) {
                    $currentBalance = $investment->remaining_pool_balance ?? $investment->amount;
                    if ($newPayment > $currentBalance) {
                        throw new \Exception('Insufficient investor pool balance. Available: ₹' . number_format($currentBalance, 2));
                    }
                    
                    // Collect product details for payment history
                    $productDetails = [];
                    foreach ($newItemData as $item) {
                        $product = $this->resolveProduct($item['product_master_id'] ?? null);
                        if ($product) {
                            $productDetails[] = [
                                'product_id' => $product->unique_id,
                                'product_name' => $product->name,
                                'quantity' => $item['quantity'],
                                'price' => $item['purchase_price'],
                                'total' => $item['purchase_price'] * $item['quantity']
                            ];
                        }
                    }
                    
                    $history   = $investment->payment_history ?? [];
                    $paymentId = 'PAY-' . str_pad(count($history) + 1, 5, '0', STR_PAD_LEFT);
                    $history[] = [
                        'payment_id'   => $paymentId,
                        'loan_id'      => null,
                        'inventory_id' => $purchase->unique_id ?? (string) $purchase->id,
                        'purchase_invoice' => $invoiceNo,
                        'vendor_name'  => $vendor->business_name ?: $vendor->name,
                        'products'     => $productDetails,
                        'amount'       => $newPayment,
                        'date'         => now()->toDateString(),
                        'type'         => 'inventory_update/product',
                    ];
                    $investment->remaining_pool_balance = $currentBalance - $newPayment;
                    $investment->payment_history        = $history;
                    $investment->save();
                    $purchase->update(['investor_unique_id' => $investment->investor_unique_id]);
                }
            }

            // Update screenshot only if a new file is uploaded
            if ($request->hasFile('payment_screenshot')) {
                $this->ensureDirectoryExists(public_path('inventory/payments'));
                $file = $request->file('payment_screenshot');
                $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                $file->move(public_path('inventory/payments'), $filename);
                $screenshotPath = 'inventory/payments/' . $filename;
                $purchase->update(['payment_screenshot' => $screenshotPath]);
            }

            $purchase = $purchase->refresh()->load(['vendor', 'items.productMaster']);

            return response()->json([
                'success' => true,
                'message' => 'Purchase updated successfully',
                'data' => $purchase,
            ]);
        });
    }

    /**
     * Archive a purchase and rollback its stock impact.
     * Record is retained for audit/history, only line items are removed.
     */
    public function destroy($id): JsonResponse
    {
        try {
            $purchase = Purchase::withoutGlobalScopes()
                ->with('items')
                ->where(function ($query) use ($id) {
                    $query->where('id', $id)->orWhere('unique_id', $id);
                })
                ->first();

            if (!$purchase) {
                return response()->json(['success' => false, 'message' => 'Purchase not found'], 404);
            }

            DB::transaction(function () use ($purchase) {
                // Roll back investor pool deduction and payment history entries linked to this purchase.
                if (!empty($purchase->investor_investment_id)) {
                    $investment = InvestorInvestment::where('unique_id', $purchase->investor_investment_id)
                        ->lockForUpdate()
                        ->first();

                    if ($investment) {
                        $history = collect($investment->payment_history ?? []);
                        $entriesForPurchase = $history->filter(function ($entry) use ($purchase) {
                            if (!is_array($entry)) {
                                return false;
                            }

                            $inventoryId = (string) ($entry['inventory_id'] ?? '');
                            $type = (string) ($entry['type'] ?? '');

                            return $inventoryId === (string) $purchase->unique_id
                                && str_starts_with($type, 'inventory');
                        });

                        $refundAmount = (float) $entriesForPurchase->sum(function ($entry) {
                            return (float) ($entry['amount'] ?? 0);
                        });

                        if ($refundAmount > 0) {
                            $investment->remaining_pool_balance = (float) ($investment->remaining_pool_balance ?? 0) + $refundAmount;
                        }

                        $investment->payment_history = $history
                            ->reject(function ($entry) use ($purchase) {
                                if (!is_array($entry)) {
                                    return false;
                                }

                                $inventoryId = (string) ($entry['inventory_id'] ?? '');
                                $type = (string) ($entry['type'] ?? '');

                                return $inventoryId === (string) $purchase->unique_id
                                    && str_starts_with($type, 'inventory');
                            })
                            ->values()
                            ->all();

                        $investment->save();
                    }
                }

                // Decrement stock for each item
                foreach ($purchase->items as $item) {
                    $product = ProductMaster::withoutGlobalScopes()
                        ->where('unique_id', $item->product_master_id)
                        ->orWhere('id', $item->product_master_id)
                        ->first();
                    if ($product) {
                        $newStock = max(0, (float) $product->stock - (float) $item->quantity);
                        $product->update(['stock' => $newStock]);
                    }

                    $attachments = $item->attachments;
                    if (is_array($attachments)) {
                        foreach ($attachments as $attachmentPath) {
                            $this->deleteStoredFileIfExists(is_string($attachmentPath) ? $attachmentPath : null);
                        }
                    }
                }

                // Delete purchase items so stock is not counted
                $purchase->items()->delete();

                // Delete purchase-level screenshot and finally remove purchase row.
                $this->deleteStoredFileIfExists($purchase->payment_screenshot);
                $purchase->delete();
            });

            return response()->json(['success' => true, 'message' => 'Purchase and related data deleted successfully']);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Database error',
                'error' => 'A database error occurred. Please try again later.',
            ], 500);
        }
    }

    /**
     * Add a payment to an existing purchase.
     */
    public function addPayment(Request $request, $id): JsonResponse
    {
        $branchId = AuthContext::branchId();
        $purchase = Purchase::where('branch', $branchId)
            ->where(function ($query) use ($id) {
                $query->where('id', $id)
                    ->orWhere('unique_id', $id);
            })
            ->first();

        if (!$purchase) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'nullable|string|max:100',
            'transaction_id' => 'nullable|string|max:255',
            'payment_date' => 'required|date',
            'payment_screenshot' => 'nullable|file|image|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            return DB::transaction(function () use ($purchase, $request) {
                $amount = round((float) $request->input('amount', 0), 2);
                $grandTotal = round((float) ($purchase->total_amount ?? 0), 2);
                $newPaidAmount = round((float) ($purchase->paid_amount ?? 0) + $amount, 2);
                $newDueAmount = round($grandTotal - $newPaidAmount, 2);
                $paymentStatus = 'partial';

                if ($newDueAmount <= 0) {
                    $paymentStatus = 'paid';
                    $newDueAmount = 0;
                    $newPaidAmount = $grandTotal;
                } elseif ($newPaidAmount <= 0) {
                    $paymentStatus = 'unpaid';
                }

                $paymentDate = $request->input('payment_date');
                $paymentMethod = $request->input('payment_method', $purchase->payment_method ?: 'Cash');
                $transactionId = trim((string) $request->input('transaction_id', ''));

                $paymentScreenshotPath = $purchase->payment_screenshot;
                if ($request->hasFile('payment_screenshot')) {
                    $this->ensureDirectoryExists(public_path('inventory/payments'));
                    $file = $request->file('payment_screenshot');
                    $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                    $file->move(public_path('inventory/payments'), $filename);
                    $paymentScreenshotPath = 'inventory/payments/' . $filename;
                }

                $existingNote = trim((string) ($purchase->payment_note ?? ''));
                $paymentLine = sprintf(
                    'Payment received on %s: %.2f via %s%s',
                    $paymentDate,
                    $amount,
                    $paymentMethod,
                    $transactionId !== '' ? " (Ref: {$transactionId})" : ''
                );

                $purchase->update([
                    'paid_amount' => $newPaidAmount,
                    'due_amount' => $newDueAmount,
                    'payment_status' => $paymentStatus,
                    'payment_method' => $paymentMethod,
                    'upi_reference_no' => $transactionId ?: $purchase->upi_reference_no,
                    'payment_screenshot' => $paymentScreenshotPath,
                    'payment_note' => $existingNote !== '' ? $existingNote . PHP_EOL . $paymentLine : $paymentLine,
                ]);

                $purchase = $purchase->refresh()->load(['vendor', 'items.productMaster']);

                return response()->json([
                    'success' => true,
                    'message' => 'Purchase payment added successfully',
                    'data' => $purchase,
                ]);
            });
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to add payment: ' . $e->getMessage(),
            ], 500);
        }
    }
}
