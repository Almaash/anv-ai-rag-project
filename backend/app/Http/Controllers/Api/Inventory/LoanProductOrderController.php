<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory\Attribute;
use App\Models\Inventory\InvoiceItem;
use App\Models\Inventory\InventorySale;
use App\Models\Inventory\LoanProductOrder;
use App\Models\Inventory\PurchaseItem;
use App\Models\Inventory\ProductMaster;
use App\Models\Loan\CreditApplicationForm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

class LoanProductOrderController extends Controller
{
    private ?bool $hasPurchaseItemIdColumn = null;

    private function formatPurchaseItemUniqueId(int $id): string
    {
        return 'INV-PI-' . str_pad((string) $id, 6, '0', STR_PAD_LEFT);
    }

    private function hasPurchaseItemIdColumn(): bool
    {
        if ($this->hasPurchaseItemIdColumn === null) {
            $this->hasPurchaseItemIdColumn = Schema::hasColumn('inventory_sales_order_items', 'purchase_item_id');
        }

        return $this->hasPurchaseItemIdColumn;
    }

    private function soldQtyForPurchaseItem(PurchaseItem $item): float
    {
        $purchaseItemUniqueId = $this->formatPurchaseItemUniqueId((int) $item->id);
        $invoiceSoldQty = 0.0;

        if ($this->hasPurchaseItemIdColumn()) {
            $invoiceSoldQty = (float) InvoiceItem::query()
                ->where(function ($q) use ($item, $purchaseItemUniqueId) {
                    $q->where('purchase_item_id', (string) $purchaseItemUniqueId)
                        ->orWhere('purchase_item_id', (string) $item->id)
                        ->orWhere('purchase_item_unique_id', (string) $purchaseItemUniqueId);
                })
                ->sum('quantity');
        }

        $directSoldQty = (float) InventorySale::query()
            ->where(function ($q) use ($item, $purchaseItemUniqueId) {
                $q->where('purchase_item_id', (string) $purchaseItemUniqueId)
                    ->orWhere('purchase_item_id', (string) $item->id);
            })
            ->sum('quantity');

        return $invoiceSoldQty + $directSoldQty;
    }

    private function normalizeVariantLabel(?string $label): string
    {
        $value = trim((string) $label);
        if ($value === '' || $value === 'Default') return 'Default';

        // Sort the key:value pairs alphabetically so order doesn't matter
        // e.g. "Ram: 8gb | Color: Red" and "Color: Red | Ram: 8gb" both become "Color: Red | Ram: 8gb"
        $parts = array_map('trim', explode('|', $value));
        sort($parts);
        return implode(' | ', $parts);
    }

    private function getLatestPricing(ProductMaster $product): array
    {
        $latestLine = PurchaseItem::query()
            ->where(function ($q) use ($product) {
                $q->where('product_master_id', (string) $product->id)
                    ->orWhere('product_master_id', (string) $product->unique_id);
            })
            ->orderByDesc('id')
            ->first();

        $buyingPrice = (float) ($latestLine?->purchase_price ?? 0);
        $sellingPrice = (float) ($latestLine?->selling_price ?? 0);

        if ($sellingPrice <= 0) {
            $sellingPrice = (float) ($product->selling_price ?? 0);
        }
        if ($sellingPrice <= 0) {
            $sellingPrice = $buyingPrice;
        }

        return [
            'buying_price' => $buyingPrice,
            'selling_price' => $sellingPrice,
            'gst_percent' => (float) ($latestLine?->tax_percent ?? $product->gst_percent ?? 0),
        ];
    }

