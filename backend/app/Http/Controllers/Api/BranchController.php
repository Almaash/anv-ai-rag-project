<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BranchController extends Controller
{
    // ✅ Get All Branches (Paginated)
    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 10);

        $branches = Branch::with('city')->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'status' => true,
            'message' => 'Branches fetched successfully',
            'data' => $branches
        ], 200);
    }

    // ✅ Create Branch
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'branch_city_id' => 'required|exists:branch_cities,id',
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'message' => 'Validation error',
                'data' => $validator->errors()
            ], 422);
        }

        $branch = Branch::create($request->all());

        return response()->json([
            'status' => true,
            'message' => 'Branch created successfully',
            'data' => $branch
        ], 201);
    }

    // ✅ Show Single Branch
    public function show($id)
    {
        $branch = Branch::find($id);

        if (!$branch) {
            return response()->json([
                'status' => false,
                'message' => 'Branch not found',
                'data' => null
            ], 404);
        }

        return response()->json([
            'status' => true,
            'message' => 'Branch fetched successfully',
            'data' => $branch
        ], 200);
    }

    // ✅ Update Branch
    public function update(Request $request, $id)
    {
        $branch = Branch::find($id);

        if (!$branch) {
            return response()->json([
                'status' => false,
                'message' => 'Branch not found',
                'data' => null
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'message' => 'Validation error',
                'data' => $validator->errors()
            ], 422);
        }

        $branch->update($request->all());

        return response()->json([
            'status' => true,
            'message' => 'Branch updated successfully',
            'data' => $branch
        ], 200);
    }

    // ✅ Delete Branch
    public function destroy($id)
    {
        $branch = Branch::find($id);

        if (!$branch) {
            return response()->json([
                'status' => false,
                'message' => 'Branch not found',
                'data' => null
            ], 404);
        }

        $branch->delete();

        return response()->json([
            'status' => true,
            'message' => 'Branch deleted successfully',
            'data' => null
        ], 200);
    }
}