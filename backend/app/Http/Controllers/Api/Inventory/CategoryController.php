<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Http\Helpers\AuthContext;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    /**
     * Get All Categories
     */
    public function index()
    {
        $categories = Category::withoutGlobalScopes()
            ->where('status', 'active')
            ->when(AuthContext::branchId(), fn($q, $b) => $q->where('branch', $b))
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Categories retrieved successfully',
            'data' => $categories
        ]);
    }

    /**
     * Store Category
     */
    public function store(Request $request)
    {
        try {
            $branch   = AuthContext::branchId() ?? 'default';
            $cmsAdmin = AuthContext::cmsAdminId();

            $validator = Validator::make($request->all(), [
                'name' => [
                    'required',
                    'string',
                    'max:255',
                    Rule::unique('inventory_categories')->where(function ($query) use ($branch) {
                        return $query->where('branch', $branch)
                            ->where('status', 'active');
                    }),
                ],
                'description' => 'nullable|string',
                'status' => 'nullable|in:active,inactive'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if there's an inactive category with the same name that we can reactivate
            $existingInactiveCategory = Category::where('branch', $branch)
                ->where('name', $request->name)
                ->where('status', 'inactive')
                ->first();

            if ($existingInactiveCategory) {
                // Reactivate the existing category instead of creating new one
                $existingInactiveCategory->update([
                    'description' => $request->description ?? $existingInactiveCategory->description,
                    'status' => 'active',
                    'cms_admin_id' => $cmsAdmin,
                    'cms_admin' => $cmsAdmin,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Category reactivated successfully',
                    'data' => $existingInactiveCategory->fresh()
                ]);
            }

            // --- Unique ID Generation logic (global across branches) ---
            $lastRecord = Category::withoutBranchScope()->orderBy('id', 'desc')->first();
            if (!$lastRecord) {
                $unique_id = 'INV-CAT-0001';
            } else {
                $numericPart = (int) str_replace('INV-CAT-', '', $lastRecord->unique_id);
                $newNumericPart = $numericPart + 1;
                $unique_id = 'INV-CAT-' . str_pad($newNumericPart, 4, '0', STR_PAD_LEFT);
            }
            
            $categoryData = $request->only(['name', 'description', 'status']);
            $categoryData['unique_id']    = $unique_id;
            $categoryData['branch']       = $branch;
            $categoryData['branch_id']    = $branch;
            $categoryData['cms_admin_id'] = $cmsAdmin;
            $categoryData['cms_admin']    = $cmsAdmin;
            $categoryData['status']       = $categoryData['status'] ?? 'active';

            $category = Category::create($categoryData);

            return response()->json([
                'success' => true,
                'message' => 'Category created successfully',
                'data' => $category
            ]);
        } catch (\Exception $e) {
            // Check for duplicate entry error
            if (str_contains($e->getMessage(), 'Duplicate entry') && str_contains($e->getMessage(), 'name_unique')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => [
                        'name' => ['A category with this name already exists in your branch.']
                    ]
                ], 422);
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Database error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Single Category
     */
    public function show($id)
    {
        $category = Category::where('id', $id)->orWhere('unique_id', $id)->first();

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
                'data' => null
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Category retrieved successfully',
            'data' => $category
        ]);
    }

    /**
     * Update Category
     */
    public function update(Request $request, $id)
    {
        $category = Category::where('id', $id)->orWhere('unique_id', $id)->first();

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
                'data' => null
            ], 404);
        }

        $branch   = AuthContext::branchId();
        $cmsAdmin = AuthContext::cmsAdminId();

        $validator = Validator::make($request->all(), [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('inventory_categories')
                    ->ignore($category->id)
                    ->where(function ($query) use ($branch) {
                        return $query->where('branch', $branch)
                            ->where('status', 'active');
                    }),
            ],
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,inactive'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $category->update(array_merge(
            $request->only(['name', 'description', 'status']),
            ['branch' => $branch, 'branch_id' => $branch]
        ));

        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully',
            'data' => $category
        ]);
    }

    /**
     * Delete Category
     */
    public function destroy($id)
    {
        $category = Category::where('id', $id)->orWhere('unique_id', $id)->first();

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found'
            ], 404);
        }

        $category->status = 'inactive';
        $category->save();

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully'
        ]);
    }
}
