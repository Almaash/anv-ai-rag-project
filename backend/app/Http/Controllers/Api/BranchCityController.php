<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BranchCity;
use Illuminate\Http\Request;

class BranchCityController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = BranchCity::query();

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(function ($q) use ($s) {
                    $q->where('city_name',   'like', "%{$s}%")
                      ->orWhere('city_code',   'like', "%{$s}%")
                      ->orWhere('city_number', 'like', "%{$s}%")
                      ->orWhere('branch_code', 'like', "%{$s}%")
                      ->orWhere('state',       'like', "%{$s}%");
                });
            }

            if ($request->filled('is_active')) {
                $query->where('is_active', $request->boolean('is_active'));
            }

            if ($request->boolean('all')) {
                return response()->json([
                    'success' => true,
                    'data'    => $query->orderBy('city_name')->get(),
                ]);
            }

            $perPage = min((int) $request->get('per_page', 15), 100);
            $cities  = $query->orderBy('city_name')->paginate($perPage);

            return response()->json([
                'success' => true,
                'data'    => $cities->items(),
                'meta'    => [
                    'current_page' => $cities->currentPage(),
                    'last_page'    => $cities->lastPage(),
                    'per_page'     => $cities->perPage(),
                    'total'        => $cities->total(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'city_name'   => 'required|string|max:100',
                'city_code'   => 'required|string|size:3|unique:branch_cities,city_code|regex:/^[A-Z]{3}$/',
                'city_number' => 'required|string|size:2|regex:/^[0-9]{2}$/',
                'state'       => 'nullable|string|max:100',
                'is_active'   => 'nullable|boolean',
            ], [
                'city_code.regex' => 'City code must be exactly 3 uppercase letters.',
                'city_number.regex' => 'City number must be exactly 2 digits.',
                'city_code.size' => 'City code must be 3 characters.',
                'city_number.size' => 'City number must be 2 digits.'
            ]);

            $city = BranchCity::create($request->only([
                'city_name', 'city_code', 'city_number', 'state', 'is_active',
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Branch city created successfully',
                'data'    => $city,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        try {
            $city = BranchCity::findOrFail($id);
            return response()->json(['success' => true, 'data' => $city]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Branch city not found'], 404);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $city = BranchCity::findOrFail($id);

            $request->validate([
                'city_name'   => 'sometimes|required|string|max:100',
                'city_code'   => 'sometimes|required|string|size:3|unique:branch_cities,city_code,' . $id . '|regex:/^[A-Z]{3}$/',
                'city_number' => 'sometimes|required|string|size:2|regex:/^[0-9]{2}$/',
                'state'       => 'nullable|string|max:100',
                'is_active'   => 'nullable|boolean',
            ], [
                'city_code.regex' => 'City code must be exactly 3 uppercase letters.',
                'city_number.regex' => 'City number must be exactly 2 digits.',
            ]);

            $city->update($request->only([
                'city_name', 'city_code', 'city_number', 'state', 'is_active',
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Branch city updated successfully',
                'data'    => $city->fresh(),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $city = BranchCity::findOrFail($id);
            $city->delete();
            return response()->json(['success' => true, 'message' => 'Branch city deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Branch city not found'], 404);
        }
    }
}
