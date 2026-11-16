<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\Loan\FeeMaster;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class FeeMasterController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = FeeMaster::query();
            
            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }
            
            if ($request->has('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }
            
            if ($request->has('cms_admin_id')) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }
            
            $feeMasters = $query->orderBy('created_at', 'desc')->get();
            return response()->json([
                'success' => true,
                'message' => 'Fee masters retrieved successfully',
                'data' => $feeMasters
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve fee masters'
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'processing_fee' => 'required|numeric|min:0',
                'gst_percentage' => 'required|numeric|min:0|max:100',
                'user_id' => 'nullable|string',
                'branch_id' => 'nullable|string',
                'cms_admin_id' => 'nullable|string',
            ]);

            $feeMaster = FeeMaster::create($validatedData);

            return response()->json([
                'success' => true,
                'message' => 'Fee master created successfully',
                'data' => $feeMaster
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
                'message' => 'Failed to create fee master'
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $feeMaster = FeeMaster::findOrFail($id);
            return response()->json([
                'success' => true,
                'message' => 'Fee master retrieved successfully',
                'data' => $feeMaster
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fee master not found'
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $validatedData = $request->validate([
                'processing_fee' => 'required|numeric|min:0',
                'gst_percentage' => 'required|numeric|min:0|max:100',
                'user_id' => 'nullable|string',
                'branch_id' => 'nullable|string',
                'cms_admin_id' => 'nullable|string',
            ]);

            $feeMaster = FeeMaster::findOrFail($id);
            $feeMaster->update($validatedData);

            return response()->json([
                'success' => true,
                'message' => 'Fee master updated successfully',
                'data' => $feeMaster
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
                'message' => 'Fee master not found'
            ], 404);
        }
    }

    public function destroy($id)
    {
        try {
            $feeMaster = FeeMaster::findOrFail($id);
            $feeMaster->delete();

            return response()->json([
                'success' => true,
                'message' => 'Fee master deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fee master not found'
            ], 404);
        }
    }
}