    private function getVariantOptions(int $productId)
    {
        return PurchaseItem::query()
            ->where(function ($q) use ($productId) {
                $productUniqueId = ProductMaster::where('id', $productId)->value('unique_id');
                $q->where('product_master_id', (string) $productId)
                    ->orWhere('product_master_id', (string) $productUniqueId);
            })
            ->orderBy('id')
            ->get()
            ->map(function (PurchaseItem $item) {
                $variantPrice = (float) ($item->selling_price ?? 0);
                if ($variantPrice <= 0) {
                    $variantPrice = (float) ($item->productMaster?->selling_price ?? 0);
                }
                if ($variantPrice <= 0) {
                    $variantPrice = (float) ($item->purchase_price ?? 0);
                }

                return [
                    'purchase_item_id'  => $item->id,
                    'attribute_summary' => $this->normalizeVariantLabel($item->attribute_summary),
                    // Available = purchased qty minus sold qty from InventorySale records
                    'available_stock'   => max(0, (int) ($item->quantity ?? 0) - (int) InventorySale::query()->where('purchase_item_id', $this->formatPurchaseItemUniqueId((int) $item->id))->sum('quantity')),
                    'variant_price'     => $variantPrice,
                    'purchase_price'    => (float) ($item->purchase_price ?? 0),
                    'gst_percent'       => (float) ($item->tax_percent ?? 0),
                ];
            })
            ->groupBy('attribute_summary')
            ->map(function ($rows, $attributeSummary) {
                $rowsCollection = collect($rows);
                $latest = $rowsCollection->last();
                return [
                    'attribute_summary' => $attributeSummary,
                    'available_stock'   => (int) $rowsCollection->sum('available_stock'),
                    'variant_price'     => (float) ($latest['variant_price'] ?? 0),
                    'purchase_price'    => (float) ($latest['purchase_price'] ?? 0),
                    'gst_percent'       => (float) ($latest['gst_percent'] ?? 0),
                ];
            })
            ->values();
    }

    private function recordVariantSale(ProductMaster $product, string $attributeSummary, int $quantity, array $item): void
    {
        $purchaseItems = PurchaseItem::query()
            ->where(function ($q) use ($product) {
                $q->where('product_master_id', (string) $product->id)
                  ->orWhere('product_master_id', (string) $product->unique_id);
            })
            ->lockForUpdate()
            ->orderBy('id')
            ->get()
            ->filter(fn(PurchaseItem $pi) => $this->normalizeVariantLabel($pi->attribute_summary) === $attributeSummary);

        $remaining = $quantity;
        foreach ($purchaseItems as $purchaseItem) {
            if ($remaining <= 0) break;
            $purchaseItemUniqueId = $this->formatPurchaseItemUniqueId((int) $purchaseItem->id);
            $soldQty = (int) InventorySale::query()->where('purchase_item_id', $purchaseItemUniqueId)->sum('quantity');
            $available = max(0, (int) ($purchaseItem->quantity ?? 0) - $soldQty);
            if ($available <= 0) continue;
            $deduct = min($available, $remaining);
            $this->createSaleRecord($product, $purchaseItem, $deduct, $attributeSummary, $item);
            $remaining -= $deduct;
        }

        if ($remaining > 0) {
            throw new \RuntimeException('Requested quantity is greater than selected variant stock');
        }
    }

    private function recordAnySale(ProductMaster $product, int $quantity, array $item): void
    {
        $purchaseItems = PurchaseItem::query()
            ->where(function ($q) use ($product) {
                $q->where('product_master_id', (string) $product->id)
                  ->orWhere('product_master_id', (string) $product->unique_id);
            })
            ->lockForUpdate()
            ->orderBy('id')
            ->get();

        $remaining = $quantity;
        foreach ($purchaseItems as $purchaseItem) {
            if ($remaining <= 0) break;
            $purchaseItemUniqueId = $this->formatPurchaseItemUniqueId((int) $purchaseItem->id);
            $soldQty = (int) InventorySale::query()->where('purchase_item_id', $purchaseItemUniqueId)->sum('quantity');
            $available = max(0, (int) ($purchaseItem->quantity ?? 0) - $soldQty);
            if ($available <= 0) continue;
            $deduct = min($available, $remaining);
            $this->createSaleRecord($product, $purchaseItem, $deduct, $purchaseItem->attribute_summary, $item);
            $remaining -= $deduct;
        }

        if ($remaining > 0) {
            throw new \RuntimeException('Requested quantity is greater than available stock');
        }
    }

    private function createSaleRecord(ProductMaster $product, PurchaseItem $purchaseItem, float $qty, ?string $attributeSummary, array $item): void
    {
        $unitPrice = (float)($purchaseItem->selling_price ?? $product->selling_price ?? 0);
        $purchaseItemUniqueId = $this->formatPurchaseItemUniqueId((int) $purchaseItem->id);

        InventorySale::create([
            'product_id'         => $product->unique_id,
            'purchase_item_id'   => $purchaseItemUniqueId,
            'product_name'       => $product->name,
            'attribute_summary'  => $attributeSummary,
            'quantity'           => $qty,
            'selling_price'      => $unitPrice,
            'total_amount'       => round($unitPrice * $qty, 2),
            'sale_source'        => 'loan_product_order',
            // Store order_code as customer_reference so restore can target exact rows
            'customer_reference' => $item['order_code'] ?? ($item['customer_reference'] ?? null),
            'sale_date'          => now(),
            'branch_id'          => $product->branch_id,
            'branch'             => $product->branch,
            'cms_admin_id'       => $product->cms_admin_id,
            'cms_admin'          => $product->cms_admin,
        ]);
    }

