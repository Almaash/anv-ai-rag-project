<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Helpers\AuthContext;
use App\Models\Inventory\Purchase;
use Illuminate\Http\JsonResponse;

class PurchaseInvoiceController extends Controller
{
    private function resolvePurchaseByIdentifier($identifier): ?Purchase
    {
        if ($identifier === null || $identifier === '') {
            return null;
        }

        $value = trim((string) $identifier);
        if ($value === '') {
            return null;
        }

        if (ctype_digit($value)) {
            return Purchase::find((int) $value);
        }

        return Purchase::where('unique_id', $value)->first();
    }

    private function generatePurchaseInvoiceNo(Purchase $purchase): string
    {
        $datePrefix = date('Ymd', strtotime($purchase->purchase_date ?? now()->toDateString()));

        $lastInvoice = Purchase::withoutBranchScope()
            ->where('invoice_no', 'like', "PINV-{$datePrefix}-%")
            ->orderByDesc('id')
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

    private function toInvoicePayload(Purchase $purchase): array
    {
        $purchase->loadMissing(['vendor', 'items.productMaster.category', 'items.productMaster.brand', 'items.productMaster.unit']);

        $subtotal = 0.0;
        $taxAmount = 0.0;

        $items = $purchase->items->map(function ($item) use (&$subtotal, &$taxAmount) {
            $qty = (float) ($item->quantity ?? 0);
            $rate = (float) ($item->purchase_price ?? 0);
            $lineSubtotal = $qty * $rate;
            $subtotal += $lineSubtotal;

            $lineTax = (float) ($item->tax_amount ?? 0);
            if ($lineTax <= 0) {
                $percent = (float) ($item->tax_percent ?? 0);
                if ($percent > 0) {
                    $lineTax = ($lineSubtotal * $percent) / 100;
                }
            }
            $taxAmount += $lineTax;

            return [
                'id' => $item->id,
                'purchase_order_id' => $item->purchase_id,
                'purchase_invoice_id' => $item->purchase_id,
                'product_master_id' => $item->product_master_id,
                'product_name' => $item->product_name ?: optional($item->productMaster)->name,
                'quantity' => $item->quantity,
                'rate' => $item->purchase_price,
                'amount' => round($lineSubtotal, 2),
                'attribute_summary' => $item->attribute_summary,
                'tax_percent' => $item->tax_percent,
                'tax_amount' => $item->tax_amount,
                'product_master' => $item->productMaster,
            ];
        })->values();

        return [
            'id' => $purchase->id,
            'purchase_id' => $purchase->unique_id,
            'cms_admin' => $purchase->cms_admin,
            'cms_admin_id' => $purchase->cms_admin_id,
            'invoice_no' => $purchase->invoice_no,
            'invoice_date' => $purchase->purchase_date,
            'vendor_name' => $purchase->vendor_name ?: ($purchase->vendor?->business_name ?: $purchase->vendor?->name),
            'vendor_phone' => $purchase->vendor_phone ?: $purchase->vendor?->phone,
            'vendor_address' => $purchase->vendor_address ?: $purchase->vendor?->address,
            'subtotal' => round($subtotal, 2),
            'discount_amount' => (float) ($purchase->discount_amount ?? 0),
            'tax_amount' => round($taxAmount, 2),
            'grand_total' => (float) ($purchase->total_amount ?? 0),
            'paid_amount' => (float) ($purchase->paid_amount ?? 0),
            'due_amount' => (float) ($purchase->due_amount ?? 0),
            'payment_method' => $purchase->payment_method,
            'payment_status' => $purchase->payment_status,
            'upi_reference_no' => $purchase->upi_reference_no,
            'payment_screenshot' => $purchase->payment_screenshot,
            'notes' => $purchase->payment_note,
            'event_no' => 1,
            'event_type' => 'consolidated',
            'branch' => $purchase->branch,
            'branch_id' => $purchase->branch_id,
            'purchase' => $purchase,
            'items' => $items,
        ];
    }

    /**
     * Show one purchase invoice snapshot (print friendly).
     */
    public function show($id): JsonResponse
    {
        $invoiceSource = Purchase::with(['vendor', 'items.productMaster.category', 'items.productMaster.brand', 'items.productMaster.unit'])
            ->where(function ($query) use ($id) {
                $query->where('id', $id)
                    ->orWhere('unique_id', $id)
                    ->orWhere('invoice_no', $id);
            })
            ->first();

        if (!$invoiceSource) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase invoice not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Purchase invoice retrieved successfully',
            'data' => $this->toInvoicePayload($invoiceSource),
        ]);
    }

    /**
     * List invoice snapshots for a purchase (latest first).
     */
    public function byPurchase($purchaseId): JsonResponse
    {
        $purchase = $this->resolvePurchaseByIdentifier($purchaseId);
        if (!$purchase) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase not found',
                'data' => [],
            ], 404);
        }

        $invoices = collect([$this->toInvoicePayload($purchase)]);

        return response()->json([
            'success' => true,
            'message' => 'Purchase invoice history retrieved successfully',
            'data' => $invoices,
        ]);
    }

    /**
     * Generate a purchase invoice snapshot on demand (for old records).
     */
    public function generateByPurchase($purchaseId): JsonResponse
    {
        $branchId = AuthContext::branchId();
        $resolvedPurchase = $this->resolvePurchaseByIdentifier($purchaseId);
        if (!$resolvedPurchase) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase not found',
            ], 404);
        }

        $purchase = Purchase::with(['vendor', 'items.productMaster'])
            ->where('branch', $branchId)
            ->where('id', $resolvedPurchase->id)
            ->first();

        if (!$purchase) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase not found',
            ], 404);
        }

        if (empty($purchase->invoice_no)) {
            $purchase->invoice_no = $this->generatePurchaseInvoiceNo($purchase);
        }

        if (empty($purchase->vendor_name)) {
            $purchase->vendor_name = $purchase->vendor?->business_name ?: $purchase->vendor?->name;
        }

        if (empty($purchase->vendor_phone)) {
            $purchase->vendor_phone = $purchase->vendor?->phone;
        }

        if (empty($purchase->vendor_address)) {
            $purchase->vendor_address = $purchase->vendor?->address;
        }

        $purchase->save();

        $purchase->refresh()->load(['vendor', 'items.productMaster.category', 'items.productMaster.brand', 'items.productMaster.unit']);

        return response()->json([
            'success' => true,
            'message' => 'Purchase invoice generated successfully',
            'data' => $this->toInvoicePayload($purchase),
        ]);
    }
}
