<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Http\Helpers\AuthContext;
use Illuminate\Validation\Rule;

class UnitController extends Controller
{
    /**
     * Get All Units (only active)
     */
    public function index()
    {
        $units = Unit::withoutGlobalScopes()
            ->where('status', 'active')
            ->when(AuthContext::branchId(), fn($q, $b) => $q->where('branch', $b))
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Units retrieved successfully',
            'data' => $units
        ]);
    }

    /**
     * Create Unit
     */
    public function store(Request $request)
    {
        try {
            $branch   = AuthContext::branchId();
            $cmsAdmin = AuthContext::cmsAdminId();

            $validator = Validator::make($request->all(), [
                'unit_name' => [
                    'required',
                    'string',
                    Rule::unique('inventory_units', 'unit_name')->where(function ($query) use ($branch) {
                        return $query->where('branch', $branch)
                            ->where('status', 'active');
                    }),
                ],
                'short_name' => [
                    'required',
                    'string',
                    Rule::unique('inventory_units', 'short_name')->where(function ($query) use ($branch) {
                        return $query->where('branch', $branch)
                            ->where('status', 'active');
                    }),
                ],
                'description' => 'nullable|string',
                'status' => 'nullable|in:active,inactive',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if there's an inactive unit with the same name that we can reactivate
            $existingInactiveUnit = Unit::where('branch', $branch)
                ->where('unit_name', $request->unit_name)
                ->where('status', 'inactive')
                ->first();

            if ($existingInactiveUnit) {
                // Reactivate the existing unit instead of creating new one
                $existingInactiveUnit->update([
                    'short_name' => $request->short_name,
                    'description' => $request->description ?? $existingInactiveUnit->description,
                    'status' => 'active',
                    'admin_user_id' => $cmsAdmin,
                    'cms_admin_id' => $cmsAdmin,
                    'cms_admin' => $cmsAdmin,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Unit reactivated successfully',
                    'data' => $existingInactiveUnit->fresh()
                ]);
            }

            // --- Unique ID Generation logic (ignore branch scope so ID is global) ---
            $lastRecord = Unit::withoutBranchScope()->orderBy('id', 'desc')->first();
            if (!$lastRecord) {
                $unique_id = 'INV-UNIT-0001';
            } else {
                // Suppose last unique_id is INV-UNIT-0005
                // Extract numeric part
                $numericPart = (int) str_replace('INV-UNIT-', '', $lastRecord->unique_id);
                $newNumericPart = $numericPart + 1;
                // Pad with leading zeros (e.g., 6 => 0006)
                $unique_id = 'INV-UNIT-' . str_pad($newNumericPart, 4, '0', STR_PAD_LEFT);
            }
            // ---------------------------------
            
            $unitData = $request->only(['unit_name', 'short_name', 'description', 'status']);
            $unitData['unique_id']    = $unique_id;
            $unitData['admin_user_id'] = $cmsAdmin;
            $unitData['branch']       = $branch;
            $unitData['branch_id']    = $branch;
            $unitData['cms_admin_id'] = $cmsAdmin;
            $unitData['cms_admin']    = $cmsAdmin;
            $unitData['status']       = $unitData['status'] ?? 'active';

            $unit = Unit::create($unitData);

            return response()->json([
                'success' => true,
                'message' => 'Unit created successfully',
                'data' => $unit
            ]);
        } catch (\Exception $e) {
            // Check for duplicate entry error
            if (str_contains($e->getMessage(), 'Duplicate entry') && str_contains($e->getMessage(), 'unit_name_unique')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => [
                        'unit_name' => ['A unit with this name already exists in your branch.']
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
     * Get Single Unit
     */
    public function show($id)
    {
        $unit = Unit::where('id', $id)->orWhere('unique_id', $id)->first();

        if (!$unit) {
            return response()->json([
                'success' => false,
                'message' => 'Unit not found',
                'data' => null
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Unit retrieved successfully',
            'data' => $unit
        ]);
    }

    /**
     * Update Unit
     */
    public function update(Request $request, $id)
    {
        $unit = Unit::where('id', $id)->orWhere('unique_id', $id)->first();

        if (!$unit) {
            return response()->json([
                'success' => false,
                'message' => 'Unit not found',
                'data' => null
            ], 404);
        }

        $branch   = AuthContext::branchId();
        $cmsAdmin = AuthContext::cmsAdminId();

        $validator = Validator::make($request->all(), [
            'unit_name' => [
                'required',
                'string',
                Rule::unique('inventory_units', 'unit_name')
                    ->ignore($unit->id)
                    ->where(function ($query) use ($branch) {
                        return $query->where('branch', $branch)
                            ->where('status', 'active');
                    }),
            ],
            'short_name' => [
                'required',
                'string',
                Rule::unique('inventory_units', 'short_name')
                    ->ignore($unit->id)
                    ->where(function ($query) use ($branch) {
                        return $query->where('branch', $branch)
                            ->where('status', 'active');
                    }),
            ],
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $unit->update(array_merge(
            $request->only(['unit_name', 'short_name', 'description', 'status']),
            ['admin_user_id' => $cmsAdmin]
        ));

        return response()->json([
            'success' => true,
            'message' => 'Unit updated successfully',
            'data' => $unit
        ]);
    }

    /**
     * Delete Unit
     */
    public function destroy($id)
    {
        $unit = Unit::where('id', $id)->orWhere('unique_id', $id)->first();

        if (!$unit) {
            return response()->json([
                'success' => false,
                'message' => 'Unit not found'
            ], 404);
        }

        $unit->status = 'inactive';
        $unit->save();

        return response()->json([
            'success' => true,
            'message' => 'Unit deleted successfully'
        ]);
    }
}
