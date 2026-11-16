<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Helpers\AuthContext;
use App\Models\Inventory\Vendor;
use App\Models\Inventory\ProductMaster;
use App\Models\Inventory\Attribute;
use App\Models\Inventory\Purchase;
use Illuminate\Http\JsonResponse;

class PurchaseMasterDataController extends Controller
{
    /**
     * Get optimized master data for creating or editing a purchase.
     *
     * @param int|null $id
     * @return JsonResponse
     */
    public function getMasterData($id = null): JsonResponse
    {
        try {
            $branch = AuthContext::branchId();

            $vendors = Vendor::withoutGlobalScopes()
                ->select('id', 'name', 'business_name', 'phone', 'unique_id')
                ->where('status', 'active')
                ->when($branch, fn($q) => $q->where(function($q2) use ($branch) {
                    $q2->where('branch_id', $branch)->orWhere(function($q3) use ($branch) {
                        $q3->whereNull('branch_id')->where('branch', $branch);
                    });
                }))
                ->orderBy('name', 'asc')
                ->get();

            $products = ProductMaster::withoutGlobalScopes()
                ->select('id', 'name', 'category_id', 'selling_price', 'stock', 'unique_id')
                ->with(['category:id,name,unique_id'])
                ->where('status', 'active')
                ->when($branch, fn($q) => $q->where(function($q2) use ($branch) {
                    $q2->where('branch_id', $branch)->orWhere(function($q3) use ($branch) {
                        $q3->whereNull('branch_id')->where('branch', $branch);
                    });
                }))
                ->orderBy('name', 'asc')
                ->get()
                ->map(function ($p) {
                    return [
                        'id'          => $p->id,
                        'name'        => $p->name,
                        'unique_id'   => $p->unique_id,
                        'category_id' => $p->category_id,
                        'selling_price' => $p->selling_price,
                        'stock'       => $p->stock,
                        'category'    => $p->category ? ['id' => $p->category->id, 'name' => $p->category->name] : null,
                    ];
                });

            // Fetch attributes - optimized mapping
            $attributes = Attribute::select('id', 'name', 'values', 'category_id', 'status')
                ->where('status', 'active')
                ->whereNotNull('category_id')
                ->orderBy('name', 'asc')
                ->get();

            $purchaseData = null;
            if ($id) {
                // Fetch purchase with items and vendor
                $purchaseData = Purchase::with(['items', 'vendor'])
                    ->where(function($query) use ($id) {
                        $query->where('id', $id)
                              ->orWhere('unique_id', $id);
                    })
                    ->first();
                
                if (!$purchaseData) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Purchase not found'
                    ], 404);
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'purchase' => $purchaseData,
                    'vendors' => $vendors,
                    'products' => $products,
                    'attributes' => $attributes,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load purchase master data',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
