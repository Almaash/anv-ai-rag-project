<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory\Brand;
use App\Models\Inventory\Category;
use App\Models\Inventory\Unit;
use App\Models\Inventory\Attribute;
use App\Models\Inventory\ProductMaster;
use App\Models\Inventory\PurchaseItem;
use App\Models\Inventory\InvoiceItem;
use App\Models\Inventory\InventorySale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\UploadedFile;
use App\Http\Helpers\AuthContext;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ProductMasterController extends Controller
{
    private function extractUploadedProductImages(Request $request): array
    {
        $files = $request->file('product_images');

        if ($files instanceof UploadedFile) {
            return [$files];
        }

        if (is_array($files)) {
            return array_values(array_filter($files, fn ($file) => $file instanceof UploadedFile));
        }

        // Fallback for bracket-style field names in some multipart clients.
        $fallback = $request->file('product_images.*');
        if (is_array($fallback)) {
            return array_values(array_filter($fallback, fn ($file) => $file instanceof UploadedFile));
        }

        return [];
    }

    private function saveProductImages(array $images): array
    {
        $destinationPath = public_path('inventory/product-master-images');
        File::ensureDirectoryExists($destinationPath);

        $savedPaths = [];
        foreach ($images as $image) {
            if (!$image instanceof UploadedFile) {
                continue;
            }

            $filename = uniqid('pm_', true) . '.' . strtolower($image->getClientOriginalExtension());
            $image->move($destinationPath, $filename);
            $savedPaths[] = '/inventory/product-master-images/' . $filename;
        }

        return $savedPaths;
    }

    private function deleteProductImages(?array $paths): void
    {
        if (!$paths) {
            return;
        }

        foreach ($paths as $path) {
            if (!$path || !is_string($path)) {
                continue;
            }

            $absolutePath = public_path(ltrim($path, '/'));
            if (file_exists($absolutePath)) {
                @unlink($absolutePath);
            }
        }
    }

    private function resolveMasterReferenceUniqueId($value, string $modelClass): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $record = $modelClass::query()
            ->select('id', 'unique_id')
            ->where('unique_id', (string) $value)
            ->orWhere('id', (string) $value)
            ->first();

        return $record?->unique_id;
    }

    private function formatPurchaseItemUniqueId(int $id): string
    {
        return 'INV-PI-' . str_pad((string) $id, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Loan-buy catalog payload:
     * returns product master data plus applicable attribute definitions/values
     * so loan/inventory purchase screens can consume one clean detail API.
     */
    public function getLoanReadyProductCatalog(Request $request)
    {
        try {
            // Eager load all relations to avoid N+1 queries
            // Resolve branch_id (numeric id) to branch code for filtering
            $branchCode = null;
            if ($request->filled('branch_id') && $request->branch_id !== 'all') {
                $branchCode = \DB::table('branches')->where('id', $request->branch_id)->value('code');
            } elseif ($request->filled('branch')) {
                $branchCode = $request->branch;
            }

            $products = ProductMaster::withoutGlobalScopes()
                ->with(['category', 'brand', 'unit', 'purchaseItems' => function($query) {
                    $query->select('id', 'product_master_id', 'attribute_summary', 'quantity', 'purchase_price', 'selling_price')
                          ->where('purchase_price', '>', 0);
                }])
                ->where('status', 'active')
                ->whereExists(function ($subQuery) use ($branchCode) {
                    $subQuery->selectRaw('1')
                        ->from('inventory_purchase_line_items as ipi')
                        ->join('inventory_purchase_orders as ip', function ($join) {
                            $join->whereRaw('CAST(ip.unique_id AS CHAR) = CAST(ipi.purchase_id AS CHAR)')
                                ->orWhereRaw('CAST(ip.id AS CHAR) = CAST(ipi.purchase_id AS CHAR)');
                        })
                        ->where('ip.status', 'completed')
                        ->where('ipi.purchase_price', '>', 0)
                        ->where(function ($purchaseBranchMatch) {
                            $purchaseBranchMatch
                                ->whereRaw('CAST(ip.branch_id AS CHAR) = CAST(inventory_product_masters.branch AS CHAR)')
                                ->orWhereRaw('CAST(ip.branch AS CHAR) = CAST(inventory_product_masters.branch AS CHAR)');
                        })
                        ->when($branchCode, function ($q) use ($branchCode) {
                            $q->where(function ($purchaseBranchFilter) use ($branchCode) {
                                $purchaseBranchFilter
                                    ->whereRaw('CAST(ip.branch_id AS CHAR) = ?', [(string) $branchCode])
                                    ->orWhereRaw('CAST(ip.branch AS CHAR) = ?', [(string) $branchCode]);
                            });
                        })
                        ->where(function ($productMatch) {
                            $productMatch
                                ->whereRaw('CAST(ipi.product_master_id AS CHAR) = CAST(inventory_product_masters.unique_id AS CHAR)')
                                ->orWhereRaw('CAST(ipi.product_master_id AS CHAR) = CAST(inventory_product_masters.id AS CHAR)');
                        });
                })
                ->when($branchCode, fn($q) => $q->where('branch', $branchCode))
                ->when($request->filled('cms_admin_id'), fn($q) => $q->where('cms_admin_id', $request->cms_admin_id))
                ->when($request->filled('cmsadmin'), fn($q) => $q->where('cms_admin', $request->cmsadmin))
                ->orderBy('created_at', 'desc')
                ->get();

            // Fetch all active attributes once to avoid fetching inside the loop
            $allAttributes = Attribute::where('status', 'active')
                ->orderBy('name')
                ->get()
                ->map(function (Attribute $attribute) {
                    return [
                        'attribute_id' => $attribute->id,
                        'attribute_unique_id' => $attribute->unique_id,
                        'attribute_name' => $attribute->name,
                        'category_id' => $attribute->category_id,
                        'category_scope' => 'category_specific',
                        'values' => collect(explode(',', (string) $attribute->values))
                            ->map(fn ($value) => trim($value))
                            ->filter()
                            ->values(),
                    ];
                });

            $hasPurchaseItemIdOnInvoiceItems = Schema::hasColumn('inventory_sales_order_items', 'purchase_item_id');

            $mappedProducts = $products->map(function (ProductMaster $product) use ($allAttributes, $hasPurchaseItemIdOnInvoiceItems) {
                    // Calculate available stock per variant (purchase qty - sold qty)
                    $stockDetails = $product->purchaseItems->groupBy('attribute_summary')->map(function ($items) use ($hasPurchaseItemIdOnInvoiceItems) {
                        $availableQty = $items->sum(function (PurchaseItem $purchaseItem) use ($hasPurchaseItemIdOnInvoiceItems) {
                            $purchasedQty = (float) ($purchaseItem->quantity ?? 0);
                            $purchaseItemUniqueId = $this->formatPurchaseItemUniqueId((int) $purchaseItem->id);

                            $directSoldQty = (float) InventorySale::query()
                                ->where(function ($q) use ($purchaseItem, $purchaseItemUniqueId) {
                                    $q->whereRaw('CAST(purchase_item_id AS CHAR) = ?', [(string) $purchaseItemUniqueId])
                                        ->orWhereRaw('CAST(purchase_item_id AS CHAR) = ?', [(string) $purchaseItem->id]);
                                })
                                ->sum('quantity');

                            $soldQty = 0.0;
                            if ($hasPurchaseItemIdOnInvoiceItems) {
                                $soldQty = (float) InvoiceItem::query()
                                    ->where(function ($q) use ($purchaseItem, $purchaseItemUniqueId) {
                                        $q->whereRaw('CAST(purchase_item_id AS CHAR) = ?', [(string) $purchaseItemUniqueId])
                                            ->orWhereRaw('CAST(purchase_item_id AS CHAR) = ?', [(string) $purchaseItem->id])
                                            ->orWhereRaw('CAST(purchase_item_unique_id AS CHAR) = ?', [(string) $purchaseItemUniqueId]);
                                    })
                                    ->sum('quantity');
                            }

                            return max(0, $purchasedQty - $soldQty - $directSoldQty);
                        });

                        // Use the selling_price from the first purchase item in this variant group
                        $firstItem = $items->first();
                        $variantSellingPrice = (float) ($firstItem->selling_price ?? 0);

                        return [
                            'attribute_summary' => $firstItem->attribute_summary,
                            'quantity' => round($availableQty, 2),
                            'selling_price' => $variantSellingPrice > 0 ? $variantSellingPrice : (float) ($product->selling_price ?? 0),
                        ];
                    })->values();

                    // Derive the live total stock from the sum of variant-level available quantities
                    // so the top-level `stock` always matches what stock_details shows.
                    $liveStock = $stockDetails->sum('quantity');

                    // Filter relevant attributes for this product (Category-specific only)
                    $relevantAttributes = $allAttributes->filter(function ($attr) use ($product) {
                        $productCategoryUniqueId = $product->category?->unique_id;

                        return (!empty($productCategoryUniqueId) && (string) $attr['category_id'] === (string) $productCategoryUniqueId)
                            || (string) $attr['category_id'] === (string) $product->category_id;
                    })->values();

                    return [
                        'product_id' => $product->id,
                        'product_unique_id' => $product->unique_id,
                        'product_name' => $product->name,
                        'product_sku_code' => $product->sku_code,
                        'description' => $product->description,
                        'selling_price' => (float) ($product->selling_price ?? 0),
                        'gst_percent' => (float) ($product->gst_percent ?? 0),
                        'stock' => (int) round($liveStock),
                        'status' => $product->status,
                        'category' => $product->category ? [
                            'id' => $product->category->id,
                            'name' => $product->category->name,
                        ] : null,
                        'brand' => $product->brand ? [
                            'id' => $product->brand->id,
                            'name' => $product->brand->name,
                        ] : null,
                        'unit' => $product->unit ? [
                            'id' => $product->unit->id,
                            'unit_name' => $product->unit->unit_name,
                            'short_name' => $product->unit->short_name,
                        ] : null,
                        'product_images' => collect(is_array($product->product_images) ? $product->product_images : [])
                            ->map(fn($path) => 'inventory/product-master-images/' . basename($path))
                            ->values()
                            ->all(),
                        'stock_details' => $stockDetails,
                        'attribute_definitions' => $relevantAttributes,
                    ];
                })
                ->values();

            return response()->json([
                'success' => true,
                'message' => 'Loan-ready product catalog retrieved successfully',
                'data' => [
                    'total_products' => $mappedProducts->count(),
                    'products' => $mappedProducts,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load loan-ready product catalog',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all data required for editing a product master in a single API call.
     */
    public function getEditData($id)
    {
        try {
            $branch = AuthContext::branchId();

            $product = ProductMaster::withoutGlobalScopes()
                        ->where(function ($query) use ($id) {
                            $query->where('id', $id)
                                ->orWhere('unique_id', $id);
                        })
                        ->when($branch, fn($query, $b) => $query->where('branch', $b))
                        ->first();

            if (!$product) {
                return response()->json([
                    'success' => false,
                    'message' => 'Product not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'product' => $product,
                    'brands' => Brand::withoutGlobalScopes()
                        ->where('status', 'active')
                        ->when($branch, fn($query, $b) => $query->where('branch', $b))
                        ->select('id', 'name', 'unique_id')
                        ->latest()
                        ->get(),
                    'categories' => Category::withoutGlobalScopes()
                        ->where('status', 'active')
                        ->when($branch, fn($query, $b) => $query->where('branch', $b))
                        ->select('id', 'name', 'unique_id')
                        ->orderBy('created_at', 'desc')
                        ->get(),
                    'units' => Unit::withoutGlobalScopes()
                        ->where('status', 'active')
                        ->when($branch, fn($query, $b) => $query->where('branch', $b))
                        ->select('id', 'unit_name', 'short_name', 'unique_id')
                        ->orderBy('created_at', 'desc')
                        ->get(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load edit data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get products available for sale with live stock calculation.
     */
    public function getAvailableForSale(Request $request)
    {
        try {
            $branch = AuthContext::branchId();
            $hasPurchaseItemIdOnInvoiceItems = Schema::hasColumn('inventory_sales_order_items', 'purchase_item_id');

            $products = ProductMaster::withoutGlobalScopes()
                ->with(['category', 'brand'])
                ->select('inventory_product_masters.*')
                ->addSelect([
                    'total_purchased' => PurchaseItem::whereRaw('CAST(product_master_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(inventory_product_masters.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci')
                        ->selectRaw('SUM(quantity)'),
                    'total_sold' => InvoiceItem::whereRaw('CAST(product_unique_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(inventory_product_masters.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci')
                        ->selectRaw('SUM(quantity)'),
                    'total_direct_sold' => InventorySale::whereRaw('CAST(product_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(inventory_product_masters.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci')
                        ->selectRaw('SUM(quantity)')
                ])
                ->where('status', 'active')
                ->when($branch, fn($q, $b) => $q->where('inventory_product_masters.branch', $b))
                ->get()
                ->map(function ($product) use ($hasPurchaseItemIdOnInvoiceItems) {
                    $purchased = (float) $product->total_purchased;
                    $sold = (float) $product->total_sold;
                    $directSold = (float) $product->total_direct_sold;
                    $product->current_stock = $purchased - $sold - $directSold;

                    $variantRows = PurchaseItem::query()
                        ->where(function ($q) use ($product) {
                            $q->whereRaw('CAST(product_master_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [(string) $product->unique_id])
                                ->orWhereRaw('CAST(product_master_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [(string) $product->id]);
                        })
                        ->orderBy('id')
                        ->get()
                        ->map(function (PurchaseItem $purchaseItem) use ($hasPurchaseItemIdOnInvoiceItems) {
                            $purchasedQty = (float) ($purchaseItem->quantity ?? 0);
                            $soldQty = 0.0;
                            $purchaseItemUniqueId = $this->formatPurchaseItemUniqueId((int) $purchaseItem->id);
                            $directSoldQty = (float) InventorySale::query()
                                ->where(function ($q) use ($purchaseItem, $purchaseItemUniqueId) {
                                    $q->whereRaw('CAST(purchase_item_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [(string) $purchaseItemUniqueId])
                                        ->orWhereRaw('CAST(purchase_item_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [(string) $purchaseItem->id]);
                                })
                                ->sum('quantity');

                            if ($hasPurchaseItemIdOnInvoiceItems) {
                                $soldQty = (float) InvoiceItem::query()
                                    ->where(function ($q) use ($purchaseItem, $purchaseItemUniqueId) {
                                        $q->whereRaw('CAST(purchase_item_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [(string) $purchaseItemUniqueId])
                                            ->orWhereRaw('CAST(purchase_item_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [(string) $purchaseItem->id])
                                            ->orWhereRaw('CAST(purchase_item_unique_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [(string) $purchaseItemUniqueId]);
                                    })
                                    ->sum('quantity');
                            }

                            $available = $purchasedQty - $soldQty - $directSoldQty;

                            $suggestedSellingPrice = $purchaseItem->selling_price;
                            
                            // If no selling price is set, calculate based on purchase price + margin
                            if (!$suggestedSellingPrice || $suggestedSellingPrice <= 0) {
                                $purchasePrice = (float) ($purchaseItem->purchase_price ?? 0);
                                $productSellingPrice = (float) ($product->selling_price ?? 0);
                                
                                // If product has a selling price, use it; otherwise add 20% margin to purchase price
                                if ($productSellingPrice > 0) {
                                    $suggestedSellingPrice = $productSellingPrice;
                                } else {
                                    $suggestedSellingPrice = $purchasePrice * 1.2; // 20% margin
                                }
                            }

                            return [
                                'purchase_item_id' => $this->formatPurchaseItemUniqueId((int) $purchaseItem->id),
                                'purchase_item_table_id' => $purchaseItem->id,
                                'attribute_summary' => trim((string) ($purchaseItem->attribute_summary ?? '')) ?: 'Default',
                                'tax_percent' => (float) ($purchaseItem->tax_percent ?? 0),
                                'purchase_price' => (float) ($purchaseItem->purchase_price ?? 0),
                                'selling_price' => round($suggestedSellingPrice, 2),
                                'available_stock' => round(max(0, $available), 2),
                            ];
                        })
                        ->values();

                    // Backward compatibility for old invoices without purchase_item_id:
                    // force variant sum to not exceed product-level current stock.
                    $variantTotal = (float) $variantRows->sum('available_stock');
                    $productAvailable = max(0, (float) $product->current_stock);
                    $overAllocated = max(0, $variantTotal - $productAvailable);
                    if ($overAllocated > 0 && $variantRows->isNotEmpty()) {
                        $adjusted = $variantRows->map(function ($row) use (&$overAllocated) {
                            if ($overAllocated <= 0) {
                                return $row;
                            }
                            $cut = min($row['available_stock'], $overAllocated);
                            $row['available_stock'] = round(max(0, $row['available_stock'] - $cut), 2);
                            $overAllocated -= $cut;
                            return $row;
                        })->values();
                        $variantRows = $adjusted;
                    }

                    $product->variant_batches = $variantRows;
                    return $product;
                })
                ->values();

            return response()->json([
                'success' => true,
                'data' => $products->map(function($p) {
                    return [
                        'id' => $p->unique_id,
                        'table_id' => $p->id,
                        'unique_id' => $p->unique_id,
                        'name' => $p->name,
                        'sku_code' => $p->sku_code,
                        'selling_price' => $p->selling_price,
                        'current_stock' => $p->current_stock,
                        'variant_batches' => $p->variant_batches ?? [],
                        'category' => $p->category ? ['id' => $p->category->id, 'name' => $p->category->name] : null,
                        'brand' => $p->brand ? ['id' => $p->brand->id, 'name' => $p->brand->name] : null,
                        'tax' => [
                            'rate' => $p->gst_percent // Assuming gst_percent is the tax rate stored in product master
                        ]
                    ];
                })
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch available products: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * List all product masters for current branch.
     */
    public function index()
    {
        $branch = AuthContext::branchId();
        $products = ProductMaster::withoutGlobalScopes()
            ->with(['category', 'brand', 'unit'])
            ->where('status', 'active')
            ->when($branch, fn($q, $b) => $q->where('branch', $b))
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($product) {
                // Live Stock Calculation for Direct Sales
                $totalPurchased = (float) PurchaseItem::where(function ($q) use ($product) {
                    $q->where('product_master_id', (string) $product->unique_id)
                        ->orWhere('product_master_id', (string) $product->id);
                })->sum('quantity');
                                $totalSoldInvoices = (float) InvoiceItem::where(function ($q) use ($product) {
                                        $q->where('product_unique_id', (string) $product->unique_id)
                                            ->orWhere('product_id', (string) $product->unique_id)
                                            ->orWhere('product_id', (string) $product->id);
                                })->sum('quantity');
                                $totalDirectSales = (float) InventorySale::where(function ($q) use ($product) {
                                        $q->where('product_id', (string) $product->unique_id)
                                            ->orWhere('product_id', (string) $product->id);
                                })->sum('quantity');
                
                // Ensure images are prefixed with the full public path
                $images = is_array($product->product_images) ? $product->product_images : [];
                $product->product_images = array_map(function($path) {
                    return 'inventory/product-master-images/' . basename($path);
                }, $images);

                return $product;
            });

        return response()->json([
            'success' => true,
            'message' => 'Product masters retrieved successfully',
            'data' => $products,
        ]);
    }

    /**
     * Paginated stock summary with last purchase info for each product master.
     */
    public function stockSummary(Request $request)
    {
        $perPage = (int) ($request->get('per_page', 10));
        if ($perPage <= 0) {
            $perPage = 10;
        }

        $search = $request->get('search');

        $query = ProductMaster::with([
            'category',
            'brand',
            'unit',
            'lastPurchaseItem.purchase.vendor',
        ])->where('status', 'active');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $like = '%' . $search . '%';
                $q->where('name', 'like', $like)
                    ->orWhere('sku_code', 'like', $like);
            });
        }

        $products = $query->orderBy('created_at', 'desc')->paginate($perPage);

        // Map extra fields for frontend convenience
        $products->getCollection()->transform(function (ProductMaster $product) {
            $lastItem = $product->lastPurchaseItem;
            
            // Live Stock Calculation including Direct Sales
            $totalPurchased = (float) PurchaseItem::where(function ($q) use ($product) {
                $q->where('product_master_id', (string) $product->unique_id)
                    ->orWhere('product_master_id', (string) $product->id);
            })->sum('quantity');
                        $totalSoldInvoices = (float) InvoiceItem::where(function ($q) use ($product) {
                                $q->where('product_unique_id', (string) $product->unique_id)
                                    ->orWhere('product_id', (string) $product->unique_id)
                                    ->orWhere('product_id', (string) $product->id);
                        })->sum('quantity');
                        $totalDirectSales = (float) InventorySale::where(function ($q) use ($product) {
                                $q->where('product_id', (string) $product->unique_id)
                                    ->orWhere('product_id', (string) $product->id);
                        })->sum('quantity');
            
            $product->stock = $totalPurchased - $totalSoldInvoices - $totalDirectSales;

            $product->last_vendor_name = $lastItem && $lastItem->purchase && $lastItem->purchase->vendor
                ? $lastItem->purchase->vendor->name
                : null;
            $product->last_purchase_price = $lastItem ? $lastItem->purchase_price : null;
            $product->last_purchase_date = $lastItem && $lastItem->purchase
                ? $lastItem->purchase->purchase_date
                : null;

            // Total attachments (images/files) across all purchase items for this product
            $attachmentsCount = PurchaseItem::where(function ($q) use ($product) {
                    $q->where('product_master_id', (string) $product->unique_id)
                        ->orWhere('product_master_id', (string) $product->id);
                })
                ->get()
                ->reduce(function ($carry, PurchaseItem $item) {
                    $attachments = $item->attachments ?? [];
                    return $carry + (is_array($attachments) ? count($attachments) : 0);
                }, 0);

            $product->attachments_count = $attachmentsCount;

            return $product;
        });

        return response()->json([
            'success' => true,
            'message' => 'Product stock summary retrieved successfully',
            'data' => $products,
        ]);
    }

    /**
     * Purchase history for a specific product master.
     */
    public function purchaseHistory($productMasterId)
    {
        $branchId = AuthContext::branchId();
        $productUniqueId = ProductMaster::where('id', $productMasterId)->value('unique_id');

        $productUniqueId = ProductMaster::where('id', $productMasterId)->value('unique_id');

        $items = PurchaseItem::with(['purchase.vendor'])
            ->where(function ($q) use ($productMasterId, $productUniqueId) {
                $q->where('product_master_id', (string) $productMasterId)
                    ->orWhere('product_master_id', (string) $productUniqueId);
            })
            ->whereHas('purchase', function ($q) use ($branchId) {
                $q->where('branch', $branchId);
            })
            ->orderByDesc('id')
            ->get();

        $purchaseHistory = $items->map(function (PurchaseItem $item) {
            return [
                'id' => $item->id,
                'purchase_id' => optional($item->purchase)->id,
                'purchase_unique_id' => optional($item->purchase)->unique_id,
                'purchase_date' => optional($item->purchase)->purchase_date,
                'vendor_id' => optional($item->purchase)->vendor_id,
                'vendor_name' => optional(optional($item->purchase)->vendor)->name,
                'quantity' => $item->quantity,
                'purchase_price' => $item->purchase_price,
                'line_total' => (float) $item->quantity * (float) $item->purchase_price,
                'tax_percent' => $item->tax_percent,
                'tax_amount' => $item->tax_amount,
                'attribute_summary' => $item->attribute_summary,
                'attachments' => $item->attachments ?? [],
            ];
        });

        // Vendor-wise summary for this product
        $vendorSummary = $items
            ->groupBy(fn (PurchaseItem $item) => (string) optional($item->purchase)->vendor_id)
            ->map(function ($group) {
                /** @var PurchaseItem $first */
                $first = $group->first();
                $vendor = optional($first->purchase)->vendor;

                $totalQty = $group->sum(fn (PurchaseItem $row) => (float) $row->quantity);
                $totalAmount = $group->sum(fn (PurchaseItem $row) => (float) $row->quantity * (float) $row->purchase_price);

                return [
                    'vendor_id' => optional($first->purchase)->vendor_id,
                    'vendor_name' => optional($vendor)->name,
                    'vendor_business_name' => optional($vendor)->business_name,
                    'vendor_phone' => optional($vendor)->phone,
                    'purchase_entries' => $group->count(),
                    'total_quantity' => $totalQty,
                    'total_amount' => round($totalAmount, 2),
                    'last_purchase_date' => optional(optional($group->sortByDesc('id')->first())->purchase)->purchase_date,
                ];
            })
            ->filter(fn ($row) => !empty($row['vendor_id']))
            ->sortByDesc('total_quantity')
            ->values();

        // Consolidated invoice history now comes from purchase_orders + purchase_line_items only
        $purchaseInvoiceHistory = $items
            ->map(function (PurchaseItem $item) {
                $purchase = $item->purchase;

                return [
                    'purchase_invoice_id' => optional($purchase)->id,
                    'purchase_id' => optional($purchase)->unique_id,
                    'invoice_no' => optional($purchase)->invoice_no,
                    'invoice_date' => optional($purchase)->purchase_date,
                    'event_no' => 1,
                    'event_type' => 'consolidated',
                    'vendor_name' => optional($purchase)->vendor_name ?: optional(optional($purchase)->vendor)->name,
                    'quantity' => $item->quantity,
                    'rate' => $item->purchase_price,
                    'amount' => round((float) $item->quantity * (float) $item->purchase_price, 2),
                ];
            })
            ->values();

        // Sales history (who bought this product)
        $salesHistory = InvoiceItem::with('invoice')
                        ->where(function ($q) use ($productMasterId, $productUniqueId) {
                                $q->where('product_id', (string) $productMasterId)
                                    ->orWhere('product_id', (string) $productUniqueId)
                                    ->orWhere('product_unique_id', (string) $productUniqueId);
            })
            ->whereHas('invoice', function ($q) use ($branchId) {
                $q->where('branch', $branchId);
            })
            ->orderByDesc('id')
            ->get()
            ->map(function (InvoiceItem $item) {
                $invoice = $item->invoice;
                return [
                    'invoice_id' => optional($invoice)->id,
                    'invoice_no' => optional($invoice)->invoice_no,
                    'invoice_date' => optional($invoice)->invoice_date,
                    'customer_name' => optional($invoice)->customer_name,
                    'customer_phone' => optional($invoice)->customer_phone,
                    'quantity' => $item->quantity,
                    'price' => $item->price,
                    'total' => $item->total,
                    'payment_status' => optional($invoice)->payment_status,
                ];
            })
            ->values();

        $totalPurchasedQty = (float) $purchaseHistory->sum('quantity');
        $totalPurchaseSpend = (float) $purchaseHistory->sum('line_total');
        $totalSoldQty = (float) $salesHistory->sum('quantity');
        $totalSalesAmount = (float) $salesHistory->sum(function ($row) {
            return (float) ($row['total'] ?? ((float) ($row['quantity'] ?? 0) * (float) ($row['price'] ?? 0)));
        });

        return response()->json([
            'success' => true,
            'message' => 'Purchase history retrieved successfully',
            'data' => [
                'purchase_history' => $purchaseHistory,
                'vendor_summary' => $vendorSummary,
                'purchase_invoice_history' => $purchaseInvoiceHistory,
                'sales_history' => $salesHistory,
                'overview' => [
                    'total_purchase_entries' => $purchaseHistory->count(),
                    'total_invoice_snapshots' => $purchaseInvoiceHistory->count(),
                    'unique_vendors' => $vendorSummary->count(),
                    'unique_customers' => $salesHistory->pluck('customer_phone')->filter()->unique()->count(),
                    'total_purchased_qty' => $totalPurchasedQty,
                    'total_purchase_spend' => round($totalPurchaseSpend, 2),
                    'total_sold_qty' => $totalSoldQty,
                    'total_sales_amount' => round($totalSalesAmount, 2),
                ],
            ],
        ]);
    }

    /**
     * Store a new product master.
     */
    public function store(Request $request)
    {
        $branch   = AuthContext::branchId();
        $cmsAdmin = AuthContext::cmsAdminId();

        $validator = Validator::make($request->all(), [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('inventory_product_masters', 'name')->where(function ($query) use ($branch) {
                    return $query->where('branch', $branch)
                        ->where('status', 'active');
                }),
            ],
            'category_id' => 'nullable|string|max:100',
            'brand_id' => 'nullable|string|max:100',
            'unit_id' => 'nullable|string|max:100',
            'gst_percent' => 'nullable|numeric|min:0',
            'selling_price' => 'nullable|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'description' => 'nullable|string',
            'product_images' => 'nullable|array|max:10',
            'product_images.*' => 'image|mimes:jpeg,png,jpg,webp|max:5120',
            'existing_product_images' => 'nullable|array',
            'existing_product_images.*' => 'string|max:500',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $request->only(['name','category_id','brand_id','unit_id','gst_percent','selling_price','stock','description','status']);

        $resolvedCategoryId = $this->resolveMasterReferenceUniqueId($request->input('category_id'), Category::class);
        $resolvedBrandId    = $this->resolveMasterReferenceUniqueId($request->input('brand_id'), Brand::class);
        $resolvedUnitId     = $this->resolveMasterReferenceUniqueId($request->input('unit_id'), Unit::class);

        if ($request->filled('category_id') && !$resolvedCategoryId) {
            return response()->json(['success'=>false,'message'=>'Validation failed','errors'=>['category_id'=>['Selected category is invalid.']]], 422);
        }
        if ($request->filled('brand_id') && !$resolvedBrandId) {
            return response()->json(['success'=>false,'message'=>'Validation failed','errors'=>['brand_id'=>['Selected brand is invalid.']]], 422);
        }
        if ($request->filled('unit_id') && !$resolvedUnitId) {
            return response()->json(['success'=>false,'message'=>'Validation failed','errors'=>['unit_id'=>['Selected unit is invalid.']]], 422);
        }

        $data['category_id']  = $resolvedCategoryId;
        $data['brand_id']     = $resolvedBrandId;
        $data['unit_id']      = $resolvedUnitId;
        $data['branch']       = $branch;
        $data['branch_id']    = $branch;
        $data['cms_admin_id'] = $cmsAdmin;
        $data['cms_admin']    = $cmsAdmin;

        // --- SKU_MARKER ---
        $last = ProductMaster::withoutBranchScope()->withTrashed()
            ->where(function ($q) {
                $q->where('sku_code', 'LIKE', 'INV-PM-%')
                  ->orWhere('unique_id', 'LIKE', 'INV-PM-%');
            })
            ->orderBy('id', 'desc')
            ->first();

        if (!$last) {
            $nextNumber = 1;
        } else {
            $identifier = str_contains((string) $last->sku_code, 'INV-PM-')
                ? $last->sku_code
                : $last->unique_id;

            $parts = explode('-', (string) $identifier);
            $lastPart = end($parts);
            $lastNum = is_numeric($lastPart) ? (int) $lastPart : 0;
            $nextNumber = $lastNum + 1;
        }

        $sku = 'INV-PM-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

        while (ProductMaster::withoutBranchScope()->withTrashed()
            ->where(function ($q) use ($sku) {
                $q->where('sku_code', $sku)
                  ->orWhere('unique_id', $sku);
            })
            ->exists()) {
            $nextNumber++;
            $sku = 'INV-PM-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
        }

        $data['sku_code'] = $sku;
        $data['unique_id'] = $sku;
        $data['gst_percent'] = $data['gst_percent'] ?? 0;
        $data['selling_price'] = $data['selling_price'] ?? 0;
        $data['stock'] = $data['stock'] ?? 0;

        $uploadedImages = $this->extractUploadedProductImages($request);
        if (!empty($uploadedImages)) {
            $data['product_images'] = $this->saveProductImages($uploadedImages);
        }

        $product = ProductMaster::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Product master created successfully',
            'data' => $product->load(['category', 'brand']),
        ]);
    }

    /**
     * Show single record.
     */
    public function show($id)
    {
        $product = ProductMaster::with(['category', 'brand'])
            ->where('id', $id)
            ->orWhere('unique_id', $id)
            ->first();

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product master not found',
                'data' => null,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Product master retrieved successfully',
            'data' => $product,
        ]);
    }

    /**
     * Update record.
     */
    public function update(Request $request, $id)
    {
        $product = ProductMaster::where('id', $id)
            ->orWhere('unique_id', $id)
            ->first();

        if (!$product) {
            return response()->json(['success'=>false,'message'=>'Product master not found','data'=>null], 404);
        }

        $branch   = AuthContext::branchId();
        $cmsAdmin = AuthContext::cmsAdminId();

        $validator = Validator::make($request->all(), [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('inventory_product_masters', 'name')
                    ->ignore($product->id)
                    ->where(function ($query) use ($branch) {
                        return $query->where('branch', $branch)
                            ->where('status', 'active');
                    }),
            ],
            'category_id' => 'nullable|string|max:100',
            'brand_id' => 'nullable|string|max:100',
            'unit_id' => 'nullable|string|max:100',
            'gst_percent' => 'nullable|numeric|min:0',
            'selling_price' => 'nullable|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'description' => 'nullable|string',
            'product_images' => 'nullable|array|max:10',
            'product_images.*' => 'image|mimes:jpeg,png,jpg,webp|max:5120',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $request->only([
            'name',
            'category_id',
            'brand_id',
            'unit_id',
            'gst_percent',
            'selling_price',
            'stock',
            'description',
            'status',
        ]);

        $resolvedCategoryId = $this->resolveMasterReferenceUniqueId($request->input('category_id'), Category::class);
        $resolvedBrandId = $this->resolveMasterReferenceUniqueId($request->input('brand_id'), Brand::class);
        $resolvedUnitId = $this->resolveMasterReferenceUniqueId($request->input('unit_id'), Unit::class);

        if ($request->filled('category_id') && !$resolvedCategoryId) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => ['category_id' => ['Selected category is invalid.']],
            ], 422);
        }

        if ($request->filled('brand_id') && !$resolvedBrandId) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => ['brand_id' => ['Selected brand is invalid.']],
            ], 422);
        }

        if ($request->filled('unit_id') && !$resolvedUnitId) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => ['unit_id' => ['Selected unit is invalid.']],
            ], 422);
        }

        $data['category_id']  = $resolvedCategoryId;
        $data['brand_id']     = $resolvedBrandId;
        $data['unit_id']      = $resolvedUnitId;
        $data['branch']       = $branch;
        $data['branch_id']    = $branch;
        $data['cms_admin_id'] = $cmsAdmin;
        $data['cms_admin']    = $cmsAdmin;

        $currentImages = is_array($product->product_images) ? $product->product_images : [];

        $retainedImagesInput = $request->input('existing_product_images');
        $retainedImages = is_array($retainedImagesInput)
            ? array_values(array_filter($retainedImagesInput, fn ($path) => is_string($path) && $path !== ''))
            : $currentImages;

        $imagesToDelete = array_values(array_diff($currentImages, $retainedImages));
        if (!empty($imagesToDelete)) {
            $this->deleteProductImages($imagesToDelete);
        }

        $finalImages = $retainedImages;
        $uploadedImages = $this->extractUploadedProductImages($request);
        if (!empty($uploadedImages)) {
            $newSavedImages = $this->saveProductImages($uploadedImages);
            $finalImages = array_values(array_merge($finalImages, $newSavedImages));
        }

        $data['product_images'] = $finalImages;

        $product->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Product master updated successfully',
            'data' => $product->load(['category', 'brand', 'unit']),
        ]);
    }

    /**
     * Soft delete (status inactive).
     */
    public function destroy($id)
    {
        $product = ProductMaster::where('id', $id)
            ->orWhere('unique_id', $id)
            ->first();

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product master not found',
            ], 404);
        }

        $this->deleteProductImages(is_array($product->product_images) ? $product->product_images : []);

        $product->status = 'inactive';
        $product->deleted_at = now();
        $product->save();

        return response()->json([
            'success' => true,
            'message' => 'Product master marked as inactive successfully',
        ]);
    }
}

