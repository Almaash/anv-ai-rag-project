<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Helpers\AuthContext;
use App\Models\Inventory\AdvanceBooking;
use App\Models\Inventory\AdvanceBookingItem;
use App\Models\Inventory\ProductMaster;
use App\Models\Inventory\PurchaseItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class AdvanceBookingController extends Controller
{
    private function generateBookingNo(string $date): string
    {
        $prefix = 'ABK-' . date('Ymd', strtotime($date));

        $last = AdvanceBooking::withTrashed()
            ->where('booking_no', 'like', "{$prefix}-%")
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();

        $next = $last ? ((int) last(explode('-', $last->booking_no)) + 1) : 1;
        $candidate = $prefix . '-' . str_pad($next, 4, '0', STR_PAD_LEFT);

        while (AdvanceBooking::withTrashed()->where('booking_no', $candidate)->exists()) {
            $next++;
            $candidate = $prefix . '-' . str_pad($next, 4, '0', STR_PAD_LEFT);
        }

        return $candidate;
    }

    private function formatItemUniqueId(int $id): string
    {
        return 'ABK-ITEM-' . str_pad($id, 6, '0', STR_PAD_LEFT);
    }

    private function resolveProduct($value): ?ProductMaster
    {
        if (empty($value)) return null;
        $input = trim((string) $value);
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
        if (empty($value)) return null;
        $input = trim((string) $value);
        if (preg_match('/^INV-PI-(\d+)$/', $input, $m)) {
            return PurchaseItem::find((int) $m[1]);
        }
        if (ctype_digit($input)) {
            return PurchaseItem::find((int) $input);
        }
        return null;
    }

    private function formatPurchaseItemUniqueId(int $id): string
    {
        return 'INV-PI-' . str_pad($id, 6, '0', STR_PAD_LEFT);
    }

    /** Resolve booking date: booking_date → order_date → invoice_date → today */
    private function resolveBookingDate(Request $request): string
    {
        return $request->booking_date
            ?? $request->order_date
            ?? $request->invoice_date
            ?? now()->toDateString();
    }

    /** Accept paid_amount (invoice-style) or advance_paid */
    private function resolveAdvancePaid(Request $request): float
    {
        if ($request->filled('paid_amount')) {
            return (float) $request->paid_amount;
        }
        return (float) ($request->advance_paid ?? 0);
    }

    private function validationRules(): array
    {
        return [
            'customer_name'             => 'required|string|max:255',
            'customer_phone'            => ['required', 'regex:/^[0-9]{10}$/'],
            'customer_address'          => 'nullable|string|max:1000',
            'booking_date'              => 'nullable|date',
            'order_date'                => 'nullable|date',
            'invoice_date'              => 'nullable|date',
            'expected_delivery_date'    => 'nullable|date',
            'tax_type'                  => 'nullable|in:percentage,fixed',
            'tax_value'                 => 'nullable|numeric|min:0',
            'discount_type'             => 'nullable|in:percentage,fixed',
            'discount_value'            => 'nullable|numeric|min:0',
            'advance_paid'              => 'nullable|numeric|min:0',
            'paid_amount'               => 'nullable|numeric|min:0',
            'payment_type'              => 'nullable|string|max:50',
            'upi_reference_no'          => 'nullable|string|max:100',
            'payment_screenshot'        => 'nullable|file|image|max:5120',
            'notes'                     => 'nullable|string',
            'items'                     => 'required|array|min:1',
            'items.*.product_id'        => 'required|string|max:100',
            'items.*.purchase_item_id'  => 'nullable|string|max:100',
            'items.*.product_name'      => 'required|string|max:255',
            'items.*.attribute_summary' => 'nullable|string|max:500',
            'items.*.quantity'          => 'required|numeric|min:0.01',
            'items.*.price'             => 'required|numeric|min:0',
            'items.*.discount_type'     => 'nullable|in:percentage,fixed',
            'items.*.discount_value'    => 'nullable|numeric|min:0',
            'items.*.tax_type'          => 'nullable|in:percentage,fixed',
            'items.*.tax_value'         => 'nullable|numeric|min:0',
        ];
    }

    private function calcTotals(array $items, Request $request): array
    {
        $subtotal = 0;
        foreach ($items as $item) {
            $qty      = (float) ($item['quantity'] ?? 0);
            $price    = (float) ($item['price'] ?? 0);
            $discType = $item['discount_type'] ?? 'percentage';
            $discVal  = (float) ($item['discount_value'] ?? 0);
            $taxType  = $item['tax_type'] ?? 'percentage';
            $taxVal   = (float) ($item['tax_value'] ?? 0);

            $lineTotal = $qty * $price;
            $lineDisc  = $discType === 'percentage' ? ($lineTotal * $discVal / 100) : $discVal;
            $lineTax   = $taxType  === 'percentage' ? (($lineTotal - $lineDisc) * $taxVal / 100) : $taxVal;
            $subtotal += $lineTotal - $lineDisc + $lineTax;
        }

        $discType  = $request->discount_type ?? 'percentage';
        $discVal   = (float) ($request->discount_value ?? 0);
        $discAmt   = $discVal > 0
            ? ($discType === 'percentage' ? min($subtotal * $discVal / 100, $subtotal) : $discVal)
            : 0;

        $grandTotal    = max(0, $subtotal - $discAmt);
        $advancePaid   = $this->resolveAdvancePaid($request);
        $balanceAmount = $grandTotal - $advancePaid;

        return compact('subtotal', 'discAmt', 'grandTotal', 'advancePaid', 'balanceAmount');
    }

    private function saveItems(string $bookingNo, array $items, ?string $branchId, ?string $cmsAdmin): void
    {
        foreach ($items as $item) {
            $qty      = (float) ($item['quantity'] ?? 0);
            $price    = (float) ($item['price'] ?? 0);
            $discType = $item['discount_type'] ?? 'percentage';
            $discVal  = (float) ($item['discount_value'] ?? 0);
            $taxType  = $item['tax_type'] ?? 'percentage';
            $taxVal   = (float) ($item['tax_value'] ?? 0);

            $lineTotal = $qty * $price;
            $lineDisc  = $discType === 'percentage' ? ($lineTotal * $discVal / 100) : $discVal;
            $lineTax   = $taxType  === 'percentage' ? (($lineTotal - $lineDisc) * $taxVal / 100) : $taxVal;

            $product      = $this->resolveProduct($item['product_id'] ?? null);
            $purchaseItem = $this->resolvePurchaseItem($item['purchase_item_id'] ?? null);
            $piUniqueId   = $purchaseItem ? $this->formatPurchaseItemUniqueId((int) $purchaseItem->id) : null;

            $row = AdvanceBookingItem::create([
                'booking_id'              => $bookingNo,
                'product_id'              => $product?->unique_id ?? $item['product_id'],
                'product_unique_id'       => $product?->unique_id,
                'purchase_item_id'        => $piUniqueId,
                'purchase_item_unique_id' => $piUniqueId,
                'product_name'            => $item['product_name'],
                'attribute_summary'       => $item['attribute_summary'] ?? null,
                'quantity'                => $qty,
                'price'                   => $price,
                'discount_type'           => $discType,
                'discount_value'          => $discVal,
                'discount_amount'         => $lineDisc,
                'tax_type'                => $taxType,
                'tax_value'               => $taxVal,
                'tax_amount'              => $lineTax,
                'total'                   => $lineTotal - $lineDisc + $lineTax,
                'branch_id'               => $branchId,
                'cms_admin_id'            => $cmsAdmin,
            ]);

            if (empty($row->unique_id)) {
                $row->unique_id = $this->formatItemUniqueId((int) $row->id);
                $row->save();
            }
        }
    }

    private function handleScreenshotUpload(Request $request): ?string
    {
        if (!$request->hasFile('payment_screenshot')) return null;
        $file     = $request->file('payment_screenshot');
        $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
        $file->move(public_path('inventory/payments'), $filename);
        return 'inventory/payments/' . $filename;
    }

    // GET /api/inventory/advance-bookings
    public function index(Request $request): JsonResponse
    {
        try {
            $branchId = AuthContext::branchId();
            $perPage  = $request->get('per_page', 10);
            $search   = $request->get('search', '');
            $status   = $request->get('status');

            $query = AdvanceBooking::with('items')
                ->whereNull('deleted_at')
                ->where('is_deleted', 0)
                ->orderByDesc('created_at');

            if ($branchId) {
                $query->where(function ($q) use ($branchId) {
                    $q->where('branch_id', $branchId)->orWhere('branch', $branchId);
                });
            }

            if (!empty($search)) {
                $query->where(function ($q) use ($search) {
                    $q->where('booking_no', 'like', "%$search%")
                      ->orWhere('customer_name', 'like', "%$search%")
                      ->orWhere('customer_phone', 'like', "%$search%");
                });
            }

            if (!empty($status)) {
                $query->where('status', $status);
            }

            return response()->json(['status' => 'success', 'data' => $query->paginate($perPage)]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // GET /api/inventory/advance-bookings/{id}
    public function show($id): JsonResponse
    {
        $booking = AdvanceBooking::withTrashed()
            ->with('items')
            ->where('id', $id)
            ->orWhere('booking_no', $id)
            ->first();

        if (!$booking) {
            return response()->json(['status' => 'error', 'message' => 'Booking not found'], 404);
        }

        if ($booking->is_deleted || !is_null($booking->deleted_at)) {
            return response()->json(['status' => 'error', 'message' => 'Booking is deleted'], 410);
        }

        return response()->json(['status' => 'success', 'data' => $booking]);
    }

    // POST /api/inventory/advance-bookings
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), $this->validationRules());
        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        try {
            $booking = DB::transaction(function () use ($request) {
                $totals      = $this->calcTotals($request->items, $request);
                $branchId    = AuthContext::branchId();
                $cmsAdmin    = AuthContext::cmsAdminId();
                $bookingDate = $this->resolveBookingDate($request);

                $booking = AdvanceBooking::create([
                    'booking_no'             => $this->generateBookingNo($bookingDate),
                    'customer_name'          => $request->customer_name,
                    'customer_phone'         => $request->customer_phone,
                    'customer_address'       => $request->customer_address,
                    'booking_date'           => $bookingDate,
                    'expected_delivery_date' => $request->expected_delivery_date,
                    'subtotal'               => $totals['subtotal'],
                    'tax_type'               => $request->tax_type ?? 'percentage',
                    'tax_value'              => $request->tax_value ?? 0,
                    'tax_amount'             => 0,
                    'discount_type'          => $request->discount_type ?? 'percentage',
                    'discount_value'         => $request->discount_value ?? 0,
                    'discount_amount'        => $totals['discAmt'],
                    'grand_total'            => $totals['grandTotal'],
                    'advance_paid'           => $totals['advancePaid'],
                    'paid_amount'            => $totals['advancePaid'],
                    'balance_amount'         => $totals['balanceAmount'],
                    'payment_method'         => $request->payment_type,
                    'upi_reference_no'       => $request->upi_reference_no,
                    'payment_screenshot'     => $this->handleScreenshotUpload($request),
                    'notes'                  => $request->notes,
                    'status'                 => 'pending',
                    'is_deleted'             => 0,
                    'branch'                 => $branchId,
                    'branch_id'              => $branchId,
                    'cms_admin_id'           => $cmsAdmin,
                ]);

                $this->saveItems($booking->booking_no, $request->items, $branchId, $cmsAdmin);

                return $booking;
            });

            return response()->json([
                'status'  => 'success',
                'message' => 'Advance booking created successfully',
                'data'    => $booking->load('items'),
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Failed to create booking: ' . $e->getMessage()], 500);
        }
    }

    // PUT/POST /api/inventory/advance-bookings/{id}
    public function update(Request $request, $id): JsonResponse
    {
        $booking = AdvanceBooking::withTrashed()
            ->where('id', $id)->orWhere('booking_no', $id)->first();

        if (!$booking) {
            return response()->json(['status' => 'error', 'message' => 'Booking not found'], 404);
        }

        if ($booking->is_deleted || !is_null($booking->deleted_at)) {
            return response()->json(['status' => 'error', 'message' => 'Cannot update a deleted booking'], 410);
        }

        $validator = Validator::make($request->all(), $this->validationRules());
        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        try {
            $booking = DB::transaction(function () use ($request, $booking) {
                $totals   = $this->calcTotals($request->items, $request);
                $branchId = AuthContext::branchId();
                $cmsAdmin = AuthContext::cmsAdminId();

                $updateData = [
                    'customer_name'          => $request->customer_name,
                    'customer_phone'         => $request->customer_phone,
                    'customer_address'       => $request->customer_address,
                    'booking_date'           => $this->resolveBookingDate($request),
                    'expected_delivery_date' => $request->expected_delivery_date,
                    'subtotal'               => $totals['subtotal'],
                    'tax_type'               => $request->tax_type ?? 'percentage',
                    'tax_value'              => $request->tax_value ?? 0,
                    'tax_amount'             => 0,
                    'discount_type'          => $request->discount_type ?? 'percentage',
                    'discount_value'         => $request->discount_value ?? 0,
                    'discount_amount'        => $totals['discAmt'],
                    'grand_total'            => $totals['grandTotal'],
                    'advance_paid'           => $totals['advancePaid'],
                    'paid_amount'            => $totals['advancePaid'],
                    'balance_amount'         => $totals['balanceAmount'],
                    'payment_method'         => $request->payment_type,
                    'upi_reference_no'       => $request->upi_reference_no,
                    'notes'                  => $request->notes,
                    'status'                 => $request->status ?? $booking->status,
                ];

                $screenshot = $this->handleScreenshotUpload($request);
                if ($screenshot) {
                    $updateData['payment_screenshot'] = $screenshot;
                }

                $booking->update($updateData);

                AdvanceBookingItem::where('booking_id', $booking->booking_no)->delete();
                $this->saveItems($booking->booking_no, $request->items, $branchId, $cmsAdmin);

                return $booking;
            });

            return response()->json([
                'status'  => 'success',
                'message' => 'Advance booking updated successfully',
                'data'    => $booking->load('items'),
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Failed to update booking: ' . $e->getMessage()], 500);
        }
    }

    // DELETE /api/inventory/advance-bookings/{id}
    public function destroy($id): JsonResponse
    {
        $booking = AdvanceBooking::withTrashed()
            ->where('id', $id)->orWhere('booking_no', $id)->first();

        if (!$booking) {
            return response()->json(['status' => 'error', 'message' => 'Booking not found'], 404);
        }

        if ($booking->is_deleted || !is_null($booking->deleted_at)) {
            return response()->json(['status' => 'success', 'message' => 'Booking already deleted']);
        }

        try {
            DB::transaction(function () use ($booking) {
                $booking->update(['status' => 'cancelled', 'is_deleted' => 1]);
                AdvanceBookingItem::where('booking_id', $booking->booking_no)->update(['is_deleted' => 1]);
                AdvanceBookingItem::where('booking_id', $booking->booking_no)->delete();
                $booking->delete();
            });

            return response()->json(['status' => 'success', 'message' => 'Advance booking cancelled successfully']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Failed to cancel booking: ' . $e->getMessage()], 500);
        }
    }
}
