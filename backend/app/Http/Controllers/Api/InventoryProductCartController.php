<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryProductCart;
use App\Models\Inventory\ProductMaster;
use App\Models\Inventory\PurchaseItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class InventoryProductCartController extends Controller
{
    private function mapInquiryRow(object $row): array
    {
        $attrs = [];
        if (is_array($row->attributes)) {
            $attrs = $row->attributes;
        } elseif (is_string($row->attributes) && $row->attributes !== '') {
            $decoded = json_decode($row->attributes, true);
            $attrs = is_array($decoded) ? $decoded : [];
        }

        return [
            'id' => $row->id,
            'inquiry_id' => $row->unique_id,
            'product_id' => $row->product_id,
            'product_name' => $row->product_name,
            'price' => (float) ($row->price ?? 0),
            'selling_price' => (float) ($row->selling_price ?? 0),
            'buying_price' => (float) ($row->buying_price ?? 0),
            'customer_name' => $row->customer_name,
            'customer_phone' => $row->customer_phone,
            'customer_email' => $row->customer_email,
            'branch_id' => $row->branch_id,
            'cms_admin_id' => $row->cms_admin_id,
            'selected_variant' => $row->selected_variant,
            'verified_by_fe' => (int) ($row->verified_by_fe ?? 0),
            'attributes' => $attrs,
            'created_at' => $row->created_at,
        ];
    }

    public function verifyByFe(Request $request, string $inquiryId): JsonResponse
    {
        $query = InventoryProductCart::query()->where(function ($q) use ($inquiryId) {
            $q->where('unique_id', $inquiryId);
            if (ctype_digit($inquiryId)) {
                $q->orWhere('id', (int) $inquiryId);
            }
        });

        $row = $query->first();

        if (!$row) {
            return response()->json([
                'success' => false,
                'message' => 'Inquiry not found',
            ], 404);
        }

        $row->verified_by_fe = 1;
        $row->save();

        return response()->json([
            'success' => true,
            'message' => 'Inquiry verified successfully',
        ]);
    }

    public function show(Request $request, string $inquiryId): JsonResponse
    {
        $query = InventoryProductCart::query()
            ->leftJoin('inventory_product_masters as pm', 'inventory_product_cart.product_id', '=', 'pm.unique_id')
            ->select([
                'inventory_product_cart.id',
                'inventory_product_cart.unique_id',
                'inventory_product_cart.customer_name',
                'inventory_product_cart.customer_phone',
                'inventory_product_cart.customer_email',
                'inventory_product_cart.product_id',
                'inventory_product_cart.branch_id',
                'inventory_product_cart.cms_admin_id',
                'inventory_product_cart.price',
                'inventory_product_cart.selling_price',
                'inventory_product_cart.buying_price',
                'inventory_product_cart.selected_variant',
                'inventory_product_cart.verified_by_fe',
                'inventory_product_cart.attributes',
                'inventory_product_cart.created_at',
                DB::raw('COALESCE(pm.name, "Unknown Product") as product_name'),
            ])
            ->where(function ($q) use ($inquiryId) {
                $q->where('inventory_product_cart.unique_id', $inquiryId);
                if (ctype_digit($inquiryId)) {
                    $q->orWhere('inventory_product_cart.id', (int) $inquiryId);
                }
            });

        $row = $query->first();

        if (!$row) {
            return response()->json([
                'success' => false,
                'message' => 'Inquiry not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Inquiry detail fetched successfully',
            'data' => $this->mapInquiryRow($row),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRole = strtolower((string) ($user->role ?? ''));

        $userBranch = (string) ($user->branch ?? $user->branch_id ?? '');
        $requestedBranch = (string) ($request->query('branch_id', ''));
        $effectiveBranch = str_contains($userRole, 'field executive')
            ? $userBranch
            : ($requestedBranch !== '' ? $requestedBranch : $userBranch);

        $requestedCmsAdmin = (string) ($request->query('cms_admin_id', ''));
        $effectiveCmsAdmin = $requestedCmsAdmin;
        $verifiedFilter = (string) $request->query('verified_by_fe', '0');

        $query = InventoryProductCart::query()
            ->leftJoin('inventory_product_masters as pm', 'inventory_product_cart.product_id', '=', 'pm.unique_id')
            ->select([
                'inventory_product_cart.id',
                'inventory_product_cart.unique_id',
                'inventory_product_cart.customer_name',
                'inventory_product_cart.customer_phone',
                'inventory_product_cart.customer_email',
                'inventory_product_cart.product_id',
                'inventory_product_cart.branch_id',
                'inventory_product_cart.cms_admin_id',
                'inventory_product_cart.price',
                'inventory_product_cart.selling_price',
                'inventory_product_cart.buying_price',
                'inventory_product_cart.selected_variant',
                'inventory_product_cart.verified_by_fe',
                'inventory_product_cart.attributes',
                'inventory_product_cart.created_at',
                DB::raw('COALESCE(pm.name, "Unknown Product") as product_name'),
            ])
            ->orderByDesc('inventory_product_cart.id');

            if ($verifiedFilter !== 'all') {
                $query->where('inventory_product_cart.verified_by_fe', (int) ($verifiedFilter === '1' ? 1 : 0));
            }

        if ($effectiveBranch !== '' && strtolower($effectiveBranch) !== 'all') {
            $query->where('inventory_product_cart.branch_id', $effectiveBranch);
        }

        if ($effectiveCmsAdmin !== '') {
            $query->where('inventory_product_cart.cms_admin_id', $effectiveCmsAdmin);
        }

        if ($request->filled('product_id')) {
            $query->where('inventory_product_cart.product_id', (string) $request->query('product_id'));
        }

        if ($request->filled('search')) {
            $search = (string) $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('inventory_product_cart.product_id', 'LIKE', "%{$search}%")
                    ->orWhere('pm.name', 'LIKE', "%{$search}%")
                    ->orWhere('inventory_product_cart.customer_name', 'LIKE', "%{$search}%")
                    ->orWhere('inventory_product_cart.customer_phone', 'LIKE', "%{$search}%")
                    ->orWhere('inventory_product_cart.customer_email', 'LIKE', "%{$search}%")
                    ->orWhere('inventory_product_cart.unique_id', 'LIKE', "%{$search}%");
            });
        }

        $rows = $query->get()->map(fn ($row) => $this->mapInquiryRow($row))->values();

        return response()->json([
            'success' => true,
            'message' => 'Product inquiries fetched successfully',
            'data' => $rows,
            'meta' => [
                'total' => $rows->count(),
                'branch_id' => $effectiveBranch,
                'cms_admin_id' => $effectiveCmsAdmin,
                'verified_by_fe' => $verifiedFilter,
            ],
        ]);
    }

    private function normalizeVariantLabel(?string $label): string
    {
        $value = trim((string) $label);
        if ($value === '' || strtolower($value) === 'default') {
            return 'Default';
        }

        $parts = array_map('trim', explode('|', $value));
        sort($parts);
        return implode(' | ', $parts);
    }

    private function buildVariantLabelFromAttributes($attributes): ?string
    {
        if (!is_array($attributes) || empty($attributes)) return null;

        $pairs = [];
        foreach ($attributes as $k => $v) {
            if ($k === null || $k === '' || $v === null || $v === '') continue;
            $pairs[] = strtoupper(trim((string) $k)) . ': ' . trim((string) $v);
        }

        if (empty($pairs)) return null;
        sort($pairs);
        return implode(' | ', $pairs);
    }

    private function resolveVariantPricing(ProductMaster $product, ?string $selectedVariant): array
    {
        $items = PurchaseItem::query()
            ->where(function ($q) use ($product) {
                $q->where('product_master_id', (string) $product->id)
                  ->orWhere('product_master_id', (string) $product->unique_id);
            })
            ->orderByDesc('id')
            ->get();

        if ($items->isEmpty()) {
            return [
                'selling_price' => (float) ($product->selling_price ?? 0),
                'buying_price' => 0.0,
            ];
        }

        $match = null;
        if (!empty($selectedVariant)) {
            $normalizedTarget = $this->normalizeVariantLabel($selectedVariant);
            $match = $items->first(function (PurchaseItem $item) use ($normalizedTarget) {
                return $this->normalizeVariantLabel((string) $item->attribute_summary) === $normalizedTarget;
            });
        }

        $item = $match ?: $items->first();

        $sellingPrice = (float) ($item->selling_price ?? 0);
        if ($sellingPrice <= 0) {
            $sellingPrice = (float) ($product->selling_price ?? 0);
        }
        if ($sellingPrice <= 0) {
            $sellingPrice = (float) ($item->purchase_price ?? 0);
        }

        return [
            'selling_price' => $sellingPrice,
            'buying_price' => (float) ($item->purchase_price ?? 0),
        ];
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'required|string|max:15',
            'customer_email' => 'nullable|email|max:255',
            'product_id' => 'required|string',
            'branch_id' => 'nullable|string',
            'cms_admin_id' => 'nullable|string',
            'price' => 'nullable|numeric',
            'selling_price' => 'nullable|numeric',
            'buying_price' => 'nullable|numeric',
            'selected_variant' => 'nullable|string',
            'attributes' => 'nullable|array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $payload = $request->only([
                'customer_name',
                'customer_phone',
                'customer_email',
                'product_id',
                'branch_id',
                'cms_admin_id',
                'price',
                'selling_price',
                'buying_price',
                'selected_variant',
                'attributes',
            ]);

            $payload['verified_by_fe'] = 0;

            /** @var ProductMaster|null $product */
            $product = ProductMaster::query()->where('unique_id', (string) $payload['product_id'])->first();

            if ($product) {
                if (empty($payload['branch_id'])) {
                    $payload['branch_id'] = $product->branch ?: (string) ($product->branch_id ?? '');
                }

                if (empty($payload['cms_admin_id'])) {
                    $payload['cms_admin_id'] = (string) ($product->cms_admin_id ?? '0');
                }

                if (empty($payload['selected_variant'])) {
                    $payload['selected_variant'] = $this->buildVariantLabelFromAttributes($payload['attributes'] ?? null);
                }

                $pricing = $this->resolveVariantPricing($product, $payload['selected_variant'] ?? null);

                if (!isset($payload['selling_price']) || $payload['selling_price'] === null || $payload['selling_price'] === '') {
                    $payload['selling_price'] = $pricing['selling_price'];
                }

                if (!isset($payload['buying_price']) || $payload['buying_price'] === null || $payload['buying_price'] === '') {
                    $payload['buying_price'] = $pricing['buying_price'];
                }

                if (!isset($payload['price']) || $payload['price'] === null || $payload['price'] === '') {
                    $payload['price'] = $payload['selling_price'];
                }
            }

            $cart = InventoryProductCart::create($payload);

            return response()->json([
                'status' => 'success',
                'message' => 'Inquiry submitted successfully',
                'data' => $cart
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to submit inquiry',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
