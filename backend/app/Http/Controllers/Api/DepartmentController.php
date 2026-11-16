<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index()
    {
        try {
            $departments = Department::all();
            return response()->json([
                'status' => 'success',
                'message' => 'Departments retrieved successfully',
                'data' => ['departments' => $departments]
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
                'description' => 'nullable|string'
            ]);

            $lastDept = Department::orderBy('id', 'desc')->first();
            $nextNumber = $lastDept ? ((int) substr($lastDept->dept_id, 9)) + 1 : 1;

            $validated['dept_id'] = 'anv_dept_' . $nextNumber;

            $department = Department::create($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Department created successfully',
                'data' => ['department' => $department]
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
            $department = Department::find($id);

            if (!$department) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Department not found',
                    'data' => null
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Department retrieved successfully',
                'data' => ['department' => $department]
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
            $department = Department::find($id);

            if (!$department) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Department not found',
                    'data' => null
                ], 404);
            }

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'description' => 'nullable|string'
            ]);

            $department->update($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Department updated successfully',
                'data' => ['department' => $department]
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
            $department = Department::find($id);

            if (!$department) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Department not found',
                    'data' => null
                ], 404);
            }

            $department->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Department deleted successfully',
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
