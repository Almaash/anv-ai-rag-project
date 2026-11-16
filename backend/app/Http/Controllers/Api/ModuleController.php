<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Module;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ModuleController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Module::with('branch');

            if ($request->filled('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }

            if ($request->filled('is_active')) {
                $query->where('is_active', $request->boolean('is_active'));
            }

            $modules = $query->paginate($request->get('per_page', 10));

            return response()->json([
                'status' => 'success',
                'message' => 'Modules retrieved successfully',
                'data' => ['modules' => $modules]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function all(Request $request)
    {
        try {
            $query = Module::with('branch');

            if ($request->filled('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }

            if ($request->filled('is_active')) {
                $query->where('is_active', $request->boolean('is_active'));
            }

            $modules = $query->get();

            return response()->json([
                'status' => 'success',
                'message' => 'Modules retrieved successfully',
                'data' => ['modules' => $modules]
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
            $data = $request->all();
            
            // Convert is_active string to boolean before validation
            if (isset($data['is_active']) && is_string($data['is_active'])) {
                $data['is_active'] = filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN);
            }

            $validated = Validator::make($data, [
                'module_name' => 'required|string|max:255',
                'key' => 'required|string|max:50',
                'branch_id' => 'nullable|exists:branches,code',
                'is_active' => 'nullable|boolean'
            ])->validate();

            $validated['module_id'] = 'MOD' . date('Y') . str_pad((Module::max('id') ?? 0) + 1, 6, '0', STR_PAD_LEFT);

            // Convert empty string branch_id to null
            if (isset($validated['branch_id']) && $validated['branch_id'] === '') {
                $validated['branch_id'] = null;
            }

            $module = Module::create($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Module created successfully',
                'data' => ['module' => $module->load('branch')]
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
            $module = Module::with('branch')->where('module_id', $id)->first();

            if (!$module) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Module not found',
                    'data' => null
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Module retrieved successfully',
                'data' => ['module' => $module]
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
            $module = Module::where('module_id', $id)->first();

            if (!$module) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Module not found',
                    'data' => null
                ], 404);
            }

            $data = $request->all();
            
            // Convert is_active string to boolean before validation
            if (isset($data['is_active']) && is_string($data['is_active'])) {
                $data['is_active'] = filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN);
            }

            $validated = Validator::make($data, [
                'module_name' => 'sometimes|string|max:255',
                'key' => 'sometimes|string|max:50',
                'branch_id' => 'nullable|exists:branches,code',
                'is_active' => 'nullable|boolean'
            ])->validate();

            // Convert empty string branch_id to null
            if (isset($validated['branch_id']) && $validated['branch_id'] === '') {
                $validated['branch_id'] = null;
            }

            $module->update($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Module updated successfully',
                'data' => ['module' => $module->load('branch')]
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
            $module = Module::where('module_id', $id)->first();

            if (!$module) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Module not found',
                    'data' => null
                ], 404);
            }

            $module->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Module deleted successfully'
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

