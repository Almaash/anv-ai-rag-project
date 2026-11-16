<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory\Tax;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class TaxController extends Controller
{
    public function index()
    {
        $taxes = Tax::where('status', 'active')->latest()->get();
        return response()->json(['success' => true, 'data' => $taxes]);
    }

    public function store(Request $request)
    {
        if (Auth::check()) {
            $request->merge(['branch' => Auth::user()->branch]);
        }

        $validator = Validator::make($request->all(), [
            'name' => [
                'required',
                Rule::unique('inventory_taxes', 'name')->where(function ($query) use ($request) {
                    return $query->where('branch', $request->branch)
                        ->where('status', 'active');
                }),
            ],
            'rate' => 'required|numeric|min:0|max:100',
            'status' => 'required|in:active,inactive'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => $validator->errors()->first()], 422);
        }

        // Generate custom ID: INV-TAX-0001 (global across branches)
        $lastTax = Tax::withoutBranchScope()->orderBy('id', 'desc')->first();
        $nextNumber = $lastTax ? (int) str_replace('INV-TAX-', '', $lastTax->unique_id) + 1 : 1;
        $unique_id = 'INV-TAX-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

        $tax = Tax::create([
            'unique_id' => $unique_id,
            'name' => $request->name,
            'rate' => $request->rate,
            'status' => $request->status
        ]);

        return response()->json(['success' => true, 'message' => 'Tax added successfully', 'data' => $tax]);
    }

    public function update(Request $request, $id)
    {
        $tax = Tax::where('id', $id)->orWhere('unique_id', $id)->first();
        if (!$tax) return response()->json(['success' => false, 'message' => 'Tax not found'], 404);

        if (Auth::check()) {
            $request->merge(['branch' => Auth::user()->branch]);
        }

        $validator = Validator::make($request->all(), [
            'name' => [
                'required',
                Rule::unique('inventory_taxes', 'name')
                    ->ignore($tax->id)
                    ->where(function ($query) use ($request) {
                        return $query->where('branch', $request->branch)
                            ->where('status', 'active');
                    }),
            ],
            'rate' => 'required|numeric|min:0|max:100',
            'status' => 'required|in:active,inactive'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => $validator->errors()->first()], 422);
        }

        $tax->update($request->all());
        return response()->json(['success' => true, 'message' => 'Tax updated successfully', 'data' => $tax]);
    }

    public function destroy($id)
    {
        $tax = Tax::where('id', $id)->orWhere('unique_id', $id)->first();
        if (!$tax) return response()->json(['success' => false, 'message' => 'Tax not found'], 404);

        $tax->status = 'inactive';
        $tax->save();
        return response()->json(['success' => true, 'message' => 'Tax deleted successfully']);
    }
}
