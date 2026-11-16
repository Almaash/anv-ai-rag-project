<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\Loan\InterestMaster;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class InterestMasterController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = InterestMaster::query();
            
            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }
            
            if ($request->has('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }
            
            if ($request->has('cms_admin_id')) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }
            
            $interests = $query->orderBy('created_at', 'desc')->get();
            return response()->json([
                'success' => true,
                'message' => 'Interest rates retrieved successfully',
                'data' => $interests
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve interest rates'
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'loan_type' => 'required|string|max:255',
                'interest_rate' => 'required|numeric|min:0.1|max:50',
                'user_id' => 'nullable|string',
                'branch_id' => 'nullable|string',
                'cms_admin_id' => 'nullable|string'
            ]);

            $interest = InterestMaster::create($validatedData);

            return response()->json([
                'success' => true,
                'message' => 'Interest rate created successfully',
                'data' => $interest
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create interest rate'
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $interest = InterestMaster::findOrFail($id);
            return response()->json([
                'success' => true,
                'message' => 'Interest rate retrieved successfully',
                'data' => $interest
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Interest rate not found'
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $validatedData = $request->validate([
                'loan_type' => 'required|string|max:255',
                'interest_rate' => 'required|numeric|min:0.1|max:50',
                'user_id' => 'nullable|string',
                'branch_id' => 'nullable|string',
                'cms_admin_id' => 'nullable|string'
            ]);

            $interest = InterestMaster::findOrFail($id);
            $interest->update($validatedData);

            return response()->json([
                'success' => true,
                'message' => 'Interest rate updated successfully',
                'data' => $interest
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Interest rate not found'
            ], 404);
        }
    }

    public function destroy($id)
    {
        try {
            $interest = InterestMaster::findOrFail($id);
            $interest->delete();

            return response()->json([
                'success' => true,
                'message' => 'Interest rate deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Interest rate not found'
            ], 404);
        }
    }
}
