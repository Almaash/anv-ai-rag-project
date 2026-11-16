<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\Loan\InvestorType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class InvestorTypeController extends Controller
{
    public function index(Request $request)
    {
        $query = InvestorType::orderBy('created_at', 'desc');

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('cms_admin_id')) {
            $query->where('cms_admin_id', $request->cms_admin_id);
        }

        $types = $query->get();

        return response()->json([
            'success' => true,
            'message' => 'Investor types retrieved successfully',
            'data' => $types,
        ]);
    }

    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => [
                    'required', 'string',
                    \Illuminate\Validation\Rule::unique('loan_investor_types')
                        ->where('branch_id', $request->input('branch_id'))
                ],
                'description' => 'nullable|string',
                'status' => 'nullable|in:active,inactive',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $uniqueId = $this->generateUniqueId();
            $payload = $request->only(['name', 'description', 'status']);
            $payload['unique_id'] = $uniqueId;
            $payload['status'] = $payload['status'] ?? 'active';
            $payload['branch_id'] = $request->input('branch_id') ?? null;
            $payload['cms_admin_id'] = $request->input('cms_admin_id') ?? null;

            $type = InvestorType::create($payload);

            return response()->json([
                'success' => true,
                'message' => 'Investor type created successfully',
                'data' => $type,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Database error',
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ], 500);
        }
    }

    public function show(string $id)
    {
        $type = InvestorType::where('id', $id)->orWhere('unique_id', $id)->first();

        if (! $type) {
            return response()->json([
                'success' => false,
                'message' => 'Investor type not found',
                'data' => null,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Investor type retrieved successfully',
            'data' => $type,
        ]);
    }

    public function update(Request $request, string $id)
    {
        try {
            $type = InvestorType::where('id', $id)->orWhere('unique_id', $id)->first();

            if (! $type) {
                return response()->json([
                    'success' => false,
                    'message' => 'Investor type not found',
                    'data' => null,
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'name' => [
                    'required', 'string',
                    \Illuminate\Validation\Rule::unique('loan_investor_types')
                        ->where('branch_id', $request->input('branch_id'))
                        ->ignore($type->id)
                ],
                'description' => 'nullable|string',
                'status' => 'nullable|in:active,inactive',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $type->update(array_merge(
                $request->only(['name', 'description', 'status']),
                [
                    'branch_id' => $request->input('branch_id') ?? $type->branch_id,
                    'cms_admin_id' => $request->input('cms_admin_id') ?? $type->cms_admin_id,
                ]
            ));

            return response()->json([
                'success' => true,
                'message' => 'Investor type updated successfully',
                'data' => $type,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Database error',
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $type = InvestorType::where('id', $id)->orWhere('unique_id', $id)->first();

        if (! $type) {
            return response()->json([
                'success' => false,
                'message' => 'Investor type not found',
            ], 404);
        }

        $type->update(['status' => 'inactive']);

        return response()->json([
            'success' => true,
            'message' => 'Investor type deleted successfully',
        ]);
    }

    private function generateUniqueId(): string
    {
        $last = InvestorType::orderBy('id', 'desc')->first();
        if (! $last) {
            return 'INV-TYPE-0001';
        }

        $number = (int) str_replace('INV-TYPE-', '', $last->unique_id);
        $next = $number + 1;

        return 'INV-TYPE-' . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
