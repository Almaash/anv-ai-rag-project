<?php

namespace App\Http\Controllers\Api\hrms;

use App\Http\Controllers\Controller;
use App\Models\hrms\Employee;
use App\Models\hrms\EmployeePersonalDetail;
use App\Models\hrms\EmployeeAddress;
use App\Models\hrms\EmployeeBankDetail;
use App\Models\hrms\EmployeeDocument;
use App\Models\hrms\EmployeeLeaveBalance;
use App\Models\hrms\LeaveType;
use App\Models\hrms\Designation;
use App\Models\hrms\Department;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Exception;

class EmployeeController extends Controller
{
    private function normalizeLeaveKey(string $value): string
    {
        return preg_replace('/[^a-z0-9]+/', '', strtolower($value)) ?? '';
    }

    private function getLeaveInputMap(Request $request): array
    {
        $map = [];
        $leaveDays = $request->input('leave_days');
        if (is_string($leaveDays)) {
            $decoded = json_decode($leaveDays, true);
            if (is_array($decoded)) $leaveDays = $decoded;
        }
        if (is_array($leaveDays)) {
            foreach ($leaveDays as $key => $value) {
                $nk = $this->normalizeLeaveKey((string) $key);
                if ($nk === '') continue;
                $map[$nk] = max(0, (int) $value);
            }
        }
        $fieldAliases = [
            'sick_leave_days'      => ['sickleavedays', 'sickleave'],
            'casual_leave_days'    => ['casualleavedays', 'casualleave'],
            'maternity_leave_days' => ['maternityleavedays', 'maternityleave', 'maritalleavedays', 'maritalleave'],
            'paid_leave_days'      => ['paidleavedays', 'paidleave'],
        ];
        foreach ($fieldAliases as $rf => $keys) {
            if (!$request->has($rf)) continue;
            $v = max(0, (int) $request->input($rf));
            foreach ($keys as $k) $map[$k] = $v;
        }
        return $map;
    }

    private function getRequestedAllocationForType($leaveType, array $leaveInputMap): array
    {
        $candidates = [
            (string) $leaveType->id,
            'leavetype' . $leaveType->id,
            $this->normalizeLeaveKey((string) $leaveType->name),
            $this->normalizeLeaveKey(str_replace('leave', '', (string) $leaveType->name)),
        ];
        foreach ($candidates as $c) {
            if ($c !== '' && array_key_exists($c, $leaveInputMap)) {
                return [true, max(0, (int) $leaveInputMap[$c])];
            }
        }
        return [false, 0];
    }

    private function syncEmployeeLeaveSummary(Employee $employee): void
    {
        $employee->load('leaveBalances.leaveType');
        $annualQuota = 15;
        $annualUsed = min((int) $employee->leaveBalances->sum('used'), $annualQuota);
        $annualBalance = max($annualQuota - $annualUsed, 0);
        $sickDays = $casualDays = $maternityDays = $paidDays = 0;
        foreach ($employee->leaveBalances as $balance) {
            $name = strtolower((string) optional($balance->leaveType)->name);
            if (str_contains($name, 'sick'))      $sickDays      += (int) $balance->remaining;
            if (str_contains($name, 'casual'))    $casualDays    += (int) $balance->remaining;
            if (str_contains($name, 'maternity') || str_contains($name, 'marital')) $maternityDays += (int) $balance->remaining;
            if (str_contains($name, 'paid'))      $paidDays      += (int) $balance->remaining;
        }
        $employee->update([
            'annual_leave_quota'   => $annualQuota,
            'annual_leave_used'    => $annualUsed,
            'annual_leave_balance' => $annualBalance,
            'leave_cycle_year'     => $employee->leave_cycle_year ?? now()->year,
            'sick_leave_days'      => $sickDays,
            'casual_leave_days'    => $casualDays,
            'maternity_leave_days' => $maternityDays,
            'paid_leave_days'      => $paidDays,
        ]);
    }

