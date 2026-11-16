<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory\InventorySale;
use App\Models\Inventory\ProductMaster;
use App\Models\Inventory\PurchaseItem;
use App\Models\Inventory\InvoiceItem;
use Illuminate\Http\Request;
use App\Http\Helpers\AuthContext;
use Illuminate\Support\Facades\DB;

class DirectSaleController extends Controller
{
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

    private function formatPurchaseItemUniqueId(int $id): string
    {
        return 'INV-PI-' . str_pad((string) $id, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Create a direct sale and update stock
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|string|max:100',
            'purchase_item_id' => 'required|string|max:100',
            'quantity' => 'required|numeric|min:0.01',
            'selling_price' => 'required|numeric|min:0',
            'sale_source' => 'required|string',
            'customer_reference' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            return DB::transaction(function () use ($request) {
                $purchaseItem = $this->resolvePurchaseItem($request->purchase_item_id);
                $product = $this->resolveProduct($request->product_id);

                if (!$purchaseItem || !$product) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid product or variant selected.',
                    ], 422);
                }

                // 1. Calculate current available stock for this specific purchase item
                                $purchaseItemUniqueId = $this->formatPurchaseItemUniqueId((int) $purchaseItem->id);
                                $soldQty = InvoiceItem::where(function ($q) use ($purchaseItem, $purchaseItemUniqueId) {
                                                        $q->where('purchase_item_id', (string) $purchaseItemUniqueId)
                                                            ->orWhere('purchase_item_id', (string) $purchaseItem->id)
                                                            ->orWhere('purchase_item_unique_id', (string) $purchaseItemUniqueId);
                                                     })->sum('quantity') + 
                                                     InventorySale::where(function ($q) use ($purchaseItem, $purchaseItemUniqueId) {
                                                             $q->where('purchase_item_id', (string) $purchaseItemUniqueId)
                                                                 ->orWhere('purchase_item_id', (string) $purchaseItem->id);
                                                     })->sum('quantity');
                
                $currentStock = $purchaseItem->quantity - $soldQty;

                // 2. Validate quantity
                if ($request->quantity > $currentStock) {
                    return response()->json([
                        'success' => false, 
                        'message' => "Stock Unavailable! Only $currentStock left for this variant."
                    ], 400);
                }

                // 3. Create Sales Record
                $sale = InventorySale::create([
                    'product_id'         => $product->unique_id,
                    'purchase_item_id'   => $this->formatPurchaseItemUniqueId((int) $purchaseItem->id),
                    'product_name'       => $product->name,
                    'attribute_summary'  => $purchaseItem->attribute_summary ?? 'Default',
                    'quantity'           => $request->quantity,
                    'selling_price'      => $request->selling_price,
                    'total_amount'       => $request->quantity * $request->selling_price,
                    'sale_source'        => $request->sale_source,
                    'customer_reference' => $request->customer_reference,
                    'sale_date'          => now(),
                    'branch'             => AuthContext::branchId(),
                    'branch_id'          => AuthContext::branchId(),
                    'cms_admin_id'       => AuthContext::cmsAdminId(),
                ]);

                // 4. Update product master aggregate stock cache
                if (Schema::hasColumn('inventory_product_masters', 'stock')) {
                    $product->decrement('stock', $request->quantity);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Product Issued/Sold Successfully!',
                    'data' => $sale
                ]);
            });
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * List all direct sales
     */
    public function index()
    {
        try {
            $sales = InventorySale::orderBy('sale_date', 'desc')->get();
            return response()->json(['success' => true, 'data' => $sales]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
