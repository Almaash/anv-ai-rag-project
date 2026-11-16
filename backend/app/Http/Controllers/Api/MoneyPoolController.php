<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MoneyPoolRequest;
use App\Models\MoneyPool;
use Illuminate\Http\Request;

class MoneyPoolController extends Controller
{
    public function index(Request $request)
    {
        $query = MoneyPool::query()->latest();

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        $perPage = (int) ($request->integer('per_page') ?: 10);
        $data = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $data->items(),
            'pagination' => [
                'current_page' => $data->currentPage(),
                'per_page'     => $data->perPage(),
                'total'        => $data->total(),
                'last_page'    => $data->lastPage(),
                'from'         => $data->firstItem(),
                'to'           => $data->lastItem(),
            ],
        ]);
    }

    public function show(string $id)
    {
        $pool = MoneyPool::where('id', $id)
            ->orWhere('unique_id', $id)
            ->first();

        if (! $pool) {
            return response()->json([
                'success' => false,
                'message' => 'Money pool not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $pool,
        ]);
    }

    public function store(MoneyPoolRequest $request)
    {
        try {
            $payload = $request->validated();

            // Generate Custom Unique ID: ANVPLYYMMDD001
            $datePrefix = 'ANVPL' . date('ymd');
            $lastRecord = MoneyPool::where('unique_id', 'like', $datePrefix . '%')
                ->orderBy('unique_id', 'desc')
                ->first();

            $nextNumber = 1;
            if ($lastRecord) {
                $lastId = $lastRecord->unique_id;
                // Extract the last 3 digits
                $lastSuffix = substr($lastId, -3);
                if (is_numeric($lastSuffix)) {
                    $nextNumber = (int)$lastSuffix + 1;
                }
            }
            $payload['unique_id'] = $datePrefix . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

            $pool = MoneyPool::create([
                'unique_id'  => $payload['unique_id'],
                'branch_id'  => $request->input('branch_id') ?? null,
                'cms_admin_id' => $request->input('cms_admin_id') ?? null,
                'name'       => $payload['name'],
                'limit_from' => $payload['limit_from'],
                'limit_to'   => $payload['limit_to'],
                'notes'      => $payload['notes'] ?? null,
                'status'     => $payload['status'] ?? 1,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Money pool created successfully',
                'data' => $pool,
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

    public function update(MoneyPoolRequest $request, string $id)
    {
        try {
            $pool = MoneyPool::where('id', $id)
                ->orWhere('unique_id', $id)
                ->first();

            if (! $pool) {
                return response()->json([
                    'success' => false,
                    'message' => 'Money pool not found',
                ], 404);
            }

            $pool->update(array_merge($request->validated(), [
                'branch_id' => $request->input('branch_id') ?? $pool->branch_id,
                'cms_admin_id' => $request->input('cms_admin_id') ?? $pool->cms_admin_id,
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Money pool updated successfully',
                'data' => $pool,
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
        $pool = MoneyPool::where('id', $id)
            ->orWhere('unique_id', $id)
            ->first();

        if (! $pool) {
            return response()->json([
                'success' => false,
                'message' => 'Money pool not found',
            ], 404);
        }

        $pool->delete();

        return response()->json([
            'success' => true,
            'message' => 'Money pool deleted successfully',
        ]);
    }
}