    private function backfillBankDetailIfMissing(Employee $employee): void
    {
        $employee->loadMissing('bankDetails');
        if ($employee->bankDetails) return;
        if (empty($employee->bank_name) && empty($employee->account_number) && empty($employee->ifsc_code)) return;
        EmployeeBankDetail::updateOrCreate(
            ['employee_id' => $employee->id],
            [
                'bank_name'           => $employee->bank_name,
                'account_holder_name' => trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? '')),
                'account_number'      => $employee->account_number,
                'ifsc_code'           => $employee->ifsc_code,
                'branch_name'         => null,
                'is_primary'          => true,
            ]
        );
        $employee->unsetRelation('bankDetails');
        $employee->load('bankDetails');
    }

    private function getAdmin(Request $request)
    {
        return $request->user();
    }

    // ===================== INDEX (Paginated, Optimised, Scoped) =====================

    public function index(Request $request)
    {
        try {
            $admin   = $this->getAdmin($request);
            $perPage = min((int) $request->input('per_page', 25), 100);
            $search  = $request->input('search');

            $query = Employee::query()
                ->forAdmin($admin)
                ->select([
                    'id', 'employee_id', 'first_name', 'last_name', 'email', 'phone',
                    'designation_id', 'department_id', 'branch_id',
                    'employment_type', 'status', 'profile_photo', 'joining_date', 'role',
                    'annual_leave_quota', 'annual_leave_used', 'annual_leave_balance',
                    'sick_leave_days', 'casual_leave_days', 'maternity_leave_days', 'paid_leave_days',
                ])
                ->with([
                    'designation:designation_id,name',
                    'department:id,name',
                    'branch:code,name',
                    'documents:id,employee_id,document_type,file_path',
                ]);

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%")
                      ->orWhere('employee_id', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
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
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // ===================== STORE (No User creation) =====================

    public function store(Request $request)
    {
        DB::beginTransaction();
        try {
            $admin = $this->getAdmin($request);
            $email = trim((string) $request->input('email'));

            if ($email !== '') {
                $exists = Employee::forAdmin($admin)->where('email', $email)->exists();
                if ($exists) {
                    DB::rollBack();
                    return response()->json(['status' => 'error', 'message' => 'Employee email already exists'], 422);
                }
            }

            $leaveInputMap    = $this->getLeaveInputMap($request);
            $leaveTypes       = LeaveType::where('status', true)->get();
            $leaveAllocations = [];
            foreach ($leaveTypes as $lt) {
                [$hasVal, $val] = $this->getRequestedAllocationForType($lt, $leaveInputMap);
                $leaveAllocations[$lt->id] = $hasVal ? $val : max(0, (int) $lt->limit_days);
            }

            $annualLeaveQuota   = 15;
            $annualLeaveUsed    = max(0, min((int) $request->input('annual_leave_used', 0), $annualLeaveQuota));
            $annualLeaveBalance = max($annualLeaveQuota - $annualLeaveUsed, 0);

            $employeeData = $request->only([
                'first_name', 'last_name', 'email', 'phone', 'gender', 'blood_group',
                'designation_id', 'department_id', 'branch_id', 'reporting_manager_id',
                'joining_date', 'probation_end_date', 'employment_type', 'basic_salary', 'status',
                'annual_leave_quota', 'annual_leave_used',
                'annual_leave_balance', 'leave_cycle_year', 'sick_leave_days',
                'casual_leave_days', 'maternity_leave_days', 'paid_leave_days',
            ]);

            // Convert numeric IDs to string unique IDs for designation only
            if (is_numeric($employeeData['designation_id'] ?? null)) {
                $dsg = Designation::find($employeeData['designation_id']);
                if ($dsg && !empty($dsg->designation_id)) {
                    $employeeData['designation_id'] = $dsg->designation_id;
                }
            } elseif (empty($employeeData['designation_id'])) {
                // Handle case where designation_id might be missing or explicitly null
                $employeeData['designation_id'] = $request->input('designation_id');
            }

            // department_id stays as numeric id — relationship now uses id as owner key
            // No conversion needed

            // Resolve CMS Admin ID (from payload or token)
            $cmsAdminId = $request->input('cms_admin') ?? ($admin->cms_admin ?? null);

            if ($request->filled('password')) {
                $employeeData['password'] = Hash::make($request->input('password'));
            } else {
                // Generate a default password if not provided
                $employeeData['password'] = Hash::make('employee@1234');
            }

            $employeeData['role']         = $request->input('role', 'employee');
            $employeeData['cms_admin_id'] = $cmsAdminId;
            // Use user_id string from payload (e.g. 'anv_6') — linked to users table
            $employeeData['user_id']      = $request->input('user_id') ?: null;

            // Store branch code directly (e.g. BR0001)
            $branchId = $request->input('branch_id') ?? ($admin->branch ?? $admin->branch_id ?? null);
            if ($branchId) {
                $employeeData['branch_id'] = $branchId;
            }

            $employeeData['dob']            = $request->date_of_birth ?? $request->dob;
            $employeeData['marital_status'] = $request->martial_status ?? $request->marital_status;
            $employeeData['annual_leave_quota']   = $annualLeaveQuota;
            $employeeData['annual_leave_used']    = $annualLeaveUsed;
            $employeeData['annual_leave_balance'] = $annualLeaveBalance;
            $employeeData['leave_cycle_year']     = $request->input('leave_cycle_year', now()->year);
            $employeeData['sick_leave_days']      = max(0, (int) $request->input('sick_leave_days', 0));
            $employeeData['casual_leave_days']    = max(0, (int) $request->input('casual_leave_days', 0));
            $employeeData['maternity_leave_days'] = max(0, (int) $request->input('maternity_leave_days', 0));
            $employeeData['paid_leave_days']      = max(0, (int) $request->input('paid_leave_days', 0));

            $employee = Employee::create($employeeData);

            // Create Personal Details record
            EmployeePersonalDetail::create([
                'cms_admin_id'               => $cmsAdminId,
                'branch_id'                  => $employeeData['branch_id'] ?? null,
                'employee_id'                => $employee->employee_id,
                'middle_name'                => $request->input('middle_name'),
                'father_name'                => $request->input('father_name'),
                'mother_name'                => $request->input('mother_name'),
                'spouse_name'                => $request->input('spouse_name'),
                'nationality'                => $request->input('nationality', 'Indian'),
                'religion'                   => $request->input('religion'),
                'caste'                      => $request->input('caste'),
                'identification_mark'        => $request->input('identification_mark'),
                'passport_number'            => $request->input('passport_number'),
                'physically_challenged'      => $request->input('physically_challenged', 'no'),
                'emergency_contact_name'     => $request->input('emergency_contact_name'),
                'emergency_contact_phone'    => $request->input('emergency_contact_phone'),
                'emergency_contact_relation' => $request->input('emergency_contact_relation'),
                'pan_number'                 => $request->input('pan_number'),
                'aadhaar_number'             => $request->input('aadhaar_number') ?? $request->input('aadhar_number'),
                'pf_number'                  => $request->input('pf_number'),
                'esi_number'                 => $request->input('esi_number'),
            ]);

            // Create Bank Details record
            $bankData = null;
            if ($request->has('bank_details')) {
                $bankData = $request->input('bank_details');
                if (is_string($bankData)) $bankData = json_decode($bankData, true);
            } elseif ($request->filled('bank_name') || $request->filled('account_number') || $request->filled('ifsc_code')) {
                $bankData = $request->only(['bank_name', 'account_holder_name', 'account_number', 'ifsc_code', 'branch_name']);
            }

            if ($bankData) {
                EmployeeBankDetail::create([
                    'cms_admin_id'        => $cmsAdminId,
                    'branch_id'           => $employeeData['branch_id'] ?? null,
                    'employee_id'         => $employee->employee_id,
                    'bank_name'           => $bankData['bank_name'] ?? null,
                    'account_holder_name' => $bankData['account_holder_name'] ?? trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? '')),
                    'account_number'      => $bankData['account_number'] ?? null,
                    'ifsc_code'           => $bankData['ifsc_code'] ?? null,
                    'branch_name'         => $bankData['branch_name'] ?? null,
                    'is_primary'          => true,
                ]);
            }

            // Create Address records
            if ($request->has('addresses')) {
                $addresses = $request->input('addresses');
                if (is_string($addresses)) $addresses = json_decode($addresses, true);
                foreach ((array) $addresses as $addr) {
                    $type = ($addr['type'] ?? 'present') === 'present' ? 'current' : ($addr['type'] ?? 'permanent');
                    EmployeeAddress::create([
                        'cms_admin_id'   => $cmsAdminId,
                        'branch_id'      => $employeeData['branch_id'] ?? null,
                        'employee_id'    => $employee->employee_id,
                        'type'           => $type,
                        'address_line_1' => trim(($addr['house_no'] ?? '') . ' ' . ($addr['street'] ?? '')),
                        'address_line_2' => $addr['landmark'] ?? null,
                        'city'           => $addr['city'] ?? '',
                        'state'          => $addr['state'] ?? '',
                        'country'        => $addr['country'] ?? 'India',
                        'pincode'        => $addr['pincode'] ?? '',
                    ]);
                }
            }

            // Create Documents records
            if ($request->hasFile('documents')) {
                foreach ($request->file('documents') as $type => $file) {
                    $extension = $file->getClientOriginalExtension();
                    $filename = 'EMP_' . time() . '_' . $type . '.' . $extension;
                    $file->move(public_path('employee_documents'), $filename);
                    EmployeeDocument::create([
                        'cms_admin_id'  => $cmsAdminId,
                        'branch_id'     => $employeeData['branch_id'] ?? null,
                        'employee_id'   => $employee->employee_id,
                        'document_type' => $type,
                        'file_path'     => 'employee_documents/' . $filename,
                    ]);
                }
            }

            // Create Leave Balances records
            foreach ($leaveTypes as $lt) {
                $allocated = $leaveAllocations[$lt->id] ?? max(0, (int) $lt->limit_days);
                EmployeeLeaveBalance::create([
                    'cms_admin_id'    => $cmsAdminId,
                    'branch_id'       => $employeeData['branch_id'] ?? null,
                    'employee_id'     => $employee->employee_id,
                    'leave_type_id'   => $lt->id,
                    'total_allocated' => $allocated,
                    'used'            => 0,
                    'remaining'       => $allocated,
                ]);
            }

            $this->syncEmployeeLeaveSummary($employee);

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Employee created successfully',
                'data'    => $employee,
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine(),
            ], 500);
        }
    }

    // ===================== SHOW =====================

    public function show(Request $request, $id)
    {
        try {
            $admin = $this->getAdmin($request);
            if ($admin instanceof Employee && (int) $id !== (int) $admin->id) {
                return response()->json(['status' => 'error', 'message' => 'Forbidden: employees can only access their own profile'], 403);
            }
            $employee = Employee::forAdmin($admin)
                ->with([
                    'designation:id,name',
                    'department:id,name',
                    'branch:id,name',
                    'personalDetail',
                    'addresses',
                    'bankDetails',
                    'documents',
                    'leaveBalances.leaveType:id,name',
                ])
                ->findOrFail($id);

            $this->backfillBankDetailIfMissing($employee);

            return response()->json(['status' => 'success', 'data' => $employee], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['status' => 'error', 'message' => 'Employee not found'], 404);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // ===================== UPDATE =====================

    public function update(Request $request, $id)
    {
        DB::beginTransaction();
        try {
            $admin    = $this->getAdmin($request);
            if ($admin instanceof Employee && (int) $id !== (int) $admin->id) {
                DB::rollBack();
                return response()->json(['status' => 'error', 'message' => 'Forbidden: employees can only update their own profile'], 403);
            }
            $employee = Employee::forAdmin($admin)->findOrFail($id);

            if ($request->filled('email')) {
                $email = trim((string) $request->input('email'));
                $exists = Employee::forAdmin($admin)->where('email', $email)->where('id', '!=', $employee->id)->exists();
                if ($exists) {
                    DB::rollBack();
                    return response()->json(['status' => 'error', 'message' => 'Employee email already exists'], 422);
                }
            }

            $employeeData = $request->only([
                'first_name', 'last_name', 'email', 'phone', 'gender', 'blood_group',
                'designation_id', 'department_id', 'reporting_manager_id',
                'joining_date', 'probation_end_date', 'employment_type', 'basic_salary', 'status',
                'leave_cycle_year',
            ]);

            // Store branch code directly (e.g. BR0001)
            if ($admin && !empty($admin->branch)) {
                $employeeData['branch_id'] = $admin->branch;
            }

            if ($request->filled('password')) {
                $employeeData['password'] = Hash::make($request->input('password'));
            }
            if ($request->has('role')) {
                $employeeData['role'] = $request->input('role');
            }
            if ($request->has('date_of_birth') || $request->has('dob')) {
                $employeeData['dob'] = $request->date_of_birth ?? $request->dob;
            }
            if ($request->has('martial_status') || $request->has('marital_status')) {
                $employeeData['marital_status'] = $request->martial_status ?? $request->marital_status;
            }
            if ($request->has('annual_leave_quota') || $request->has('annual_leave_used') || $request->has('annual_leave_balance')) {
                $q = 15;
                $u = max(0, min((int) ($request->input('annual_leave_used') ?? $employee->annual_leave_used), $q));
                $employeeData['annual_leave_quota']   = $q;
                $employeeData['annual_leave_used']    = $u;
                $employeeData['annual_leave_balance'] = max($q - $u, 0);
            }
            foreach (['sick_leave_days', 'casual_leave_days', 'maternity_leave_days'] as $field) {
                if ($request->has($field)) $employeeData[$field] = max(0, (int) $request->input($field));
            }

            $employee->update($employeeData);

            $leaveInputMap = $this->getLeaveInputMap($request);
            if (!empty($leaveInputMap)) {
                $leaveTypes = LeaveType::where('status', true)->get();
                foreach ($leaveTypes as $lt) {
                    [$hasVal, $val] = $this->getRequestedAllocationForType($lt, $leaveInputMap);
                    if (!$hasVal) continue;
                    $lb = EmployeeLeaveBalance::firstOrCreate(
                        ['employee_id' => $employee->id, 'leave_type_id' => $lt->id],
                        ['total_allocated' => 0, 'used' => 0, 'remaining' => 0]
                    );
                    $newTotal  = max(0, $val);
                    $used      = min((int) $lb->used, $newTotal);
                    $remaining = max($newTotal - $used, 0);
                    $lb->update(['total_allocated' => $newTotal, 'used' => $used, 'remaining' => $remaining]);
                }
                $this->syncEmployeeLeaveSummary($employee);
            }

            // Personal Details
            $personalData = $request->only([
                'father_name', 'mother_name', 'spouse_name', 'nationality',
                'aadhaar_number', 'pan_number', 'passport_number',
                'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
                'middle_name', 'religion', 'caste', 'identification_mark', 'physically_challenged',
            ]);
            if (!empty($personalData)) {
                $employee->personalDetail()->updateOrCreate(['employee_id' => $employee->id], $personalData);
            }

            // Addresses
            if ($request->has('addresses')) {
                $addresses = $request->input('addresses');
                if (is_string($addresses)) $addresses = json_decode($addresses, true);
                $employee->addresses()->delete();
                foreach ((array) $addresses as $addr) {
                    $type = ($addr['type'] ?? 'present') === 'present' ? 'current' : ($addr['type'] ?? 'permanent');
                    EmployeeAddress::create([
                        'employee_id'    => $employee->id,
                        'type'           => $type,
                        'address_line_1' => trim(($addr['house_no'] ?? '') . ' ' . ($addr['street'] ?? '')),
                        'address_line_2' => $addr['landmark'] ?? null,
                        'city'           => $addr['city'] ?? '',
                        'state'          => $addr['state'] ?? '',
                        'country'        => $addr['country'] ?? 'India',
                        'pincode'        => $addr['pincode'] ?? '',
                    ]);
                }
            }

            // Bank Details
            $bankData = null;
            if ($request->has('bank_details')) {
                $bankData = $request->input('bank_details');
                if (is_string($bankData)) $bankData = json_decode($bankData, true);
            } elseif ($request->filled('bank_name') || $request->filled('account_number') || $request->filled('ifsc_code')) {
                $bankData = $request->only(['bank_name', 'account_holder_name', 'account_number', 'ifsc_code', 'branch_name']);
            }
            if (!empty($bankData)) {
                $employee->bankDetails()->updateOrCreate(
                    ['employee_id' => $employee->id],
                    [
                        'bank_name'          => $bankData['bank_name'] ?? null,
                        'account_holder_name' => $bankData['account_holder_name'] ?? null,
                        'account_number'     => $bankData['account_number'] ?? null,
                        'ifsc_code'          => $bankData['ifsc_code'] ?? null,
                        'branch_name'        => $bankData['branch_name'] ?? null,
                        'is_primary'         => true,
                    ]
                );
            }

            // Documents
            if ($request->hasFile('documents')) {
                foreach ($request->file('documents') as $type => $file) {
                    $existing = EmployeeDocument::where('employee_id', $employee->id)->where('document_type', $type)->first();
                    if ($existing && !empty($existing->file_path)) {
                        $oldPath = public_path($existing->file_path);
                        if (file_exists($oldPath)) @unlink($oldPath);
                    }
                    $extension = $file->getClientOriginalExtension();
                    $filename = $employee->employee_id . '_' . $type . '_' . time() . '.' . $extension;
                    $file->move(public_path('employee_documents'), $filename);
                    $path = 'employee_documents/' . $filename;
                    
                    if ($existing) {
                        $existing->update(['file_path' => $path, 'uploaded_at' => now(), 'verified' => false]);
                    } else {
                        EmployeeDocument::create([
                            'employee_id' => $employee->id, 'document_type' => $type,
                            'file_path' => $path, 'uploaded_at' => now(), 'verified' => false,
                        ]);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Employee updated successfully',
                'data'    => $employee->load(['personalDetail', 'addresses', 'bankDetails', 'documents']),
            ], 200);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // ===================== DESTROY =====================

    public function destroy(Request $request, $id)
    {
        DB::beginTransaction();
        try {
            $admin    = $this->getAdmin($request);
            if ($admin instanceof Employee && (int) $id !== (int) $admin->id) {
                DB::rollBack();
                return response()->json(['status' => 'error', 'message' => 'Forbidden: employees can only delete their own profile'], 403);
            }
            $employee = Employee::forAdmin($admin)->findOrFail($id);

            foreach ($employee->addresses()->get()    as $row) $row->delete();
            foreach ($employee->documents()->get()    as $row) $row->delete();
            foreach ($employee->leaveBalances()->get() as $row) $row->delete();
            foreach ($employee->attendance()->get()    as $row) $row->delete();
            foreach ($employee->leaveRequests()->get() as $row) $row->delete();
            foreach ($employee->salaries()->get()      as $row) $row->delete();

            if ($employee->salaryStructure) $employee->salaryStructure->delete();
            if ($employee->personalDetail)  $employee->personalDetail->delete();

            $suffix = '__deleted_' . $employee->id . '_' . time();
            $email  = (string) ($employee->email ?? '');
            if (str_contains($email, '@')) {
                [$local, $domain] = explode('@', $email, 2);
                $email = $local . $suffix . '@' . $domain;
            } elseif ($email !== '') {
                $email = $email . $suffix;
            }
            $employee->update(['email' => $email ?: null]);

            $employee->delete();

            DB::commit();
            return response()->json(['status' => 'success', 'message' => 'Employee deleted successfully'], 200);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json(['status' => 'error', 'message' => 'Employee deletion failed'], 500);
        }
    }
}