    /**
     * Public catalog for loan-based product buying.
     * No authentication is required here by request.
     */
    public function catalog(Request $request): JsonResponse
    {
        $requestedProductId = (string) ($request->query('product_id') ?? $request->query('id') ?? '');

        // Eager load related product data
        $query = ProductMaster::withoutGlobalScopes()
            ->with(['category', 'brand', 'unit'])
            ->where('status', 'active');

        // Allow fetching products with 0 stock if specific ID is requested
        if (!$request->has('search') && $requestedProductId === '') {
            $query->where('stock', '>', 0);
        }

        if ($request->has('branch_id') && $request->branch_id !== 'all') {
            // branch_id from frontend is the Branch integer id — resolve to branch code
            $branchCode = \DB::table('branches')
                ->where('id', $request->branch_id)
                ->value('code');
            if ($branchCode) {
                $query->where('branch', $branchCode);
            }
        }

        // Apply strict unique ID filter when product_id/id is provided.
        if ($requestedProductId !== '') {
            $query->where('unique_id', $requestedProductId);
        } elseif ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('unique_id', $search)
                  ->orWhere('name', 'LIKE', "%{$search}%")
                  ->orWhere('sku_code', 'LIKE', "%{$search}%");
            });
        }

        $products = $query->orderBy('name')
            ->get();

        // Fetch all active attributes once to avoid fetching inside the loop
        $allAttributes = Attribute::where('status', 'active')
            ->orderBy('name')
            ->get()
            ->map(function (Attribute $attribute) {
                return [
                    'attribute_id' => $attribute->id,
                    'attribute_name' => $attribute->name,
                    'category_id' => $attribute->category_id,
                    'values' => collect(explode(',', (string) $attribute->values))
                        ->map(fn ($value) => trim($value))
                        ->filter()
                        ->values(),
                ];
            });

        // Pre-fetch all relevant purchase items for variant stock to avoid N+1 queries in getVariantOptions
        $productIds = $products->pluck('id')->toArray();
        $allPurchaseItems = PurchaseItem::query()
            ->where(function ($q) use ($productIds) {
                $productUniqueIds = ProductMaster::query()
                    ->whereIn('id', $productIds)
                    ->pluck('unique_id')
                    ->toArray();

                $q->whereIn('product_master_id', $productIds)
                    ->orWhereIn('product_master_id', $productUniqueIds);
            })
            ->get()
            ->groupBy(function (PurchaseItem $item) {
                $raw = (string) $item->product_master_id;
                if (ctype_digit($raw)) {
                    return (int) $raw;
                }

                return ProductMaster::where('unique_id', $raw)->value('id') ?? $raw;
            });

        // Check if the column exists once for the whole request
        $hasPurchaseId = $this->hasPurchaseItemIdColumn();
        $allSoldQtys = collect();

        if ($hasPurchaseId) {
            $purchaseItemIds = PurchaseItem::query()
                ->where(function ($q) use ($productIds) {
                    $productUniqueIds = ProductMaster::query()
                        ->whereIn('id', $productIds)
                        ->pluck('unique_id')
                        ->toArray();

                    $q->whereIn('product_master_id', $productIds)
                        ->orWhereIn('product_master_id', $productUniqueIds);
                })
                ->pluck('id')
                ->toArray();

            $purchaseItemUniqueIds = collect($purchaseItemIds)
                ->map(fn ($id) => $this->formatPurchaseItemUniqueId((int) $id))
                ->values()
                ->toArray();

            $allSoldQtys = InvoiceItem::query()
                ->whereIn('purchase_item_unique_id', $purchaseItemUniqueIds)
                ->select('purchase_item_unique_id', DB::raw('SUM(quantity) as sold_qty'))
                ->groupBy('purchase_item_unique_id')
                ->pluck('sold_qty', 'purchase_item_unique_id');
        }

        $directSoldQtys = collect();
        if (!empty($productIds)) {
            $purchaseItemIdsForDirect = PurchaseItem::query()
                ->where(function ($q) use ($productIds) {
                    $productUniqueIds = ProductMaster::query()
                        ->whereIn('id', $productIds)
                        ->pluck('unique_id')
                        ->toArray();

                    $q->whereIn('product_master_id', $productIds)
                        ->orWhereIn('product_master_id', $productUniqueIds);
                })
                ->pluck('id')
                ->toArray();

            $purchaseItemUniqueIdsForDirect = collect($purchaseItemIdsForDirect)
                ->map(fn ($id) => $this->formatPurchaseItemUniqueId((int) $id))
                ->values()
                ->toArray();

            $directSoldRows = InventorySale::query()
                ->where(function ($q) use ($purchaseItemUniqueIdsForDirect, $purchaseItemIdsForDirect) {
                    $q->whereIn('purchase_item_id', $purchaseItemUniqueIdsForDirect)
                        ->orWhereIn('purchase_item_id', array_map('strval', $purchaseItemIdsForDirect));
                })
                ->select('purchase_item_id', DB::raw('SUM(quantity) as sold_qty'))
                ->groupBy('purchase_item_id')
                ->get();

            $directSoldQtys = $directSoldRows
                ->mapWithKeys(function ($row) {
                    $key = (string) $row->purchase_item_id;
                    if (ctype_digit($key)) {
                        $key = $this->formatPurchaseItemUniqueId((int) $key);
                    }
                    return [$key => (float) $row->sold_qty];
                });
        }

        $mappedProducts = $products->map(function (ProductMaster $product) use ($allAttributes, $allPurchaseItems, $allSoldQtys, $directSoldQtys) {
            // Filter relevant attributes for this product (Category-specific only)
            $relevantAttributes = $allAttributes->filter(function ($attr) use ($product) {
                $productCategoryUniqueId = $product->category?->unique_id;

                return (!empty($productCategoryUniqueId) && (string) $attr['category_id'] === (string) $productCategoryUniqueId)
                    || (string) $attr['category_id'] === (string) $product->category_id;
            });

            // Calculate variant options from pre-fetched data
            $purchaseItems = $allPurchaseItems->get($product->id, collect());
            $variantOptions = $purchaseItems->map(function (PurchaseItem $item) use ($allSoldQtys, $directSoldQtys, $product) {
                $purchaseItemUniqueId = $this->formatPurchaseItemUniqueId((int) $item->id);
                $soldQty = (float) $allSoldQtys->get($purchaseItemUniqueId, 0)
                    + (float) $directSoldQtys->get($purchaseItemUniqueId, 0);
                $sellingPrice = (float) ($item->selling_price ?? 0);
                if ($sellingPrice <= 0) {
                    $sellingPrice = (float) ($product->selling_price ?? 0);
                }
                if ($sellingPrice <= 0) {
                    $sellingPrice = (float) ($item->purchase_price ?? 0);
                }
                $gstPercent   = (float) ($item->tax_percent ?? $product->gst_percent ?? 0);
                return [
                    'attribute_summary' => $this->normalizeVariantLabel($item->attribute_summary),
                    'available_stock'   => max(0, (float) ($item->quantity ?? 0) - $soldQty),
                    'variant_price'     => $sellingPrice,
                    'purchase_price'    => (float) ($item->purchase_price ?? 0),
                    'gst_percent'       => $gstPercent,
                ];
            })
            ->groupBy('attribute_summary')
            ->map(function ($rows, $attributeSummary) {
                $rowsCollection = collect($rows);
                $latest = $rowsCollection->last();
                return [
                    'attribute_summary' => $attributeSummary,
                    'available_stock'   => round((float) $rowsCollection->sum('available_stock'), 2),
                    'variant_price'     => (float) ($latest['variant_price'] ?? 0),
                    'purchase_price'    => (float) ($latest['purchase_price'] ?? 0),
                    'gst_percent'       => (float) ($latest['gst_percent'] ?? 0),
                ];
            })
            ->values();

            // Extract all attribute values from variant_options that have stock
            // e.g. "Size: 40 | Color: Blue" -> ["Size" => ["40"], "Color" => ["Blue"]]
            $availableAttributeValues = [];
            foreach ($variantOptions as $option) {
                $parts = explode(' | ', (string) $option['attribute_summary']);
                foreach ($parts as $part) {
                    if (str_contains($part, ':')) {
                        [$name, $value] = array_map('trim', explode(':', $part, 2));
                        $availableAttributeValues[$name][] = $value;
                    }
                }
            }

            // Further filter attributes and their values to only include those with stock
            $relevantAttributes = $relevantAttributes->map(function ($attr) use ($availableAttributeValues) {
                $filteredValues = $attr['values']->filter(function ($value) use ($attr, $availableAttributeValues) {
                    $attrName = $attr['attribute_name'];
                    return isset($availableAttributeValues[$attrName]) && in_array($value, $availableAttributeValues[$attrName]);
                })->values();

                if ($filteredValues->isEmpty()) {
                    return null;
                }

                return [
                    'attribute_id' => $attr['attribute_id'],
                    'attribute_name' => $attr['attribute_name'],
                    'values' => $filteredValues,
                ];
            })->filter()->values();

            return [
                'product_unique_id' => $product->unique_id,
                'product_name' => $product->name,
                'product_sku_code' => $product->sku_code,
                'stock' => (int) ($product->stock ?? 0),
                'selling_price' => (float) ($product->selling_price ?? 0),
                'unit_name' => $product->unit?->unit_name,
                'unit_short_name' => $product->unit?->short_name,
                'category_name' => $product->category?->name,
                'brand_name' => $product->brand?->name,
                'product_images' => $product->product_images,
                'description' => $product->description,
                'branch' => $product->branch,
                'branch_id' => $product->branch_id,
                'cms_admin_id' => $product->cms_admin_id ?? $product->created_by,
                'attributes' => $relevantAttributes,
                'variant_options' => $variantOptions,
            ];
        })
        ->values();

        return response()->json([
            'success' => true,
            'message' => 'Loan product catalog retrieved successfully',
            'data' => [
                'total_products' => $mappedProducts->count(),
                'products' => $mappedProducts,
            ],
        ]);
    }

    /**
     * Public catalog detail for a specific product by unique id.
     */
    public function showCatalog(string $uniqueId): JsonResponse
    {
        /** @var ProductMaster|null $product */
        $product = ProductMaster::with(['category', 'brand', 'unit'])
            ->where('unique_id', $uniqueId)
            ->where('status', 'active')
            ->first();

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found or inactive',
            ], 404);
        }

        // Get variant options first to determine which attributes are actually used
        $variantOptions = $this->getVariantOptions($product->id);
        
        // Extract attribute names and values from variant options that have stock
        $usedAttributeValues = [];
        foreach ($variantOptions as $option) {
            $parts = explode(' | ', (string) $option['attribute_summary']);
            foreach ($parts as $part) {
                if (str_contains($part, ':')) {
                    [$name, $value] = array_map('trim', explode(':', $part, 2));
                    $usedAttributeValues[$name][] = $value;
                }
            }
        }
        
        // Only get attributes that are actually used in variants (deduplicate by name)
        $attributes = Attribute::where('status', 'active')
            ->where(function ($query) use ($product) {
                $productCategoryUniqueId = $product->category?->unique_id;

                $query->where('category_id', $product->category_id);

                if (!empty($productCategoryUniqueId)) {
                    $query->orWhere('category_id', $productCategoryUniqueId);
                }
            })
            ->orderBy('name')
            ->get()
            ->groupBy('name')
            ->map(function ($attributeGroup, $attributeName) use ($usedAttributeValues) {
                // Take the first attribute if there are duplicates with same name
                $attribute = $attributeGroup->first();
                $usedValues = $usedAttributeValues[$attributeName] ?? [];
                
                return [
                    'attribute_id' => $attribute->id,
                    'attribute_name' => $attribute->name,
                    'values' => collect(array_unique($usedValues))->values(),
                ];
            })
            ->filter(fn($attr) => $attr['values']->isNotEmpty())
            ->values();

        $variantOptions = $this->getVariantOptions($product->id);
        $latestPricing = $this->getLatestPricing($product);

        // Collect attachments from all purchase items for this product
        $attachments = PurchaseItem::query()
            ->where(function ($q) use ($product) {
                $q->where('product_master_id', (string) $product->id)
                    ->orWhere('product_master_id', (string) $product->unique_id);
            })
            ->pluck('attachments')
            ->filter()
            ->flatMap(function ($row) {
                return collect(is_array($row) ? $row : []);
            })
            ->filter()
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Loan product detail retrieved successfully',
            'data' => [
                'product_unique_id' => $product->unique_id,
                'product_name' => $product->name,
                'product_sku_code' => $product->sku_code,
                'stock' => (int) ($product->stock ?? 0),
                'selling_price' => (float) ($latestPricing['selling_price'] ?? 0),
                'buying_price' => (float) ($latestPricing['buying_price'] ?? 0),
                'gst_percent' => (float) ($latestPricing['gst_percent'] ?? 0),
                'unit_name' => $product->unit?->unit_name,
                'unit_short_name' => $product->unit?->short_name,
                'category_name' => $product->category?->name,
                'brand_name' => $product->brand?->name,
                'description' => $product->description,
                'product_images' => $product->product_images,
                'attributes' => $attributes,
                'variant_options' => $variantOptions,
                'attachments' => $attachments,
            ],
        ]);
    }

    /**
     * Public listing of products that went through loan-buy flow.
     * Table is intentionally lightweight for easy frontend listing.
     */
    public function index(Request $request): JsonResponse
    {
        $query = LoanProductOrder::query()->latest();

        if ($request->filled('branch_id')) {
            $query->where('branch', $request->branch_id);
        }

        if ($request->filled('loan_application_id')) {
            $query->where('loan_application_id', $request->loan_application_id);
        }

        if ($request->filled('customer_unique_id')) {
            $query->where('customer_unique_id', $request->customer_unique_id);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('order_code', 'like', "%{$s}%")
                  ->orWhere('loan_application_id', 'like', "%{$s}%")
                  ->orWhere('customer_unique_id', 'like', "%{$s}%");
            });
        }

        $perPage = (int) ($request->get('per_page', 10));
        $paginated = $query->paginate($perPage, [
            'id', 'order_code', 'loan_application_id', 'customer_unique_id',
            'total_cost', 'products', 'loan_detail', 'status', 'branch', 'created_at',
        ]);

        // Collect all loan_application_ids and check their deleted status in one query
        $loanAppIds = $paginated->getCollection()->pluck('loan_application_id')->filter()->unique()->values()->all();

        $deletedCafIds = CreditApplicationForm::withoutGlobalScope('notDeleted')
            ->whereIn('loan_application_id', $loanAppIds)
            ->where('is_deleted', 1)
            ->pluck('loan_application_id')
            ->flip();

        $existingCafIds = CreditApplicationForm::withoutGlobalScope('notDeleted')
            ->whereIn('loan_application_id', $loanAppIds)
            ->pluck('loan_application_id')
            ->flip();

        $orders = $paginated->getCollection()->map(function ($order) use ($deletedCafIds, $existingCafIds) {
            // Normalise products: should always be set now, but handle legacy null
            if (empty($order->products)) {
                $order->products = [];
            }

            // Build display product name from all products in the JSON
            $productNames = collect($order->products)->pluck('product_name')->filter()->values();
            $order->display_product_name = $productNames->count() > 1
                ? $productNames->first() . ' +' . ($productNames->count() - 1) . ' more'
                : ($productNames->first() ?? '—');

            // Display amount = sum of credit_applied_for across all products
            $order->display_amount = collect($order->products)
                ->sum(fn ($p) => (float) ($p['credit_applied_for'] ?? $p['total_cost'] ?? 0));

            $order->total_products = count($order->products);

            $loanAppId = $order->loan_application_id;
            if (!$loanAppId || !$existingCafIds->has($loanAppId)) {
                $order->caf_status = 'not_found';
            } elseif ($deletedCafIds->has($loanAppId)) {
                $order->caf_status = 'deleted';
            } else {
                $order->caf_status = 'active';
            }

            return $order;
        });

        return response()->json([
            'success' => true,
            'message' => 'Loan product order listing retrieved successfully',
            'data'    => $orders,
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'per_page'     => $paginated->perPage(),
                'total'        => $paginated->total(),
                'last_page'    => $paginated->lastPage(),
                'from'         => $paginated->firstItem(),
                'to'           => $paginated->lastItem(),
            ],
        ]);
    }

    /**
     * Create a loan product buy entry and reduce available stock immediately.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'loan_application_id'          => 'nullable|string',
            'customer_unique_id'           => 'nullable|string',
            'branch_id'                    => 'nullable|string',
            'loan_detail'                  => 'nullable|array',
            'notes'                        => 'nullable|string',
            'products'                     => 'required|array|min:1',
            'products.*.product_unique_id' => 'required|exists:inventory_product_masters,unique_id',
            'products.*.quantity'          => 'required|integer|min:1',
            'products.*.attribute_summary' => 'nullable|string|max:255',
            'products.*.credit_applied_for'=> 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        try {
            $order = DB::transaction(function () use ($request) {
                // Generate order code using max id to avoid gaps from deleted records
                $maxCode = LoanProductOrder::query()->lockForUpdate()->max('order_code');
                $nextNum = $maxCode ? ((int) preg_replace('/\D/', '', (string) $maxCode)) + 1 : 1;
                $orderCode = 'LPO-' . str_pad((string) $nextNum, 4, '0', STR_PAD_LEFT);

                $productsSnapshot = [];
                $totalInventoryCost = 0;

                foreach ($request->products as $index => $item) {
                    /** @var ProductMaster $product */
                    $product = ProductMaster::query()
                        ->lockForUpdate()
                        ->where('unique_id', $item['product_unique_id'])
                        ->first();

                    if (!$product || $product->status !== 'active') {
                        throw new \RuntimeException("Product {$item['product_unique_id']} is not available");
                    }

                    $quantity        = (int) $item['quantity'];
                    $availableStock  = (int) ($product->stock ?? 0);
                    $unitPrice       = (float) ($product->selling_price ?? 0);
                    $rawAttrSummary  = $item['attribute_summary'] ?? null;
                    $selectedVariant = $this->normalizeVariantLabel($rawAttrSummary);
                    $variantProvided = !empty(trim((string) $rawAttrSummary));

                    if ($variantProvided) {
                        // Check variant-level available stock = purchased - sold (from InventorySale records)
                        $variantPurchaseItems = PurchaseItem::query()
                            ->where(function ($q) use ($product) {
                                $q->where('product_master_id', (string) $product->id)
                                  ->orWhere('product_master_id', (string) $product->unique_id);
                            })
                            ->get()
                            ->filter(fn(PurchaseItem $pi) => $this->normalizeVariantLabel($pi->attribute_summary) === $selectedVariant);

                        $variantPurchasedQty = (int) $variantPurchaseItems->sum('quantity');
                        $variantSoldQty = (int) InventorySale::query()
                            ->whereIn('purchase_item_id', $variantPurchaseItems->map(fn($pi) => $this->formatPurchaseItemUniqueId((int) $pi->id))->values()->all())
                            ->sum('quantity');
                        $variantStock = max(0, $variantPurchasedQty - $variantSoldQty);

                        if ($quantity > $variantStock) {
                            throw new \RuntimeException(
                                "Insufficient stock for '{$product->name}' variant '{$selectedVariant}'. Available: {$variantStock}, Required: {$quantity}."
                            );
                        }
                    } elseif ($quantity > $availableStock) {
                        throw new \RuntimeException(
                            "Requested quantity for {$product->name} exceeds available stock ({$availableStock})."
                        );
                    }

                    $lineCost = round($unitPrice * $quantity, 2);
                    $totalInventoryCost += $lineCost;

                    $productsSnapshot[] = [
                        'product_unique_id'  => $product->unique_id,
                        'product_name'       => $product->name,
                        'product_sku_code'   => $product->sku_code,
                        'attribute_summary'  => $variantProvided ? $selectedVariant : ($item['attribute_summary'] ?? null),
                        'quantity'           => $quantity,
                        'unit_price'         => $unitPrice,
                        'unit_name'          => $product->unit?->short_name ?: $product->unit?->unit_name,
                        'total_cost'         => $lineCost,
                        'credit_applied_for' => isset($item['credit_applied_for']) ? (float) $item['credit_applied_for'] : $lineCost,
                        'stock_before'       => $availableStock,
                        'stock_after'        => max(0, $availableStock - $quantity),
                    ];

                    // Decrement PurchaseItem.quantity for the matched variant, then sync ProductMaster.stock
                    if ($variantProvided) {
                        $this->recordVariantSale($product, $selectedVariant, $quantity, $item);
                    } else {
                        $this->recordAnySale($product, $quantity, $item);
                    }
                    $product->decrement('stock', $quantity);
                }

                // Total credit applied for = sum of credit_applied_for across all products
                $totalCreditApplied = array_sum(array_column($productsSnapshot, 'credit_applied_for'));

                // ONE single row for the entire order
                $order = LoanProductOrder::create([
                    'order_code'          => $orderCode,
                    'loan_application_id' => $request->loan_application_id,
                    'customer_unique_id'  => $request->customer_unique_id,
                    'branch'              => $request->branch_id,
                    'total_cost'          => $totalInventoryCost,
                    'loan_detail'         => $request->loan_detail,
                    'products'            => $productsSnapshot,
                    'notes'               => $request->notes,
                    'status'              => 'loan_booked',
                ]);

                // Backfill customer_reference on the sale records with the order_code
                // (createSaleRecord uses $item['order_code'] which wasn't set yet at record time,
                // so we update them now that we have the order_code)
                InventorySale::where('sale_source', 'loan_product_order')
                    ->whereNull('customer_reference')
                    ->whereIn('product_id', array_column($productsSnapshot, 'product_unique_id'))
                    ->where('created_at', '>=', now()->subSeconds(10))
                    ->update(['customer_reference' => $orderCode]);

                return $order;
            });

            $isSingle = count($order->products) === 1;

            return response()->json([
                'success'        => true,
                'message'        => $isSingle
                                        ? 'Loan product order created successfully'
                                        : 'Loan product order created successfully for ' . count($order->products) . ' products',
                'data'           => [
                    'order_code'     => $order->order_code,
                    'total_products' => count($order->products),
                    'total_cost'     => $order->total_cost,
                    'products'       => $order->products,
                    'order'          => $order,
                ],
            ]);
        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create loan product order',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Restore inventory stock for a loan product order whose CAF has been deleted.
     * Removes the InventorySale records tied to this order and increments ProductMaster.stock.
     *
     * POST /api/inventory/loan-product-orders/{id}/restore
     */
    public function restore(int $id): JsonResponse
    {
        $order = LoanProductOrder::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Loan product order not found',
            ], 404);
        }

        if ($order->status === 'restored') {
            return response()->json([
                'success' => false,
                'message' => 'This order has already been restored to inventory',
            ], 422);
        }

        // Verify the linked CAF is actually deleted before allowing restore
        $loanAppId = $order->loan_application_id;
        if ($loanAppId) {
            $caf = CreditApplicationForm::withoutGlobalScope('notDeleted')
                ->where('loan_application_id', $loanAppId)
                ->first();

            if ($caf && $caf->is_deleted == 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot restore: CAF {$loanAppId} is still active. Only orders linked to a deleted CAF can be restored.",
                ], 422);
            }
        }

        try {
            $restoredItems = DB::transaction(function () use ($order) {
                $products = $order->products ?? [];
                $restoredItems = [];

                foreach ($products as $item) {
                    $productUniqueId = $item['product_unique_id'] ?? null;
                    $quantity        = (int) ($item['quantity'] ?? 0);

                    if (!$productUniqueId || $quantity <= 0) continue;

                    $product = ProductMaster::withoutGlobalScope('notDeleted')
                        ->where('unique_id', $productUniqueId)
                        ->lockForUpdate()
                        ->first();

                    if (!$product) continue;

                    // Delete matching InventorySale records for this order.
                    // Primary match: by order_code stored in customer_reference (new orders).
                    // Fallback: by product_id + sale_source, deleting exactly `quantity` rows (legacy orders).
                    $deletedCount = InventorySale::where('sale_source', 'loan_product_order')
                        ->where('product_id', $productUniqueId)
                        ->where('customer_reference', $order->order_code)
                        ->delete();

                    if ($deletedCount === 0) {
                        // Legacy fallback: no customer_reference set — delete oldest matching rows up to quantity
                        $saleIds = InventorySale::where('sale_source', 'loan_product_order')
                            ->where('product_id', $productUniqueId)
                            ->whereNull('customer_reference')
                            ->orderBy('id')
                            ->limit($quantity)
                            ->pluck('id');

                        if ($saleIds->isNotEmpty()) {
                            InventorySale::whereIn('id', $saleIds)->delete();
                        }
                    }

                    // Restore stock on ProductMaster
                    $product->increment('stock', $quantity);

                    $restoredItems[] = [
                        'product_unique_id' => $productUniqueId,
                        'product_name'      => $item['product_name'] ?? $product->name,
                        'quantity_restored'  => $quantity,
                        'stock_after_restore' => $product->fresh()->stock,
                    ];
                }

                $order->update(['status' => 'restored']);

                return $restoredItems;
            });

            return response()->json([
                'success'  => true,
                'message'  => 'Inventory restored successfully for order ' . $order->order_code,
                'data'     => [
                    'order_code'     => $order->order_code,
                    'order_id'       => $order->id,
                    'status'         => 'restored',
                    'restored_items' => $restoredItems,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to restore inventory',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
