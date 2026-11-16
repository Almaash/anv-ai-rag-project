<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory\Category;
use App\Models\Inventory\Attribute;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use App\Http\Helpers\AuthContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AttributeController extends Controller
{
    public function index()
    {
        $attributes = Attribute::withoutGlobalScopes()
            ->with('category')
            ->whereNotNull('category_id')
            ->when(AuthContext::branchId(), fn($q, $b) => $q->where('branch', $b))
            ->latest()
            ->get();
        return response()->json(['success' => true, 'data' => $attributes]);
    }

    public function store(Request $request)
    {
        try {
            $branch   = AuthContext::branchId() ?? 'default';
            $cmsAdmin = AuthContext::cmsAdminId();

            $validator = Validator::make($request->all(), [
                'attributes' => 'required|array|min:1',
                'attributes.*.name' => 'required|string|max:255',
                'attributes.*.category_id' => 'required|string|exists:inventory_categories,unique_id',
                'attributes.*.values' => 'nullable',
                'attributes.*.status' => 'required|in:active,inactive',
                'cms_admin' => 'nullable|string|max:255',
                'branch' => 'nullable|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json(['success' => false, 'message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
            }

            $createdAttributes = [];
            $errors = [];
            $attributesToProcess = $request->input('attributes', []);

            if (!is_array($attributesToProcess) || empty($attributesToProcess)) {
                return response()->json(['success' => false, 'message' => 'No attributes were provided in the request payload.'], 400);
            }

            foreach ($attributesToProcess as $index => $attrData) {
                $attrName = trim($attrData['name'] ?? '');
                $catId = trim((string) ($attrData['category_id'] ?? ''));
                $normalizedValues = $this->normalizeValuesString($attrData['values'] ?? null);

                if (empty($attrName)) {
                    $errors["attributes.$index.name"] = ["The attribute name is required."];
                    continue;
                }

                if ($catId === '') {
                    $errors["attributes.$index.category_id"] = ["The category field is required."];
                    continue;
                }

                // Check uniqueness for each attribute in the array based on name AND category
                $exists = Attribute::withoutGlobalScope(\App\Scopes\BranchScope::class)
                    ->where('branch', $branch)
                    ->where('name', $attrName)
                    ->where('category_id', $catId)
                    ->where('status', 'active')
                    ->exists();

                if ($exists) {
                    $categoryName = Category::where('unique_id', $catId)->value('name') ?? 'this category';
                    $errors["attributes.$index.name"] = ["The attribute name '{$attrName}' has already been taken for {$categoryName}."];
                    continue;
                }

                try {
                    $attribute = $this->createAttributeWithGeneratedId([
                        'name'         => $attrName,
                        'values'       => $normalizedValues,
                        'status'       => $attrData['status'] ?? 'active',
                        'category_id'  => $catId,
                        'branch'       => $branch,
                        'branch_id'    => $branch,
                        'cms_admin'    => $cmsAdmin,
                        'cms_admin_id' => $cmsAdmin,
                    ]);

                    if ($attribute) {
                        $createdAttributes[] = $attribute;
                    }
                } catch (\Throwable $th) {
                    $errors["attributes.$index.name"] = ["Failed to create attribute '{$attrName}'. Please retry."];
                }
            }

            if (empty($createdAttributes) && !empty($errors)) {
                return response()->json(['success' => false, 'message' => reset($errors)[0], 'errors' => $errors], 422);
            }

            if (empty($createdAttributes)) {
                return response()->json(['success' => false, 'message' => 'Failed to create any attributes. Check if they already exist.'], 400);
            }

            return response()->json([
                'success' => true, 
                'message' => count($createdAttributes) . ' attribute(s) processed successfully', 
                'data' => $createdAttributes,
                'errors' => $errors
            ]);
        } catch (\Exception $e) {
             \Log::error('Attribute Creation Error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            return response()->json(['success' => false, 'message' => 'Internal server error', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $attribute = Attribute::where('id', $id)->orWhere('unique_id', $id)->first();
        if (!$attribute) return response()->json(['success' => false, 'message' => 'Attribute not found'], 404);

        $branch   = AuthContext::branchId();
        $cmsAdmin = AuthContext::cmsAdminId();

        $validator = Validator::make($request->all(), [
            'name' => [
                'required',
                'string',
                Rule::unique('inventory_attributes', 'name')
                    ->ignore($attribute->id)
                    ->where(function ($query) use ($request) {
                        return $query
                            ->where('branch', $request->branch)
                            ->where('category_id', $request->category_id)
                            ->where('status', 'active');
                    }),
            ],
            'category_id' => 'required|exists:inventory_categories,unique_id',
            'values' => 'nullable|string',
            'status' => 'required|in:active,inactive'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => $validator->errors()->first()], 422);
        }

        $attribute->update(array_merge(
            $request->only(['name', 'status', 'category_id']),
            [
                'values'       => $this->normalizeValuesString($request->input('values')),
                'cms_admin'    => $cmsAdmin,
                'cms_admin_id' => $cmsAdmin,
            ]
        ));

        return response()->json(['success' => true, 'message' => 'Attribute updated successfully', 'data' => $attribute]);
    }

    public function destroy($id)
    {
        $attribute = Attribute::where('id', $id)->orWhere('unique_id', $id)->first();
        if (!$attribute) return response()->json(['success' => false, 'message' => 'Attribute not found'], 404);

        $attribute->delete();
        return response()->json(['success' => true, 'message' => 'Attribute deleted successfully']);
    }

    public function show($id)
    {
        $attribute = Attribute::where('id', $id)->orWhere('unique_id', $id)->first();
        if (!$attribute) return response()->json(['success' => false, 'message' => 'Attribute not found'], 404);
        return response()->json(['success' => true, 'data' => $attribute]);
    }

    private function createAttributeWithGeneratedId(array $attributeData): Attribute
    {
        $attempts = 5;

        for ($i = 0; $i < $attempts; $i++) {
            try {
                return DB::transaction(function () use ($attributeData) {
                    $attributeData['unique_id'] = $this->generateUniqueId('INV-ATTR-', 'inventory_attributes', 'unique_id');
                    return Attribute::create($attributeData);
                }, 3);
            } catch (QueryException $e) {
                if ($this->isDuplicateUniqueIdException($e) && $i < ($attempts - 1)) {
                    continue;
                }

                throw $e;
            }
        }

        throw new \RuntimeException('Failed to generate a unique attribute id after retries.');
    }

    private function generateUniqueId(string $prefix, string $tableName, string $columnName): string
    {
        $lastUniqueId = DB::table($tableName)
            ->select($columnName)
            ->whereNotNull($columnName)
            ->orderBy('id', 'desc')
            ->lockForUpdate()
            ->value($columnName);

        $nextNumber = 1;
        $pattern = '/^' . preg_quote($prefix, '/') . '(\\d+)$/';

        if (!empty($lastUniqueId) && preg_match($pattern, (string) $lastUniqueId, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return $prefix . str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
    }

    private function isDuplicateUniqueIdException(QueryException $e): bool
    {
        $driverCode = (int) ($e->errorInfo[1] ?? 0);
        $message = strtolower($e->getMessage());

        return $driverCode === 1062 && str_contains($message, 'unique_id');
    }

    private function normalizeValuesString($rawValues): ?string
    {
        if (is_null($rawValues) || $rawValues === '') {
            return null;
        }

        $parts = is_array($rawValues) ? $rawValues : explode(',', (string) $rawValues);
        $normalized = [];
        $seen = [];

        foreach ($parts as $part) {
            $value = trim((string) $part);
            if ($value === '') {
                continue;
            }

            $key = mb_strtolower($value);
            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $normalized[] = $value;
        }

        return empty($normalized) ? null : implode(',', $normalized);
    }
}
