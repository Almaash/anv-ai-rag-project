<?php

namespace App\Http\Controllers\Api\hrms;

use App\Http\Controllers\Controller;
use App\Models\hrms\Holiday;
use App\Models\Branch;
use Illuminate\Http\Request;
use Exception;

class HolidayController extends Controller
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
            $holidays = Holiday::query()->forAdmin($admin)->get();
            return response()->json([
                'status' => 'success',
                'data' => $holidays,
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
            $date = $request->input('date');
            if ($name === '' || empty($date)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Holiday name and date are required',
                ], 422);
            }

            $exists = Holiday::query()
                ->forAdmin($admin)
                ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                ->whereDate('date', $date)
                ->exists();
            if ($exists) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Holiday already exists for this date',
                ], 422);
            }

            $holiday = Holiday::create([
                'name' => $name,
                'date' => $date,
                'description' => $request->input('description'),
                'recurring' => (bool) $request->input('recurring', false),
                'cms_admin_id' => $cmsAdminId,
                'branch_id' => $request->input('branch_id') ?? $scope['branch_id'],
            ]);
            return response()->json([
                'status' => 'success',
                'message' => 'Holiday created successfully',
                'data' => $holiday,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $admin = $this->getAdmin($request);
            $holiday = Holiday::query()->forAdmin($admin)
                ->where(function($q) use ($id) {
                    $q->where('id', $id)->orWhere('holiday_id', $id);
                })
                ->firstOrFail();

            $name = trim((string) $request->input('name', $holiday->name));
            $date = $request->input('date', $holiday->date);
            $exists = Holiday::query()
                ->forAdmin($admin)
                ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                ->whereDate('date', $date)
                ->where('id', '!=', $holiday->id)
                ->exists();
            if ($exists) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Holiday already exists for this date',
                ], 422);
            }

            $holiday->update($request->only(['name', 'date', 'description', 'recurring']));
            return response()->json([
                'status' => 'success',
                'message' => 'Holiday updated successfully',
                'data' => $holiday,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Update failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $admin = $this->getAdmin($request);
            $holiday = Holiday::query()->forAdmin($admin)
                ->where(function($q) use ($id) {
                    $q->where('id', $id)->orWhere('holiday_id', $id);
                })
                ->firstOrFail();
            $holiday->delete();
            return response()->json([
                'status' => 'success',
                'message' => 'Holiday deleted successfully',
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Deletion failed: ' . $e->getMessage(),
            ], 500);
        }
    }
}
