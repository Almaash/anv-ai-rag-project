<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\hrms\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function employeeLogin(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);

            $employee = Employee::where('email', $request->email)->first();

            if (!$employee || !Hash::check($request->password, $employee->password)) {
                // FALLBACK: If authentication fails, check matching user record
                $userMatch = \App\Models\User::where('email', $request->email)->first();
                if ($userMatch && Hash::check($request->password, $userMatch->password)) {
                    // Update the employee password for next time
                    $employee->update(['password' => $userMatch->password]);
                } else {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'The provided credentials for employee are incorrect.',
                        'data' => null
                    ], 401);
                }
            }

            if ($employee->is_deleted) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Your account has been deleted. Please contact admin.',
                    'data' => null
                ], 403);
            }

            // Check if employee is active
            if (isset($employee->status) && $employee->status === 'inactive') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Your account is inactive. Please contact HR.',
                    'data' => null
                ], 403);
            }

            $token = $employee->createToken('employee_token')->plainTextToken;

            return response()->json([
                'status' => 'success',
                'message' => 'Employee login successful',
                'data' => [
                    'user' => $employee,
                    'token' => $token,
                    'type' => 'employee',
                    'requires_password_change' => (bool) $employee->requires_password_change
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function register(Request $request)
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

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => $request->password,
                'unhashed_password' => $request->password,
                'phone' => $request->phone,
                'role' => $request->role ?? 'user',
                'department' => $request->department,
                'branch' => $request->branch,
                'created_by' => $request->created_by ?? $request->user()?->user_id,
            ]);

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'status' => 'success',
                'message' => 'User registered successfully',
                'data' => ['user' => $user, 'token' => $token]
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function login(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);

            $user = User::with('branchDetails')->where('email', $request->email)->first();

            if (!$user || !Hash::check($request->password, $user->password)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'The provided credentials are incorrect.',
                    'data' => null
                ], 401);
            }

            if ($user->is_deleted) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Your account has been deleted. Please contact admin.',
                    'data' => null
                ], 403);
            }

            $rolePermissions = \App\Models\Role::where('name', $user->role)
                ->where('branch_id', $user->branch)
                ->first();
            $token = $user->createToken('auth_token')->plainTextToken;

            $userData = $user->toArray();
            if ($user->branchDetails) {
                $userData['branch_name'] = $user->branchDetails->name;
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Login successful',
                'data' => [
                    'user' => $userData,
                    'token' => $token,
                    'type' => 'admin',
                    'permissions' => $rolePermissions ? $rolePermissions->permissions : []
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function logout(Request $request)
    {
        try {
            $request->user()->currentAccessToken()->delete();
            return response()->json([
                'status' => 'success',
                'message' => 'Logged out successfully',
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

    public function me(Request $request)
    {
        try {
            return response()->json([
                'status' => 'success',
                'message' => 'User retrieved successfully',
                'data' => ['user' => $request->user()]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function loanLogin(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);

            // Try users table
            $user = User::with('branchDetails')->where('email', $request->email)->first();

            if ($user && Hash::check($request->password, $user->password)) {

                if ($user->is_deleted) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Your account has been deleted. Please contact admin.',
                        'data' => null
                    ], 403);
                }

                $rolePermissions = \App\Models\Role::where('name', $user->role)
                    ->where('branch_id', $user->branch)
                    ->first();

                // ❗ Check if permissions exist
                if (!$rolePermissions || empty($rolePermissions->permissions)) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'No permissions assigned to this user. Contact admin.',
                        'data' => null
                    ], 403);
                }

                $token = $user->createToken('auth_token')->plainTextToken;

                $userData = $user->toArray();
                if ($user->branchDetails) {
                    $userData['branch_name'] = $user->branchDetails->name;
                }

                // If user role is Field Executive, get agent_unique_id from loan_agents table
                if ($user->role === 'Field Executive') {
                    $loanAgent = \App\Models\Loan\LoanAgent::where('email', $user->email)->first();
                    if ($loanAgent) {
                        $userData['agent_unique_id'] = $loanAgent->agent_unique_id;
                    }
                }

                return response()->json([
                    'status' => 'success',
                    'message' => 'Loan login successful',
                    'data' => [
                        'user' => $userData,
                        'token' => $token,
                        'permissions' => $rolePermissions->permissions,
                        'user_type' => 'staff'
                    ]
                ]);
            }

            // Try loan_customers table
            $loanCustomer = \App\Models\Loan\LoanCustomer::with('branchDetails')
                ->where('email', $request->email)
                ->first();

            if ($loanCustomer && Hash::check($request->password, $loanCustomer->password)) {

                if ($loanCustomer->is_deleted) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Your account has been deleted. Please contact admin.',
                        'data' => null
                    ], 403);
                }

                $rolePermissions = \App\Models\Role::where('name', $loanCustomer->role)
                    ->where('branch_id', $loanCustomer->branch_id)
                    ->first();

                // ❗ Check permissions
                if (!$rolePermissions || empty($rolePermissions->permissions)) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'No permissions assigned to this user. Contact admin.',
                        'data' => null
                    ], 403);
                }

                $token = $loanCustomer->createToken('auth_token')->plainTextToken;

                $userData = $loanCustomer->toArray();
                if ($loanCustomer->branchDetails) {
                    $userData['branch_name'] = $loanCustomer->branchDetails->name;
                }

                return response()->json([
                    'status' => 'success',
                    'message' => 'Loan login successful',
                    'data' => [
                        'user' => $userData,
                        'token' => $token,
                        'permissions' => $rolePermissions->permissions,
                        'user_type' => 'customer'
                    ]
                ]);
            }

            return response()->json([
                'status' => 'error',
                'message' => 'The provided credentials are incorrect.',
                'data' => null
            ], 401);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function inventoryLogin(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);

            $user = User::with('branchDetails')->where('email', $request->email)->first();

            if (!$user || !Hash::check($request->password, $user->password)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'The provided credentials are incorrect.',
                    'data' => null
                ], 401);
            }

            if ($user->is_deleted) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Your account has been deleted. Please contact admin.',
                    'data' => null
                ], 403);
            }

            $rolePermissions = \App\Models\Role::where('name', $user->role)
                ->where('branch_id', $user->branch)
                ->first();
            $token = $user->createToken('auth_token')->plainTextToken;

            $userData = $user->toArray();
            if ($user->branchDetails) {
                $userData['branch_name'] = $user->branchDetails->name;
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Inventory login successful',
                'data' => [
                    'user' => $userData,
                    'token' => $token,
                    'permissions' => $rolePermissions ? $rolePermissions->permissions : []
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function hrmsLogin(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);

            $user = User::with('branchDetails')->where('email', $request->email)->first();

            if (!$user || !Hash::check($request->password, $user->password)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'The provided credentials are incorrect.',
                    'data' => null
                ], 401);
            }

            if ($user->is_deleted) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Your account has been deleted. Please contact admin.',
                    'data' => null
                ], 403);
            }

            $rolePermissions = \App\Models\Role::where('name', $user->role)
                ->where('branch_id', $user->branch)
                ->first();
            $token = $user->createToken('auth_token')->plainTextToken;

            $userData = $user->toArray();
            if ($user->branchDetails) {
                $userData['branch_name'] = $user->branchDetails->name;
            }

            return response()->json([
                'status' => 'success',
                'message' => 'HRMS login successful',
                'data' => [
                    'user' => $userData,
                    'token' => $token,
                    'permissions' => $rolePermissions ? $rolePermissions->permissions : []
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function unifiedLogin(Request $request)
    {
        try {
            $request->validate([
                'email'    => 'required|email',
                'password' => 'required',
            ]);

            // 1. Super-admin / CMS-admin / Loan staff / Inventory / HRMS admin (users table)
            $user = User::with('branchDetails')->where('email', $request->email)->first();

            if ($user && Hash::check($request->password, $user->password)) {

                if ($user->is_deleted) {
                    return response()->json([
                        'status'  => 'error',
                        'message' => 'Your account has been deleted. Please contact admin.',
                        'data'    => null
                    ], 403);
                }
                // For admin roles, look up by name with null branch (global roles)
                // For branch-scoped roles, look up by name + branch
                $rolePermissions = \App\Models\Role::where('name', $user->role)
                    ->where(function ($q) use ($user) {
                        $q->where('branch_id', $user->branch)
                            ->orWhereNull('branch_id');
                    })
                    ->first();

                $token = $user->createToken('auth_token')->plainTextToken;

                $userData = $user->toArray();
                if ($user->branchDetails) {
                    $userData['branch_name'] = $user->branchDetails->name;
                }

                // Field Executive: attach agent_unique_id and prioritize cms_admin_id from loan_agents table
                if ($user->role === 'Field Executive') {
                    $loanAgent = \App\Models\Loan\LoanAgent::where('email', $user->email)->first();
                    if ($loanAgent) {
                        $userData['agent_unique_id'] = $loanAgent->agent_unique_id;
                        $userData['cms_admin_id'] = $loanAgent->cms_admin_id;
                    }
                }

                // Determine redirect based on role / department
                $role = strtolower($user->role ?? '');
                $dept = strtolower($user->department ?? '');

                if (in_array($role, ['super_admin', 'super admin', 'superadmin', 'cms_admin', 'cms admin', 'cmsadmin'])) {
                    $redirectTo = '/admin/dashboard';
                } elseif ($dept === 'hrms' || str_contains($role, 'hrms')) {
                    $redirectTo = '/hrms/dashboard';
                } elseif ($dept === 'inventory' || str_contains($role, 'inventory')) {
                    $redirectTo = '/inventory/dashboard';
                } else {
                    // Loan staff — require permissions
                    if (!$rolePermissions || empty($rolePermissions->permissions)) {
                        return response()->json([
                            'status'  => 'error',
                            'message' => 'No permissions assigned to this user. Contact admin.',
                            'data'    => null
                        ], 403);
                    }
                    $redirectTo = '/loan/dashboard';
                }

                // Keep same localStorage structure as loan login (cms_admin mapping)
                $modifiedUser = array_merge($userData, [
                    'cms_admin' => $userData['cms_admin_id'] ?? $userData['created_by'] ?? null,
                ]);
                unset($modifiedUser['created_by']);
                unset($modifiedUser['cms_admin_id']);

                return response()->json([
                    'status'  => 'success',
                    'message' => 'Login successful',
                    'data'    => [
                        'user'        => $modifiedUser,
                        'token'       => $token,
                        'permissions' => $rolePermissions ? $rolePermissions->permissions : [],
                        'user_type'   => 'staff',
                        'redirect_to' => $redirectTo,
                    ]
                ]);
            }

            // 2. HRMS Employee
            $employee = \App\Models\hrms\Employee::where('email', $request->email)->first();
            if ($employee && Hash::check($request->password, $employee->password)) {
                if (isset($employee->status) && $employee->status === 'inactive') {
                    return response()->json([
                        'status'  => 'error',
                        'message' => 'Your account is inactive. Please contact HR.',
                        'data'    => null
                    ], 403);
                }

                $token = $employee->createToken('employee_token')->plainTextToken;

                return response()->json([
                    'status'  => 'success',
                    'message' => 'Login successful',
                    'data'    => [
                        'user'                    => $employee,
                        'token'                   => $token,
                        'permissions'             => [],
                        'user_type'               => 'employee',
                        'redirect_to'             => '/hrms/dashboard',
                        'requires_password_change' => (bool) $employee->requires_password_change,
                    ]
                ]);
            }

            // 3. Loan Customer
            $loanCustomer = \App\Models\Loan\LoanCustomer::with('branchDetails')
                ->where('email', $request->email)->first();

            if ($loanCustomer && Hash::check($request->password, $loanCustomer->password)) {
                if ($loanCustomer->is_deleted) {
                    return response()->json([
                        'status'  => 'error',
                        'message' => 'Your account has been deleted. Please contact admin.',
                        'data'    => null
                    ], 403);
                }
                if ($loanCustomer->status !== 'active') {
                    return response()->json([
                        'status'  => 'error',
                        'message' => 'Your account is not active. Please contact admin.',
                        'data'    => null
                    ], 403);
                }

                $rolePermissions = \App\Models\Role::where('name', $loanCustomer->role)
                    ->where('branch_id', $loanCustomer->branch_id)
                    ->first();

                if (!$rolePermissions || empty($rolePermissions->permissions)) {
                    return response()->json([
                        'status'  => 'error',
                        'message' => 'No permissions assigned to this user. Contact admin.',
                        'data'    => null
                    ], 403);
                }

                $token = $loanCustomer->createToken('auth_token')->plainTextToken;
                $userData = $loanCustomer->toArray();
                if ($loanCustomer->branchDetails) {
                    $userData['branch_name'] = $loanCustomer->branchDetails->name;
                }

                return response()->json([
                    'status'  => 'success',
                    'message' => 'Login successful',
                    'data'    => [
                        'user'        => $userData,
                        'token'       => $token,
                        'permissions' => $rolePermissions->permissions,
                        'user_type'   => 'customer',
                        'redirect_to' => '/loan/dashboard',
                    ]
                ]);
            }

            return response()->json([
                'status'  => 'error',
                'message' => 'The provided credentials are incorrect.',
                'data'    => null
            ], 401);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'data'    => null
            ], 500);
        }
    }

    public function loanCustomerLogin(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);

            $loanCustomer = \App\Models\Loan\LoanCustomer::with(['branchDetails', 'roleData'])
                ->where('email', $request->email)
                ->first();

            if (!$loanCustomer || !Hash::check($request->password, $loanCustomer->password)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'The provided credentials are incorrect.',
                    'data' => null
                ], 401);
            }

            if ($loanCustomer->is_deleted) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Your account has been deleted. Please contact admin.',
                    'data' => null
                ], 403);
            }

            // if ($loanCustomer->status !== 'active') {
            //     return response()->json([
            //         'status' => 'error',
            //         'message' => 'Your account is not active. Please contact admin.',
            //         'data' => null
            //     ], 403);
            // }

            $token = $loanCustomer->createToken('auth_token')->plainTextToken;

            $userData = [
                'customer_unique_id' => $loanCustomer->customer_unique_id,
                'role' => $loanCustomer->role,
                'first_name' => $loanCustomer->first_name,
                'last_name' => $loanCustomer->last_name,
                'agent_unique_id' => $loanCustomer->agent_unique_id,
                'email' => $loanCustomer->email,
                'mobile' => $loanCustomer->mobile,
                'branch_id' => $loanCustomer->branch_id,
                'user_id' => $loanCustomer->user_id,
                'cms_admin_id' => $loanCustomer->cms_admin_id,
                'branch_name' => $loanCustomer->branchDetails->name ?? null,
            ];

            // Get permissions from the role assigned to the customer
            $permissions = [];
            if ($loanCustomer->roleData && $loanCustomer->roleData->permissions) {
                $permissions = $loanCustomer->roleData->permissions;
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Login successful',
                'data' => [
                    'user' => $userData,
                    'token' => $token,
                    'permissions' => $permissions,
                    'user_type' => 'customer'
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function investorLogin(Request $request)
    {
        try {
            $request->validate([
                'email'    => 'required|email',
                'password' => 'required',
            ]);

            $investor = \App\Models\Investor\BasicInformation::with('roleData')
                ->where('email', $request->email)->first();

            if (!$investor) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'The provided credentials are incorrect.',
                    'data'    => null,
                ], 401);
            }

            if ($investor->deleted_at) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Your account has been deleted. Please contact admin.',
                    'data'    => null,
                ], 403);
            }

            // Support both bcrypt-hashed and plain-text passwords
            $passwordValid = false;
            try {
                $passwordValid = Hash::check($request->password, $investor->password);
            } catch (\Exception $e) {
                $passwordValid = $request->password === $investor->unhashed_password
                    || $request->password === $investor->getRawOriginal('password');
                if ($passwordValid) {
                    $investor->update(['password' => Hash::make($request->password)]);
                }
            }

            if (!$passwordValid) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'The provided credentials are incorrect.',
                    'data'    => null,
                ], 401);
            }

            $token = $investor->createToken('auth_token')->plainTextToken;

            $userData = [
                'unique_id'    => $investor->unique_id,
                'role'         => $investor->role,
                'first_name'   => $investor->first_name,
                'last_name'    => $investor->last_name,
                'email'        => $investor->email,
                'mobile'       => $investor->mobile,
                'branch_id'    => $investor->branch_id,
                'cms_admin_id' => $investor->cms_admin_id,
            ];

            $permissions = $investor->roleData?->permissions ?? [];

            return response()->json([
                'status'  => 'success',
                'message' => 'Login successful',
                'data'    => [
                    'user'        => $userData,
                    'token'       => $token,
                    'permissions' => $permissions,
                    'user_type'   => 'investor',
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'data'    => null,
            ], 500);
        }
    }

    public function changePassword(Request $request)
    {
        try {
            $request->validate([
                'current_password' => 'required',
                'new_password' => 'required|string|min:6|confirmed',
            ]);

            $user = $request->user();

            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'The current password you provided is incorrect.'
                ], 422);
            }

            $user->update([
                'password' => Hash::make($request->new_password),
                'requires_password_change' => false // For employees
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Password updated successfully'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update password'
            ], 500);
        }
    }
}
