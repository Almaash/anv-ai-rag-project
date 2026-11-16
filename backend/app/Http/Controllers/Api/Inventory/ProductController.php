<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory\ProductMaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProductController extends Controller
{
    /**
     * Return a list of all products (variants) stored in the inventory database for the current branch.
     * Each variant is a unique combination of product_master_id + attribute_summary.
     */
    public function index(): JsonResponse
    {
        try {
            $branchId = Auth::user()->branch;

            // Fetch unique product variants from purchase items with their total quantities
            $variants = \DB::table('inventory_purchase_line_items as pi')
                ->join('inventory_product_masters as pm', 'pm.unique_id', '=', 'pi.product_master_id')
                ->leftJoin('inventory_categories as c', 'c.id', '=', 'pm.category_id') // Join with category for name
                ->leftJoin('inventory_brands as b', 'b.id', '=', 'pm.brand_id')      // Join with brand for name
                ->where('pm.branch', $branchId)
                ->select(
                    'pm.id as product_master_id',
                    'pm.unique_id',
                    'pm.name as product_name',
                    'pm.sku_code',
                    'pm.selling_price',
                    'pm.description',
                    'pm.status',
                    'c.name as category_name',
                    'b.name as brand_name',
                    'pi.attribute_summary',
                    \DB::raw('SUM(pi.quantity) as total_purchased')
                )
                ->groupBy(
                    'pm.id', 'pm.unique_id', 'pm.name', 'pm.sku_code', 'pm.selling_price', 
                    'pm.description', 'pm.status', 'c.name', 'b.name', 'pi.attribute_summary'
                )
                ->get();

            // Fetch sales for each variant to calculate current stock
            $sales = \DB::table('inventory_invoice_items as ii')
                ->join('inventory_invoices as i', 'i.invoice_no', '=', 'ii.invoice_id')
                ->where('i.branch', $branchId)
                ->select('ii.product_id', 'ii.attribute_summary', \DB::raw('SUM(ii.quantity) as total_sold'))
                ->groupBy('ii.product_id', 'ii.attribute_summary')
                ->get()
                ->groupBy(function($item) {
                    return $item->product_id . '|' . $item->attribute_summary;
                });

            $formattedProducts = $variants->map(function ($variant) use ($sales) {
                $variantKey = $variant->unique_id . '|' . $variant->attribute_summary;
                $totalSold = isset($sales[$variantKey]) ? $sales[$variantKey]->first()->total_sold : 0;
                $currentStock = $variant->total_purchased - $totalSold;

                $attributes = $this->parseSummary($variant->attribute_summary);

                return [
                    'id' => $variant->product_master_id,
                    'variant_key' => $variantKey,
                    'product_id' => $variant->unique_id,
                    'product_name' => $variant->product_name,
                    'product_code' => $variant->sku_code,
                    'category' => $variant->category_name ?? 'Uncategorized',
                    'brand' => $variant->brand_name ?? 'N/A',
                    'price' => (float)$variant->selling_price,
                    'stock_quantity' => (float)$currentStock,
                    'total_purchased' => (float)$variant->total_purchased,
                    'total_sold' => (float)$totalSold,
                    'status' => $variant->status,
                    'description' => $variant->description ?? '',
                    'attribute_summary' => $variant->attribute_summary,
                    'attributes' => $attributes
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedProducts
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch variants',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Parse attribute_summary string into a key-value object.
     */
    private function parseSummary($summary): array
    {
        if (empty($summary)) {
            return [];
        }

        $attributes = [];
        $pairs = explode(',', $summary);
        foreach ($pairs as $pair) {
            $parts = explode(':', $pair);
            if (count($parts) === 2) {
                $key = strtolower(trim($parts[0]));
                $value = trim($parts[1]);
                $attributes[$key] = $value;
            }
        }
        return $attributes;
    }
}
