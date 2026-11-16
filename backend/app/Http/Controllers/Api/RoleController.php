<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Role::with('branch');

            if ($request->has('branch_id')) {
                if ($request->filled('branch_id')) {
                    // If branch_id has a value, filter by that value
                    $query->where('branch_id', $request->branch_id);
                } else {
                    // If branch_id is empty/null, show only roles with null branch_id
                    $query->whereNull('branch_id');
                }
            }

            $roles = $query->get();
            return response()->json([
                'status' => 'success',
                'message' => 'Roles retrieved successfully',
                'data' => ['roles' => $roles]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

   public function store(Request $request)
{
    try {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'permission' => 'required|array',
            'branch_id' => 'nullable|string'
        ]);

        $validated['role_id'] = 'role_' . time() . rand(100, 999);
        $validated['permissions'] = $validated['permission'];
        unset($validated['permission']);

        $role = Role::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Role created successfully',
            'data' => ['role' => $role]
        ], 201);

    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
            'data' => null
        ], 500);
    }
}

    public function show($id)
    {
        try {
            $role = Role::with('branch')->where('role_id', $id)->first();

            if (!$role) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Role not found',
                    'data' => null
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Role retrieved successfully',
                'data' => ['role' => $role]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $role = Role::where('role_id', $id)->first();

            if (!$role) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Role not found',
                    'data' => null
                ], 404);
            }

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'description' => 'nullable|string',
                'permission' => 'sometimes|array',
                'branch_id' => 'sometimes|string'
            ]);

            if (isset($validated['permission'])) {
                $validated['permissions'] = $validated['permission'];
                unset($validated['permission']);
            }

            $role->update($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Role updated successfully',
                'data' => ['role' => $role]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $role = Role::where('role_id', $id)->first();

            if (!$role) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Role not found',
                    'data' => null
                ], 404);
            }

            $role->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Role deleted successfully',
                'data' => null
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }
}
