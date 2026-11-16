<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory\Invoice;
use App\Models\Inventory\Brand;
use App\Models\Inventory\Category;
use App\Models\Inventory\InventorySale;
use App\Models\Inventory\InvoiceItem;
use App\Models\Inventory\ProductMaster;
use App\Models\Inventory\Purchase;
use App\Models\Inventory\PurchaseItem;
use App\Models\Inventory\Vendor;
use App\Http\Helpers\AuthContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class InventoryReportController extends Controller
{
    public function vendorPurchaseReport(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'from_date' => 'nullable|date',
                'to_date' => 'nullable|date|after_or_equal:from_date',
                'vendor_id' => 'nullable|string', // Support either numeric ID or unique_id
                'payment_method' => 'nullable|string',
                'branch_wise' => 'nullable|boolean', // New parameter for branch-wise data
                'branch_id' => 'nullable|string', // Specific branch filter
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

        $currentBranchId = AuthContext::branchId();
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        $vendorInput = $request->input('vendor_id');
        $paymentMethod = $request->input('payment_method');
        $branchWise = $request->boolean('branch_wise', false);
        $specificBranchId = $request->input('branch_id');

            // Resolve vendor_id if unique_id is provided
            $vendorId = null;
            if ($vendorInput) {
                if (is_numeric($vendorInput)) {
                    $vendor = Vendor::where('id', $vendorInput)->first();
                    $vendorId = $vendor?->unique_id;
                } else {
                    $vendor = Vendor::where('unique_id', $vendorInput)->first();
                    $vendorId = $vendor ? $vendor->unique_id : null;
                }
            }

        // Determine branch filtering logic
        $branchFilter = function($q) use ($currentBranchId, $branchWise, $specificBranchId) {
            if ($specificBranchId) {
                // Filter by specific branch
                $q->where(function($q2) use ($specificBranchId) {
                    $q2->whereRaw('CAST(branch_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$specificBranchId])
                      ->orWhere(function($q3) use ($specificBranchId) {
                          $q3->whereNull('branch_id')->whereRaw('CAST(branch AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$specificBranchId]);
                      });
                });
            } elseif (!$branchWise) {
                // Current branch only (default behavior)
                $q->where(function($q2) use ($currentBranchId) {
                    $q2->whereRaw('CAST(branch_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$currentBranchId])
                      ->orWhere(function($q3) use ($currentBranchId) {
                          $q3->whereNull('branch_id')->whereRaw('CAST(branch AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$currentBranchId]);
                      });
                });
            }
            // If branch_wise=true and no specific branch, don't add branch filter (get all branches)
        };

        if ($branchWise) {
            // Branch-wise summary data
            $branchWiseData = DB::table('inventory_purchase_orders as p')
                ->leftJoin('branches as b', function($join) {
                    $join->whereRaw('CAST(b.code AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(p.branch_id AS CHAR) COLLATE utf8mb4_unicode_ci')
                         ->orWhereRaw('CAST(b.code AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(p.branch AS CHAR) COLLATE utf8mb4_unicode_ci');
                })
                ->leftJoin('inventory_purchase_line_items as pi', function($join) {
                    $join->whereRaw('CAST(pi.purchase_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(p.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci');
                })
                ->select(
                    DB::raw('COALESCE(p.branch_id, p.branch) as branch_code'),
                    DB::raw('COALESCE(b.name, p.branch_id, p.branch) as branch_name'),
                    DB::raw('COUNT(DISTINCT p.id) as total_purchase_orders'),
                    DB::raw('COALESCE(SUM(p.total_amount), 0) as total_purchase_amount'),
                    DB::raw('COALESCE(SUM(pi.quantity), 0) as total_supplied_quantity'),
                    DB::raw('COUNT(DISTINCT p.vendor_id) as unique_vendors')
                )
                ->where(function($q) use ($branchFilter) {
                    $branchFilter($q);
                })
                ->when($fromDate, fn ($q) => $q->whereDate('p.purchase_date', '>=', $fromDate))
                ->when($toDate, fn ($q) => $q->whereDate('p.purchase_date', '<=', $toDate))
                ->when($vendorId, fn ($q) => $q->whereRaw('CAST(p.vendor_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$vendorId]))
                ->when($paymentMethod, fn ($q) => $q->whereRaw('CAST(p.payment_method AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$paymentMethod]))
                ->groupBy('branch_code', 'branch_name')
                ->orderByDesc('total_purchase_amount')
                ->get();

            // Branch-wise vendor summary
            $branchWiseVendorData = DB::table('inventory_purchase_orders as p')
                ->leftJoin('branches as b', function($join) {
                    $join->whereRaw('CAST(b.code AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(p.branch_id AS CHAR) COLLATE utf8mb4_unicode_ci')
                         ->orWhereRaw('CAST(b.code AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(p.branch AS CHAR) COLLATE utf8mb4_unicode_ci');
                })
                ->leftJoin('inventory_vendors as v', function($join) {
                    $join->whereRaw('CAST(v.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(p.vendor_id AS CHAR) COLLATE utf8mb4_unicode_ci');
                })
                ->leftJoin('inventory_purchase_line_items as pi', function($join) {
                    $join->whereRaw('CAST(pi.purchase_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(p.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci');
                })
                ->select(
                    DB::raw('COALESCE(p.branch_id, p.branch) as branch_code'),
                    DB::raw('COALESCE(b.name, p.branch_id, p.branch) as branch_name'),
                    DB::raw('COALESCE(v.unique_id, p.vendor_id) as vendor_id'),
                    DB::raw('COALESCE(v.name, p.vendor_name, "Unknown Vendor") as vendor_name'),
                    'v.business_name as vendor_business_name',
                    'v.deleted_at as vendor_deleted_at',
                    DB::raw('COUNT(DISTINCT p.id) as purchase_count'),
                    DB::raw('COALESCE(SUM(pi.quantity), 0) as total_quantity_supplied'),
                    DB::raw('COALESCE(SUM(pi.line_total), 0) as total_purchase_amount'),
                    DB::raw('MAX(p.purchase_date) as last_purchase_date')
                )
                ->where(function($q) use ($branchFilter) {
                    $branchFilter($q);
                })
                ->when($fromDate, fn ($q) => $q->whereDate('p.purchase_date', '>=', $fromDate))
                ->when($toDate, fn ($q) => $q->whereDate('p.purchase_date', '<=', $toDate))
                ->when($vendorId, fn ($q) => $q->whereRaw('CAST(p.vendor_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$vendorId]))
                ->when($paymentMethod, fn ($q) => $q->whereRaw('CAST(p.payment_method AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$paymentMethod]))
                ->groupBy('branch_code', 'branch_name', 'vendor_id', 'vendor_name', 'v.business_name', 'v.deleted_at')
                ->orderBy('branch_code')
                ->orderByDesc('total_purchase_amount')
                ->get()
                ->groupBy('branch_code');

            return response()->json([
                'success' => true,
                'message' => 'Branch-wise vendor purchase report generated successfully',
                'data' => [
                    'filters' => [
                        'from_date' => $fromDate,
                        'to_date' => $toDate,
                        'vendor_id' => $vendorId,
                        'payment_method' => $paymentMethod,
                        'branch_wise' => true,
                        'branch_id' => $specificBranchId,
                    ],
                    'branch_wise_summary' => $branchWiseData,
                    'branch_wise_vendor_data' => $branchWiseVendorData,
                ],
            ]);
        }

        // Original single-branch logic (when branch_wise=false)
        $branchId = $specificBranchId ?: $currentBranchId;

        $purchaseBase = Purchase::query()
            ->where(function($q) use ($branchId) {
                $q->whereRaw('CAST(branch_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$branchId])
                  ->orWhere(function($q2) use ($branchId) {
                      $q2->whereNull('branch_id')->whereRaw('CAST(branch AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$branchId]);
                  });
            })
            ->when($fromDate, fn ($q) => $q->whereDate('purchase_date', '>=', $fromDate))
            ->when($toDate, fn ($q) => $q->whereDate('purchase_date', '<=', $toDate))
            ->when($vendorId, fn ($q) => $q->where('vendor_id', $vendorId))
            ->when($paymentMethod, fn ($q) => $q->where('payment_method', $paymentMethod));

            $totalPurchaseAmount = (float) (clone $purchaseBase)->sum('total_amount');
            $totalPurchaseOrders = (int) (clone $purchaseBase)->count();

        $totalSuppliedQuantity = (int) DB::table('inventory_purchase_line_items as pi')
            ->join('inventory_purchase_orders as p', function($join) {
                $join->whereRaw('CAST(p.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(pi.purchase_id AS CHAR) COLLATE utf8mb4_unicode_ci');
            })
            ->where(function($q) use ($branchId) {
                $q->whereRaw('CAST(p.branch_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$branchId])
                  ->orWhere(function($q2) use ($branchId) {
                      $q2->whereNull('p.branch_id')->whereRaw('CAST(p.branch AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$branchId]);
                  });
            })
            ->when($fromDate, fn ($q) => $q->whereDate('p.purchase_date', '>=', $fromDate))
            ->when($toDate, fn ($q) => $q->whereDate('p.purchase_date', '<=', $toDate))
            ->when($vendorId, fn ($q) => $q->whereRaw('CAST(p.vendor_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$vendorId]))
            ->when($paymentMethod, fn ($q) => $q->whereRaw('CAST(p.payment_method AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$paymentMethod]))
            ->sum('pi.quantity');

        $activeVendorsCount = (int) Vendor::withoutGlobalScopes()
            ->where('status', 'active')
            ->where(function($q) use ($branchId) {
                $q->where('branch_id', $branchId)
                  ->orWhere(function($q2) use ($branchId) {
                      $q2->whereNull('branch_id')->where('branch', $branchId);
                  });
            })
            ->count();

        $vendorWiseSummary = Vendor::withTrashed()
            ->select(
                'inventory_vendors.id',
                'inventory_vendors.unique_id',
                'inventory_vendors.name',
                'inventory_vendors.business_name',
                'inventory_vendors.phone',
                'inventory_vendors.deleted_at',
                DB::raw('COUNT(DISTINCT p.id) as purchase_count'),
                DB::raw('COALESCE(SUM(pi.quantity), 0) as total_quantity_supplied'),
                DB::raw('COALESCE(SUM(pi.line_total), 0) as total_purchase_amount'),
                DB::raw('COALESCE(AVG(pi.purchase_price), 0) as avg_purchase_price'),
                DB::raw('MAX(p.purchase_date) as last_purchase_date')
            )
            ->leftJoin('inventory_purchase_orders as p', function ($join) use ($branchId, $fromDate, $toDate, $paymentMethod) {
                $join->whereRaw('CAST(p.vendor_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(inventory_vendors.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci')
                    ->where(function($q) use ($branchId) {
                        $q->whereRaw('CAST(p.branch_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$branchId])
                          ->orWhere(function($q2) use ($branchId) {
                              $q2->whereNull('p.branch_id')->whereRaw('CAST(p.branch AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$branchId]);
                          });
                    });

                    if ($fromDate) {
                        $join->whereDate('p.purchase_date', '>=', $fromDate);
                    }
                    if ($toDate) {
                        $join->whereDate('p.purchase_date', '<=', $toDate);
                    }
                    if ($paymentMethod) {
                        $join->whereRaw('CAST(p.payment_method AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$paymentMethod]);
                    }
                })
                ->leftJoin('inventory_purchase_line_items as pi', function($join) {
                    $join->whereRaw('CAST(pi.purchase_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(p.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci');
                })
                ->when($vendorId, fn ($q) => $q->whereRaw('CAST(inventory_vendors.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$vendorId]))
                ->groupBy(
                    'inventory_vendors.id',
                    'inventory_vendors.unique_id',
                    'inventory_vendors.name',
                    'inventory_vendors.business_name',
                    'inventory_vendors.phone',
                    'inventory_vendors.deleted_at'
                )
                ->orderByDesc(DB::raw('COALESCE(SUM(pi.line_total), 0)'))
                ->get();

        $productSupplyByVendor = DB::table('inventory_purchase_line_items as pi')
            ->join('inventory_purchase_orders as p', function($join) {
                $join->whereRaw('CAST(p.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(pi.purchase_id AS CHAR) COLLATE utf8mb4_unicode_ci');
            })
            ->leftJoin('inventory_vendors as v', function($join) {
                $join->whereRaw('CAST(v.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(p.vendor_id AS CHAR) COLLATE utf8mb4_unicode_ci');
            })
            ->leftJoin('inventory_product_masters as pm', function($join) {
                $join->whereRaw('CAST(pm.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(pi.product_master_id AS CHAR) COLLATE utf8mb4_unicode_ci');
            })
            ->where(function($q) use ($branchId) {
                $q->whereRaw('CAST(p.branch_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$branchId])
                  ->orWhere(function($q2) use ($branchId) {
                      $q2->whereNull('p.branch_id')->whereRaw('CAST(p.branch AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$branchId]);
                  });
            })
            ->when($fromDate, fn ($q) => $q->whereDate('p.purchase_date', '>=', $fromDate))
            ->when($toDate, fn ($q) => $q->whereDate('p.purchase_date', '<=', $toDate))
            ->when($vendorId, fn ($q) => $q->whereRaw('CAST(p.vendor_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$vendorId]))
            ->when($paymentMethod, fn ($q) => $q->whereRaw('CAST(p.payment_method AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$paymentMethod]))
            ->select([
                DB::raw('COALESCE(v.unique_id, p.vendor_id) as vendor_id'),
                DB::raw('MAX(COALESCE(v.name, p.vendor_name, "Unknown Vendor")) as vendor_name'),
                DB::raw('MAX(v.business_name) as vendor_business_name'),
                DB::raw('COALESCE(pm.id, pi.product_master_id) as product_id'),
                DB::raw('MAX(COALESCE(pm.name, "Deleted Product")) as product_name'),
                DB::raw('MAX(pm.sku_code) as sku_code'),
                DB::raw('MAX(pm.deleted_at) as product_deleted_at'),
                DB::raw('SUM(pi.quantity) as supplied_quantity'),
                DB::raw('SUM(pi.line_total) as supplied_value'),
                DB::raw('AVG(pi.purchase_price) as avg_purchase_price'),
                DB::raw('MAX(p.purchase_date) as last_purchase_date'),
            ])
            ->groupBy(
                DB::raw('COALESCE(v.unique_id, p.vendor_id)'),
                DB::raw('COALESCE(pm.id, pi.product_master_id)')
            )
            ->orderByDesc(DB::raw('SUM(pi.quantity)'))
            ->limit(300)
            ->get()
            ->map(function ($row) {
                return [
                    'vendor_id'           => $row->vendor_id,
                    'vendor_name'         => $row->vendor_name,
                    'vendor_business_name'=> $row->vendor_business_name,
                    'product_id'          => $row->product_id,
                    'product_name'        => $row->product_name,
                    'sku_code'            => $row->sku_code,
                    'product_deleted_at'  => $row->product_deleted_at,
                    'is_product_deleted'  => !is_null($row->product_deleted_at),
                    'deleted_on'          => $row->product_deleted_at ? date('d M Y', strtotime($row->product_deleted_at)) : null,
                    'supplied_quantity'   => $row->supplied_quantity,
                    'supplied_value'      => $row->supplied_value,
                    'avg_purchase_price'  => $row->avg_purchase_price,
                    'last_purchase_date'  => $row->last_purchase_date,
                ];
            });

        $detailedVendorPurchases = Purchase::query()
            ->with(['vendor' => function($q) { $q->withTrashed(); }, 'items.productMaster' => function($q) { $q->withTrashed(); }])
            ->where(function($q) use ($branchId) {
                $q->where('branch_id', $branchId)
                  ->orWhere(function($q2) use ($branchId) {
                      $q2->whereNull('branch_id')->where('branch', $branchId);
                  });
            })
            ->when($vendorId, fn ($q) => $q->where('vendor_id', $vendorId))
            ->when($fromDate, fn ($q) => $q->whereDate('purchase_date', '>=', $fromDate))
            ->when($toDate, fn ($q) => $q->whereDate('purchase_date', '<=', $toDate))
            ->when($paymentMethod, fn ($q) => $q->where('payment_method', $paymentMethod))
            ->orderByDesc('purchase_date')
            ->get()
            ->map(function ($purchase) {
                $purchase->items = $purchase->items->map(function ($item) {
                    $product = $item->productMaster;
                    
                    if (!$product) {
                        // Attempt fallback if relationship failed
                        $product = ProductMaster::withTrashed()
                            ->where('unique_id', $item->product_master_id)
                            ->first();
                    }

                    $isDeleted = $product ? $product->trashed() : true;
                    $deletedOn = $product ? optional($product->deleted_at)->toDateString() : null;

                    return [
                        'id' => $item->id,
                        'product_master_id' => $item->product_master_id,
                        'product_master' => $product ? [
                            'id' => $product->id,
                            'name' => $product->name,
                            'sku_code' => $product->sku_code,
                            'deleted_at' => $product->deleted_at,
                        ] : null,
                        'is_product_deleted' => $isDeleted,
                        'product_deleted_on' => $deletedOn,
                        'quantity' => $item->quantity,
                        'purchase_price' => $item->purchase_price,
                        'line_total' => $item->line_total,
                    ];
                })->values();

                return $purchase;
            });

            return response()->json([
                'success' => true,
                'message' => 'Vendor purchase report generated successfully',
                'data' => [
                    'filters' => [
                        'from_date' => $fromDate,
                        'to_date' => $toDate,
                        'vendor_id' => $vendorId,
                        'payment_method' => $paymentMethod,
                        'branch_wise' => $branchWise,
                        'branch_id' => $specificBranchId ?: $currentBranchId,
                    ],
                    'summary' => [
                        'total_purchase_amount' => $totalPurchaseAmount,
                        'total_purchase_orders' => $totalPurchaseOrders,
                        'total_supplied_quantity' => $totalSuppliedQuantity,
                        'active_vendors_count' => $activeVendorsCount,
                    ],
                    'vendor_wise_summary' => $vendorWiseSummary,
                    'product_supply_by_vendor' => $productSupplyByVendor,
                    'detailed_vendor_purchases' => $detailedVendorPurchases,
                ],
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Vendor Purchase Report Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate vendor purchase report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function salesReport(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
            'product_id' => 'nullable|integer|exists:inventory_product_masters,id',
            'payment_method' => 'nullable|string',
            'customer_name' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $branchId = AuthContext::branchId();
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        $productId = $request->input('product_id');
        $paymentMethod = $request->input('payment_method');
        $customerName = $request->input('customer_name');

        $salesQuery = Invoice::withTrashed()
            ->where('branch', $branchId)
            ->when($fromDate, fn($q) => $q->whereDate('invoice_date', '>=', $fromDate))
            ->when($toDate, fn($q) => $q->whereDate('invoice_date', '<=', $toDate))
            ->when($paymentMethod, fn($q) => $q->where('payment_method', $paymentMethod))
            ->when($customerName, fn($q) => $q->where('customer_name', 'like', "%{$customerName}%"));

        // General Summary
        $summary = [
            'total_sales_amount' => (float) (clone $salesQuery)->sum('grand_total'),
            'total_invoices' => (int) (clone $salesQuery)->count(),
            'total_items_sold' => (int) DB::table('inventory_sales_order_items as ii')
                ->join('inventory_sales_orders as i', 'i.invoice_no', '=', 'ii.invoice_id')
                ->where('i.branch', $branchId)
                ->when($fromDate, fn($q) => $q->whereDate('i.invoice_date', '>=', $fromDate))
                ->when($toDate, fn($q) => $q->whereDate('i.invoice_date', '<=', $toDate))
                ->sum('ii.quantity'),
        ];

        // Product Wise Summary — include deleted invoices
        $productWiseSummary = DB::table('inventory_sales_order_items as ii')
            ->join('inventory_sales_orders as i', function($join) {
                $join->on('i.invoice_no', '=', 'ii.invoice_id');
            })
            ->leftJoin('inventory_product_masters as pm', function($join) {
                $join->whereRaw('CAST(pm.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(ii.product_id AS CHAR) COLLATE utf8mb4_unicode_ci');
            })
            ->where('i.branch', $branchId)
            ->when($fromDate, fn($q) => $q->whereDate('i.invoice_date', '>=', $fromDate))
            ->when($toDate, fn($q) => $q->whereDate('i.invoice_date', '<=', $toDate))
            ->when($paymentMethod, fn($q) => $q->where('i.payment_method', $paymentMethod))
            ->when($productId, function ($q) use ($productId) {
                $q->where(function ($inner) use ($productId) {
                    $inner->where('pm.id', $productId)
                        ->orWhere('pm.unique_id', $productId)
                        ->orWhere('ii.product_id', $productId);
                });
            })
            ->select(
                DB::raw('COALESCE(pm.id, ii.product_id) as id'),
                DB::raw('MAX(COALESCE(pm.name, ii.product_name, "Deleted Product")) as name'),
                DB::raw('MAX(pm.sku_code) as sku_code'),
                DB::raw('MAX(pm.deleted_at) as deleted_at'),
                DB::raw('SUM(ii.quantity) as total_qty'),
                DB::raw('SUM(ii.total) as total_revenue'),
                DB::raw('AVG(ii.price) as avg_sale_price'),
                DB::raw('COUNT(DISTINCT i.id) as invoice_count')
            )
            ->groupBy(DB::raw('COALESCE(pm.id, ii.product_id)'))
            ->orderByDesc('total_revenue')
            ->get()
            ->map(function ($row) {
                return [
                    'id'            => $row->id,
                    'name'          => $row->name,
                    'sku_code'      => $row->sku_code,
                    'deleted_at'    => $row->deleted_at,
                    'is_deleted'    => !is_null($row->deleted_at),
                    'deleted_on'    => $row->deleted_at ? date('d M Y', strtotime($row->deleted_at)) : null,
                    'total_qty'     => $row->total_qty,
                    'total_revenue' => $row->total_revenue,
                    'avg_sale_price'=> $row->avg_sale_price,
                    'invoice_count' => $row->invoice_count,
                ];
            });

        // Detailed Sales Records — include deleted (cancelled) invoices
        $detailedSales = Invoice::withTrashed()
            ->with(['items.product'])
            ->where('branch', $branchId)
            ->when($fromDate, fn($q) => $q->whereDate('invoice_date', '>=', $fromDate))
            ->when($toDate, fn($q) => $q->whereDate('invoice_date', '<=', $toDate))
            ->when($paymentMethod, fn($q) => $q->where('payment_method', $paymentMethod))
            ->when($customerName, fn($q) => $q->where('customer_name', 'like', "%{$customerName}%"))
            ->when($productId, function($q) use ($branchId, $productId) {
                $productUniqueId = ProductMaster::withTrashed()
                    ->where('id', $productId)
                    ->orWhere('unique_id', $productId)
                    ->value('unique_id');

                $q->whereHas('items', function ($iq) use ($productId, $productUniqueId) {
                    $iq->where('product_id', (string) $productId)
                        ->orWhere('product_id', (string) $productUniqueId);
                });
            })
            ->orderByDesc('invoice_date')
            ->orderByDesc('id')
            ->get()
            ->map(function ($invoice) {
                $invoice->items = $invoice->items->map(function ($item) {
                    $product = $item->product;

                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'product_name' => $item->product_name,
                        'quantity' => $item->quantity,
                        'price' => $item->price,
                        'total' => $item->total,
                        'product' => $product ? [
                            'id' => $product->id,
                            'name' => $product->name,
                            'sku_code' => $product->sku_code,
                            'deleted_at' => $product->deleted_at,
                        ] : null,
                        'is_product_deleted' => $product ? $product->trashed() : true,
                        'product_deleted_on' => $product ? optional($product->deleted_at)->toDateString() : null,
                    ];
                });
                return [
                        'id'             => $invoice->id,
                        'invoice_no'     => $invoice->invoice_no,
                        'customer_name'  => $invoice->customer_name,
                        'customer_phone' => $invoice->customer_phone,
                        'invoice_date'   => $invoice->invoice_date,
                        'grand_total'    => $invoice->grand_total,
                        'paid_amount'    => $invoice->paid_amount,
                        'balance_amount' => $invoice->balance_amount,
                        'payment_method' => $invoice->payment_method,
                        'payment_status' => $invoice->payment_status,
                        'status'         => $invoice->status,
                        'is_cancelled'   => !is_null($invoice->deleted_at),
                        'cancelled_at'   => $invoice->deleted_at,
                        'cancelled_on'   => $invoice->deleted_at ? date('d M Y', strtotime($invoice->deleted_at)) : null,
                        'notes'          => $invoice->notes,
                        'items'          => $invoice->items,
                    ];
                });

        return response()->json([
            'success' => true,
            'summary' => $summary,
            'product_wise_summary' => $productWiseSummary,
            'detailed_sales' => $detailedSales,
        ]);
    }

    public function inventoryStockReport(Request $request): JsonResponse
    {
        try {
        $branchId = AuthContext::branchId();
        $categoryId = $request->input('category_id');
        $brandId = $request->input('brand_id');
        $search = $request->input('search');

        // Single query with LEFT JOINs — avoids BranchScope on Category/Brand/Unit
        $rows = DB::table('inventory_product_masters as pm')
            ->leftJoin('inventory_categories as cat', function($join) {
                $join->whereRaw('CAST(cat.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(pm.category_id AS CHAR) COLLATE utf8mb4_unicode_ci');
            })
            ->leftJoin('inventory_brands as br', function($join) {
                $join->whereRaw('CAST(br.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(pm.brand_id AS CHAR) COLLATE utf8mb4_unicode_ci');
            })
            ->leftJoin('inventory_units as un', function($join) {
                $join->whereRaw('CAST(un.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(pm.unit_id AS CHAR) COLLATE utf8mb4_unicode_ci');
            })
            ->leftJoin(
                DB::raw('(SELECT pi.product_master_id, COALESCE(SUM(pi.quantity),0) as total_purchased
                    FROM inventory_purchase_line_items pi
                    INNER JOIN inventory_purchase_orders p ON (
                        CAST(p.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(pi.purchase_id AS CHAR) COLLATE utf8mb4_unicode_ci
                        OR CAST(p.id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(pi.purchase_id AS CHAR) COLLATE utf8mb4_unicode_ci
                    )
                    WHERE p.status = "completed"
                      AND (
                        CAST(p.branch_id AS CHAR) COLLATE utf8mb4_unicode_ci = "' . addslashes((string) $branchId) . '"
                        OR (p.branch_id IS NULL AND CAST(p.branch AS CHAR) COLLATE utf8mb4_unicode_ci = "' . addslashes((string) $branchId) . '")
                      )
                    GROUP BY pi.product_master_id) as purch'),
                function($join) {
                    $join->whereRaw('CAST(purch.product_master_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(pm.unique_id AS CHAR) COLLATE utf8mb4_unicode_ci')
                         ->orWhereRaw('CAST(purch.product_master_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(pm.id AS CHAR) COLLATE utf8mb4_unicode_ci');
                }
            )
            ->select(
                'pm.id', 'pm.unique_id', 'pm.name', 'pm.sku_code', 'pm.deleted_at',
                'cat.name as category_name',
                'br.name as brand_name',
                'un.short_name as unit_short', 'un.unit_name as unit_full',
                DB::raw('COALESCE(purch.total_purchased, 0) as total_purchased')
            )
            ->where(function($q) use ($branchId) {
                $q->whereRaw('CAST(pm.branch_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$branchId])
                  ->orWhere(function($q2) use ($branchId) {
                      $q2->whereNull('pm.branch_id')->whereRaw('CAST(pm.branch AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$branchId]);
                  });
            })
            ->when($categoryId, fn($q) => $q->whereRaw('CAST(pm.category_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$categoryId]))
            ->when($brandId,    fn($q) => $q->whereRaw('CAST(pm.brand_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$brandId]))
            ->when($search, fn($q) => $q->where(function($q2) use ($search) {
                $q2->where('pm.name', 'like', "%{$search}%")
                   ->orWhere('pm.sku_code', 'like', "%{$search}%");
            }))
            ->get();

        $formatPurchaseItemUniqueId = static fn (int $id): string => 'INV-PI-' . str_pad((string) $id, 6, '0', STR_PAD_LEFT);

        $productIds = $rows->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
        $productUniqueIds = $rows->pluck('unique_id')->filter()->map(fn ($id) => (string) $id)->values()->all();

        $purchaseItems = PurchaseItem::query()
            ->where(function ($q) use ($productIds, $productUniqueIds) {
                $q->whereIn('product_master_id', array_map('strval', $productIds));
                if (!empty($productUniqueIds)) {
                    $q->orWhereIn('product_master_id', $productUniqueIds);
                }
            })
            ->where(function ($q) use ($branchId) {
                $q->whereRaw('CAST(branch_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$branchId])
                    ->orWhere(function ($q2) use ($branchId) {
                        $q2->whereNull('branch_id')->whereRaw('CAST(branch AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$branchId]);
                    });
            })
            ->get(['id', 'product_master_id', 'attribute_summary', 'quantity']);

        $productIdByUnique = $rows->mapWithKeys(fn ($row) => [(string) $row->unique_id => (int) $row->id]);
        $purchaseItemsByProductId = collect();
        foreach ($purchaseItems as $item) {
            $rawProductRef = (string) $item->product_master_id;
            $resolvedProductId = ctype_digit($rawProductRef)
                ? (int) $rawProductRef
                : ($productIdByUnique[$rawProductRef] ?? null);

            if (!$resolvedProductId) {
                continue;
            }

            if (!$purchaseItemsByProductId->has($resolvedProductId)) {
                $purchaseItemsByProductId->put($resolvedProductId, collect());
            }

            $purchaseItemsByProductId->get($resolvedProductId)->push($item);
        }

        $purchaseItemIds = $purchaseItems->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
        $purchaseItemUniqueIds = collect($purchaseItemIds)
            ->map(fn ($id) => $formatPurchaseItemUniqueId((int) $id))
            ->values()
            ->all();

        $normalizePurchaseItemKey = static function (?string $value) use ($formatPurchaseItemUniqueId): ?string {
            $raw = trim((string) $value);
            if ($raw === '') {
                return null;
            }
            if (preg_match('/^INV-PI-\d+$/', $raw)) {
                return $raw;
            }
            if (ctype_digit($raw)) {
                return $formatPurchaseItemUniqueId((int) $raw);
            }
            return null;
        };

        $invoiceSoldByPurchaseItem = collect();
        if (!empty($purchaseItemIds)) {
            $invoiceSoldRows = InvoiceItem::query()
                ->join('inventory_sales_orders as i', function ($join) {
                    $join->whereRaw('CAST(i.invoice_no AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(inventory_sales_order_items.invoice_id AS CHAR) COLLATE utf8mb4_unicode_ci');
                })
                ->where(function ($q) use ($branchId) {
                    $q->whereRaw('CAST(i.branch_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$branchId])
                        ->orWhere(function ($q2) use ($branchId) {
                            $q2->whereNull('i.branch_id')->whereRaw('CAST(i.branch AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$branchId]);
                        });
                })
                ->whereNull('i.deleted_at')
                ->where(function ($q) use ($purchaseItemUniqueIds, $purchaseItemIds) {
                    $q->whereIn('inventory_sales_order_items.purchase_item_id', $purchaseItemUniqueIds)
                        ->orWhereIn('inventory_sales_order_items.purchase_item_id', array_map('strval', $purchaseItemIds))
                        ->orWhereIn('inventory_sales_order_items.purchase_item_unique_id', $purchaseItemUniqueIds);
                })
                ->select(
                    'inventory_sales_order_items.purchase_item_id',
                    'inventory_sales_order_items.purchase_item_unique_id',
                    DB::raw('SUM(inventory_sales_order_items.quantity) as sold_qty')
                )
                ->groupBy('inventory_sales_order_items.purchase_item_id', 'inventory_sales_order_items.purchase_item_unique_id')
                ->get();

            foreach ($invoiceSoldRows as $row) {
                $normalizedKey = $normalizePurchaseItemKey((string) ($row->purchase_item_unique_id ?: $row->purchase_item_id));
                if (!$normalizedKey) {
                    continue;
                }
                $invoiceSoldByPurchaseItem[$normalizedKey] = ((float) ($invoiceSoldByPurchaseItem[$normalizedKey] ?? 0)) + (float) $row->sold_qty;
            }
        }

        $directSoldByPurchaseItem = collect();
        if (!empty($purchaseItemIds)) {
            $directSoldRows = InventorySale::query()
                ->where(function ($q) use ($branchId) {
                    $q->whereRaw('CAST(branch_id AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$branchId])
                        ->orWhere(function ($q2) use ($branchId) {
                            $q2->whereNull('branch_id')->whereRaw('CAST(branch AS CHAR) COLLATE utf8mb4_unicode_ci = ?', [$branchId]);
                        });
                })
                ->where(function ($q) use ($purchaseItemUniqueIds, $purchaseItemIds) {
                    $q->whereIn('purchase_item_id', $purchaseItemUniqueIds)
                        ->orWhereIn('purchase_item_id', array_map('strval', $purchaseItemIds));
                })
                ->select('purchase_item_id', DB::raw('SUM(quantity) as sold_qty'))
                ->groupBy('purchase_item_id')
                ->get();

            foreach ($directSoldRows as $row) {
                $normalizedKey = $normalizePurchaseItemKey((string) $row->purchase_item_id);
                if (!$normalizedKey) {
                    continue;
                }
                $directSoldByPurchaseItem[$normalizedKey] = ((float) ($directSoldByPurchaseItem[$normalizedKey] ?? 0)) + (float) $row->sold_qty;
            }
        }

        $products = $rows->map(function ($row) use ($purchaseItemsByProductId, $formatPurchaseItemUniqueId, $invoiceSoldByPurchaseItem, $directSoldByPurchaseItem) {
            $productPurchaseItems = $purchaseItemsByProductId->get((int) $row->id, collect());
            $variantStock = $productPurchaseItems
                ->groupBy(function (PurchaseItem $item) {
                    $label = trim((string) ($item->attribute_summary ?? ''));
                    return $label !== '' ? $label : 'Default';
                })
                ->map(function ($group, $attributeSummary) use ($formatPurchaseItemUniqueId, $invoiceSoldByPurchaseItem, $directSoldByPurchaseItem) {
                    $purchasedQty = (float) collect($group)->sum(fn (PurchaseItem $item) => (float) ($item->quantity ?? 0));
                    $soldQty = (float) collect($group)->sum(function (PurchaseItem $item) use ($formatPurchaseItemUniqueId, $invoiceSoldByPurchaseItem, $directSoldByPurchaseItem) {
                        $key = $formatPurchaseItemUniqueId((int) $item->id);
                        return (float) ($invoiceSoldByPurchaseItem[$key] ?? 0) + (float) ($directSoldByPurchaseItem[$key] ?? 0);
                    });
                    $remainingQty = max(0, $purchasedQty - $soldQty);

                    return [
                        'attribute_summary' => (string) $attributeSummary,
                        'purchased_qty' => round($purchasedQty, 2),
                        'sold_qty' => round($soldQty, 2),
                        'available_stock' => round($remainingQty, 2),
                    ];
                })
                ->values();

            $purchased = (float) $variantStock->sum('purchased_qty');
            $sold = (float) $variantStock->sum('sold_qty');
            $currentStock = max(0, $purchased - $sold);

            return [
                'id'             => $row->id,
                'name'           => $row->name,
                'sku_code'       => $row->sku_code,
                'category'       => $row->category_name ?? 'N/A',
                'brand'          => $row->brand_name    ?? 'N/A',
                'purchased_qty'  => $purchased,
                'sold_qty'       => $sold,
                'current_stock'  => $currentStock,
                'variant_stock'  => $variantStock,
                'min_stock_level'=> 10,
                'is_low_stock'   => $currentStock > 0 && $currentStock <= 10,
                'unit'           => $row->unit_short ?? $row->unit_full ?? 'Pcs',
                'deleted_at'     => $row->deleted_at,
                'is_deleted'     => !is_null($row->deleted_at),
            ];
        });

            // Overall Summary Calculations
            $summary = [
                'total_products' => $products->count(),
                'low_stock_count' => $products->where('is_low_stock', true)->count(),
                'total_stock_value' => $products->sum(fn($p) => $p['current_stock'] * 0), // Placeholder if price available
                'out_of_stock_count' => $products->where('current_stock', '<=', 0)->count(),
            ];

            return response()->json([
                'success' => true,
                'summary' => $summary,
                'stock_data' => $products,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Inventory Stock Report Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate inventory stock report',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
