<?php

namespace App\Http\Controllers\Api\hrms;

use App\Http\Controllers\Controller;
use App\Models\hrms\Department;
use App\Models\Branch;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    private function getAdmin(Request $request)
    {
        return $request->user();
    }

    private function getAdminScopePayload($admin): array
    {
        $branchId = null;
        if ($admin instanceof \App\Models\User) {
            $branchId = $admin->branch ?? $admin->branch_id ?? null;
            // Fallback: If admin has no branch, use the first available branch
            if ($branchId === null || $branchId === '') {
                $role = strtolower((string) ($admin->role ?? ''));
                $adminRoles = ['super_admin', 'super admin', 'superadmin', 'cms_admin', 'cms admin', 'cmsadmin', 'admin'];
                if (in_array($role, $adminRoles)) {
                    $branchId = Branch::value('code');
                }
            }
        } elseif ($admin instanceof \App\Models\hrms\Employee) {
            $branchId = $admin->branch_id;
        }

        // Use cms_admin mapping if provided in login data (typically for HRMS/Field roles), else fallback to user_id
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

            $query = Department::query()->forAdmin($admin);

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
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
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
                    'message' => 'Department name is required'
                ], 422);
            }

            $exists = Department::query()
                ->forAdmin($admin)
                ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                ->exists();
            if ($exists) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Department already exists'
                ], 422);
            }

            // Ensure branch_id is not null
            if (empty($scope['branch_id'])) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Branch information is required. Please ensure your user account has a branch assigned.'
                ], 422);
            }

            $department = Department::create([
                'name' => $name,
                'description' => $request->input('description'),
                'status' => $request->input('status', true),
                'cms_admin_id' => $cmsAdminId,
                'branch_id' => $request->input('branch_id') ?? $scope['branch_id'],
            ]);
            return response()->json([
                'status' => 'success',
                'message' => 'Department created successfully',
                'data' => $department
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function show(Request $request, string $id)
    {
        try {
            $admin = $this->getAdmin($request);
            $department = Department::query()->forAdmin($admin)->findOrFail($id);
            return response()->json(['status' => 'success', 'data' => $department]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Department not found'], 404);
        }
    }

    public function update(Request $request, string $id)
    {
        try {
            $admin = $this->getAdmin($request);
            $department = Department::query()->forAdmin($admin)->findOrFail($id);

            if ($request->filled('name')) {
                $name = trim((string) $request->input('name'));
                $exists = Department::query()
                    ->forAdmin($admin)
                    ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                    ->where('id', '!=', $department->id)
                    ->exists();
                if ($exists) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Department already exists'
                    ], 422);
                }
            }

            $department->update($request->only(['name', 'description', 'status']));
            return response()->json([
                'status' => 'success',
                'message' => 'Department updated successfully',
                'data' => $department
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Request $request, string $id)
    {
        try {
            $admin = $this->getAdmin($request);
            $department = Department::query()->forAdmin($admin)->findOrFail($id);
            $department->delete();
            return response()->json(['status' => 'success', 'message' => 'Department deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Deletion failed'], 500);
        }
    }
}
