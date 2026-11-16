<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function byBranch(Request $request, $branch)
    {
        try {
            $query = User::with('branchDetails:code,name')
                ->where('branch', $branch)
                ->where('is_deleted', 0);

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name',  'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%")
                      ->orWhere('role',  'like', "%{$search}%");
                });
            }

            if ($request->filled('role')) {
                $query->where('role', $request->role);
            }

            if ($request->filled('department')) {
                $query->where('department', $request->department);
            }

            $perPage = min((int) $request->get('per_page', 15), 100);

            if ($request->boolean('all')) {
                $users = $query->orderByDesc('id')->get();
                return response()->json([
                    'status'  => 'success',
                    'message' => 'Users retrieved successfully',
                    'branch'  => $branch,
                    'total'   => $users->count(),
                    'data'    => $users,
                ]);
            }

            $paginated = $query->orderByDesc('id')->paginate($perPage);

            return response()->json([
                'status'  => 'success',
                'message' => 'Users retrieved successfully',
                'branch'  => $branch,
                'data'    => $paginated->items(),
                'meta'    => [
                    'current_page' => $paginated->currentPage(),
                    'last_page'    => $paginated->lastPage(),
                    'per_page'     => $paginated->perPage(),
                    'total'        => $paginated->total(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function index(Request $request)
    {
        try {
            $query = User::with('branchDetails:code,name')->where('is_deleted', 0);

            // Search
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%");
                });
            }

            // Filters
            if ($request->has('role')) {
                $query->where('role', $request->role);
            }
            if ($request->has('department')) {
                $query->where('department', $request->department);
            }
            if ($request->has('branch')) {
                $query->where('branch', $request->branch);
            }

            // Pagination
            $perPage = $request->get('per_page', 15);
            $users = $query->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'message' => 'Users retrieved successfully',
                'data' => ['users' => $users]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users',
                'password' => 'required|string|min:6',
                'phone' => 'nullable|string|max:20',
                'role' => 'nullable|string',
                'department' => 'nullable|string',
                'branch' => 'nullable|string',
                'created_by' => 'nullable|string',
            ]);

            $lastUser = User::orderBy('id', 'desc')->first();
            $nextNumber = $lastUser ? ((int) substr($lastUser->user_id, 4)) + 1 : 1;

            $user = User::create([
                'user_id' => 'anv_' . $nextNumber,
                'name' => $request->name,
                'email' => $request->email,
                'password' => $request->password,
                'phone' => $request->phone,
                'role' => $request->role ?? 'user',
                'department' => $request->department,
                'branch' => $request->branch,
                'created_by' => $request->created_by,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'User created successfully',
                'data' => ['user' => $user]
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $user = User::with('branchDetails:code,name')->find($id);
            
            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User not found',
                    'data' => null
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'User retrieved successfully',
                'data' => ['user' => $user]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $user = User::find($id);
            
            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User not found',
                    'data' => null
                ], 404);
            }

            $request->validate([
                'user_id' => 'sometimes|integer|unique:users,user_id,' . $id,
                'name' => 'sometimes|string|max:255',
                'email' => 'sometimes|email|unique:users,email,' . $id,
                'phone' => 'nullable|string|max:20',
                'role' => 'sometimes|string',
                'department' => 'nullable|string',
                'branch' => 'nullable|string',
            ]);

            $user->update($request->only(['user_id', 'name', 'email', 'phone', 'role', 'department', 'branch']));

            return response()->json([
                'status' => 'success',
                'message' => 'User updated successfully',
                'data' => ['user' => $user]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function updatePassword(Request $request, $id)
    {
        try {
            $request->validate([
                'password' => 'required|string|min:6',
            ]);

            $user = User::find($id);

            if (!$user) {
                return response()->json(['status' => 'error', 'message' => 'User not found'], 404);
            }

            $user->update([
                'password'           => \Illuminate\Support\Facades\Hash::make($request->password),
                'unhashed_password'  => $request->password,
            ]);

            return response()->json([
                'status'  => 'success',
                'message' => 'Password updated successfully',
                'data'    => ['user_id' => $user->user_id, 'email' => $user->email],
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $user = User::find($id);
            
            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User not found',
                    'data' => null
                ], 404);
            }

            $user->update(['is_deleted' => 1]);

            return response()->json([
                'status' => 'success',
                'message' => 'User soft deleted successfully',
                'data' => null
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }
}
