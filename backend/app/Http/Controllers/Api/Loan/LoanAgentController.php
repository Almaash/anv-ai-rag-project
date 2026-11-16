<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\Loan\LoanAgent;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class LoanAgentController extends Controller
{
   public function index(Request $request)
{
    $query = LoanAgent::query();

    // Search
    if ($request->filled('search')) {
        $search = trim($request->search);

        $query->where(function ($q) use ($search) {
            $q->where('agent_unique_id', 'like', "%{$search}%")
                ->orWhere('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone_no', 'like', "%{$search}%");
        });
    }

    // Status
    if ($request->filled('status')) {
        $query->where('status', $request->status);
    }

    // Branch Filter
    if ($request->filled('branch_id')) {
        $query->where('branch_id', $request->branch_id);
    }

    // CMS Admin Filter
    if ($request->filled('cms_admin_id')) {
        $query->where('cms_admin_id', $request->cms_admin_id);
    }

    // Optional User Filter
   

    $perPage = (int) $request->get('per_page', 10);

    $agents = $query
        ->where('is_deleted', 0)
        ->orderByDesc('created_at')
        ->paginate($perPage);

    return response()->json([
        'success' => true,
        'message' => 'Agents retrieved successfully',
        'data' => $agents
    ]);
}

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:loan_agents,email',
            'phone_no' => 'required|string|unique:loan_agents,phone_no',
            'password' => 'nullable|string|min:6',
            'role' => 'nullable|string|max:100',
            'department' => 'nullable|string|max:255',
            'created_by' => 'nullable|string|max:255',
            'gender' => 'nullable|string',
            'location' => 'nullable|string',
            'address' => 'nullable|string',
            'photo' => 'nullable|file|mimes:jpeg,jpg,png|max:2048',
            'adhaar_image' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
            'aadhaar_image_back' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
            'pan_image' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
            'voter_id_image' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
            'voter_id_image_back' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
            'driving_license_image' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
            'passbook_image' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
            'police_verification_image' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
            'status' => 'nullable|in:active,inactive',
            'user_id' => 'nullable|string',
            'branch_id' => 'nullable|string',
            'cms_admin_id' => 'nullable|string',
            'is_deleted' => 'nullable|integer',
            'admin_user_id' => 'nullable|string',
            'branch' => 'nullable|string',
            'cms_admin' => 'nullable|string',
            'phone' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();

        try {
            $user = null;

            if ($request->filled('user_id')) {
                $user = User::where('user_id', $request->user_id)->first();

                if (!$user) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Provided user_id not found in users table'
                    ], 422);
                }
            } else {
                $user = User::where('email', $request->email)->first();

                if (!$user) {
                    $user = User::create([
                        'name' => $request->name,
                        'email' => $request->email,
                        'password' => Hash::make($request->password ?? 'admin123'),
                        'unhashed_password' => $request->password ?? 'admin123',
                        'phone' => $request->phone_no,
                        'role' => $request->role ?? 'Field executive',
                        'department' => $request->department ?? 'loan',
                        'branch' => $request->branch ?? $request->branch_id,
                        'created_by' => $request->created_by ?? $request->cms_admin ?? $request->cms_admin_id,
                        'is_deleted' => $request->is_deleted ?? 0,
                        'admin_user_id' => $request->admin_user_id,
                        'branch_id' => $request->branch_id,
                    ]);
                }
            }

            $data = $request->except([
                'photo',
                'adhaar_image',
                'aadhaar_image_back',
                'pan_image',
                'voter_id_image',
                'voter_id_image_back',
                'driving_license_image',
                'passbook_image',
                'police_verification_image',
                'password',
                'role',
                'department',
                'created_by',
                'branch_id',
                'cms_admin_id',
                'branch',
                'cms_admin',
                'phone'
            ]);

            $data['user_id'] = $user->user_id;
            $data['branch_id'] = $request->branch_id ?? $user->branch_id;
            $data['cms_admin_id'] = $request->cms_admin_id ?? $user->created_by;
            $plainPassword = $request->password ?? 'admin123';
            $data['password'] = Hash::make($plainPassword);
            $data['unhashed_password'] = $plainPassword;

            // Safely generate a unique agent_unique_id to avoid soft-delete conflicts
            $maxId = DB::table('loan_agents')->max('id') ?? 0;
            $nextId = $maxId + 1;
            $agentUniqueId = 'AGT' . date('Y') . str_pad($nextId, 4, '0', STR_PAD_LEFT);
            
            while (DB::table('loan_agents')->where('agent_unique_id', $agentUniqueId)->exists()) {
                $nextId++;
                $agentUniqueId = 'AGT' . date('Y') . str_pad($nextId, 4, '0', STR_PAD_LEFT);
            }
            $data['agent_unique_id'] = $agentUniqueId;

            $imageFields = ['photo', 'adhaar_image', 'aadhaar_image_back', 'pan_image', 'voter_id_image', 'voter_id_image_back', 'driving_license_image', 'passbook_image', 'police_verification_image'];
            foreach ($imageFields as $field) {
                if ($request->hasFile($field)) {
                    $file = $request->file($field);
                    $filename = time() . '_' . $field . '_' . $file->getClientOriginalName();
                    $file->move(public_path('agent_documents'), $filename);
                    $data[$field] = 'agent_documents/' . $filename;
                }
            }

            $agent = LoanAgent::create($data);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Agent created successfully',
                'data' => $agent,
                'user_login' => [
                    'id' => $user->id,
                    'is_deleted' => $user->is_deleted ?? 0,
                    'admin_user_id' => $user->admin_user_id ?? null,
                    'branch_id' => $user->branch_id ?? null,
                    'user_id' => $user->user_id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $user->role,
                    'department' => $user->department,
                    'branch' => $user->branch,
                    'cms_admin' => $user->created_by,
                    'created_at' => $user->created_at,
                    'updated_at' => $user->updated_at
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to create agent',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        $agent = LoanAgent::where('agent_unique_id', $id)->orWhere('id', $id)->first();

        if (!$agent) {
            return response()->json([
                'success' => false,
                'message' => 'Agent not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Agent retrieved successfully',
            'data' => $agent
        ]);
    }

    public function update(Request $request, $id)
    {
        $agent = LoanAgent::where('agent_unique_id', $id)->first();

        if (!$agent) {
            return response()->json([
                'success' => false,
                'message' => 'Agent not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:255',
            'email' => 'email|unique:loan_agents,email,' . $agent->id,
            'phone_no' => 'string|unique:loan_agents,phone_no,' . $agent->id,
            'gender' => 'nullable|string',
            'location' => 'nullable|string',
            'address' => 'nullable|string',
            'photo' => 'nullable|file|mimes:jpeg,jpg,png|max:2048',
            'adhaar_image' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
            'aadhaar_image_back' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
            'pan_image' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
            'voter_id_image' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
            'voter_id_image_back' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
            'driving_license_image' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
            'passbook_image' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
            'police_verification_image' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
            'status' => 'nullable|in:active,inactive',
            'user_id' => 'nullable|string',
            'branch_id' => 'nullable|string',
            'cms_admin_id' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->except(['photo', 'adhaar_image', 'aadhaar_image_back', 'pan_image', 'voter_id_image', 'voter_id_image_back', 'driving_license_image', 'passbook_image', 'police_verification_image']);

        $imageFields = ['photo', 'adhaar_image', 'aadhaar_image_back', 'pan_image', 'voter_id_image', 'voter_id_image_back', 'driving_license_image', 'passbook_image', 'police_verification_image'];
        foreach ($imageFields as $field) {
            if ($request->hasFile($field)) {
                $file = $request->file($field);
                $filename = time() . '_' . $field . '_' . $file->getClientOriginalName();
                $file->move(public_path('agent_documents'), $filename);
                $data[$field] = 'agent_documents/' . $filename;
            }
        }

        $agent->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Agent updated successfully',
            'data' => $agent
        ]);
    }

   public function destroy($id)
{
    DB::beginTransaction();

    try {

        $agent = LoanAgent::withoutGlobalScopes()
            ->Where('id', $id)
                ->where('id', $id)
                ->orWhere('agent_unique_id', $id)
            ->first();

        if (!$agent) {
            return response()->json([
                'success' => false,
                'message' => 'Agent not found'
            ], 404);
        }

        // Soft delete agent
        $agent->update([
            'is_deleted' => 1
        ]);
            $agent->is_deleted = 1;
            $agent->save();

        $user = null;

        /*
        |--------------------------------------------------------------------------
        | Find user using user_id
        |--------------------------------------------------------------------------
        */
        if (!empty($agent->user_id)) {

            $user = User::withoutGlobalScopes()
                ->where('user_id', $agent->user_id)
                ->first();
        }

        /*
        |--------------------------------------------------------------------------
        | Fallback using email
        |--------------------------------------------------------------------------
        */
        if (!$user && !empty($agent->email)) {

            $user = User::withoutGlobalScopes()
                ->where('email', $agent->email)
                ->first();
        }

        /*
        |--------------------------------------------------------------------------
        | Soft delete user
        |--------------------------------------------------------------------------
        */
        if ($user) {

            $user->update([
                'is_deleted' => 1
            ]);
                // Direct assignment circumvents any mass-assignment ($fillable) limitations
                $user->is_deleted = 1;
                $user->save();

            Log::info('Agent user deleted successfully', [
                'agent_id' => $agent->id,
                'agent_unique_id' => $agent->agent_unique_id,
                'user_id' => $user->user_id,
                'user_table_id' => $user->id
            ]);
        } else {

            Log::warning('No linked user found for agent', [
                'agent_id' => $agent->id,
                'agent_unique_id' => $agent->agent_unique_id,
                'agent_user_id' => $agent->user_id,
                'agent_email' => $agent->email
            ]);
        }

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Agent and associated user soft deleted successfully',
            'agent_unique_id' => $agent->agent_unique_id,
            'user_deleted' => $user ? true : false
        ]);
    } catch (\Exception $e) {

        DB::rollBack();

        Log::error('Error soft deleting agent', [
            'agent_id' => $id,
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Failed to delete agent',
            'error' => $e->getMessage()
        ], 500);
    }
}
}
