<?php

namespace App\Http\Controllers\Api\hrms;

use App\Http\Controllers\Controller;
use App\Models\hrms\Designation;
use App\Models\Branch;
use Illuminate\Http\Request;
use Exception;

class DesignationController extends Controller
{
    private function getAdmin(Request $request)
    {
        return $request->user();
    }

    private function getAdminScopePayload($admin): array
    {
        $branchId = null;
        if ($admin instanceof \App\Models\User) {
            $branchId = $admin->branch ?? $admin->branch_id;
        } elseif ($admin instanceof \App\Models\hrms\Employee) {
            $branchId = $admin->branch_id;
        }

        // Fallback: If still null/empty, use the first available branch
        if (empty($branchId)) {
            $branchId = \App\Models\Branch::value('code');
        }

        // Use cms_admin mapping if provided in login data, else fallback to user_id
        $adminUserId = $admin->cms_admin ?? $admin->user_id ?? $admin->admin_user_id ?? $admin->id ?? null;

        return [
            'cms_admin_id' => $adminUserId,
            'branch_id' => $branchId,
        ];
    }

    public function index(Request $request)
    {
        try {
            $admin = $this->getAdmin($request);
            $perPage = min((int) $request->input('per_page', 25), 100);
            $search = $request->input('search');

            $query = Designation::query()->forAdmin($admin);

            if ($search) {
                $query->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
            }

            $query->orderByDesc('id');

            if ($request->boolean('all')) {
                return response()->json(['status' => 'success', 'data' => $query->get()], 200);
            }

            $paginated = $query->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'data'   => $paginated->items(),
                'meta'   => [
                    'current_page' => $paginated->currentPage(),
                    'last_page'    => $paginated->lastPage(),
                    'per_page'     => $paginated->perPage(),
                    'total'        => $paginated->total(),
                ],
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $admin = $this->getAdmin($request);
            $scope = $this->getAdminScopePayload($admin);
            
            // Priority: payload cms_admin > token user object cms_admin
            $cmsAdminId = $request->input('cms_admin') ?? $scope['cms_admin_id'];

            $name = trim((string) $request->input('name'));
            if ($name === '') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Designation name is required',
                ], 422);
            }

            $exists = Designation::query()
                ->forAdmin($admin)
                ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                ->exists();
            if ($exists) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Designation already exists',
                ], 422);
            }

            $designation = Designation::create([
                'name' => $name,
                'description' => $request->input('description'),
                'status' => $request->input('status', true),
                'cms_admin_id' => $cmsAdminId,
                'branch_id' => $request->input('branch_id') ?? $scope['branch_id'],
            ]);
            return response()->json([
                'status' => 'success',
                'message' => 'Designation created successfully',
                'data' => $designation,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function show(Request $request, $id)
    {
        try {
            $admin = $this->getAdmin($request);
            $designation = Designation::query()->forAdmin($admin)->findOrFail($id);
            return response()->json([
                'status' => 'success',
                'data' => $designation,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Designation not found',
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $admin = $this->getAdmin($request);
            $designation = Designation::query()->forAdmin($admin)->findOrFail($id);

            if ($request->filled('name')) {
                $name = trim((string) $request->input('name'));
                $exists = Designation::query()
                    ->forAdmin($admin)
                    ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                    ->where('id', '!=', $designation->id)
                    ->exists();
                if ($exists) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Designation already exists',
                    ], 422);
                }
            }

            $designation->update($request->only(['name', 'description', 'status']));
            return response()->json([
                'status' => 'success',
                'message' => 'Designation updated successfully',
                'data' => $designation,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Update failed',
            ], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $admin = $this->getAdmin($request);
            $designation = Designation::query()->forAdmin($admin)->findOrFail($id);
            $designation->delete();
            return response()->json([
                'status' => 'success',
                'message' => 'Designation deleted successfully',
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Deletion failed',
            ], 500);
        }
    }
}
