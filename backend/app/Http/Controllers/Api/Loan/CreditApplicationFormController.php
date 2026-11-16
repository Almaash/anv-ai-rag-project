<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\Loan\CreditApplicationForm;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreditApplicationFormController extends Controller
{
    public function store(Request $request)
    {
        try {
            // Handle JSON string inputs from FormData (common in React/Next.js)
            if ($request->has('income_sources') && is_string($request->income_sources)) {
                $request->merge(['income_sources' => json_decode($request->income_sources, true)]);
            }
            if ($request->has('expense_details') && is_string($request->expense_details)) {
                $request->merge(['expense_details' => json_decode($request->expense_details, true)]);
            }
            if ($request->has('obligation_rows') && is_string($request->obligation_rows)) {
                $request->merge(['obligation_rows' => json_decode($request->obligation_rows, true)]);
            }
            if ($request->has('partners') && is_string($request->partners)) {
                $request->merge(['partners' => json_decode($request->partners, true)]);
            }
            if ($request->has('products') && is_string($request->products)) {
                $request->merge(['products' => json_decode($request->products, true)]);
            }

            $validatedData = $request->validate([
                'customer_unique_id' => 'required|string|exists:loan_customers,customer_unique_id',
                'enrollment_number'  => 'nullable|string|exists:customer_enrollments,enrollment_number',
                'agent_unique_id' => 'nullable|string|exists:loan_agents,agent_unique_id',
                'credit_mode' => 'required|string|in:product,cash',
                'credit_applied_for' => 'required|numeric',
                'down_payment' => 'nullable|numeric',
                'discount' => 'nullable|numeric',
                'products' => 'nullable|array',
                'frequency' => 'required|string',
                'tenure_option' => 'required|string',
                'repayment_day' => 'nullable|string',

                // Household Income
                'applicant_type' => 'nullable|string',
                'applicant_income' => 'nullable|numeric',
                'income_sources' => 'nullable|array',
                'other_sources_income' => 'nullable|numeric',
                'family_dependents' => 'nullable|integer',
                'total_income_yearly' => 'nullable|numeric',

                // Expenses
                'expense_details' => 'nullable|array',
                'travel_expense_monthly' => 'nullable|numeric',
                'other_obligations_monthly' => 'nullable|numeric',
                'total_monthly_expenses' => 'nullable|numeric',
                'total_yearly_expenses' => 'nullable|numeric',

                // Obligations
                'obligation_rows' => 'nullable|array',
                'total_obligation_amount' => 'nullable|numeric',
                'total_installment_amount' => 'nullable|numeric',

                // Net Surplus
                'net_surplus' => 'nullable|numeric',

                // Business Details
                'business_type' => 'nullable|string',
                'business_nature' => 'nullable|string',
                'entitled' => 'nullable|string',
                'business_address' => 'nullable|string',
                'business_ownership' => 'nullable|string',
                'business_vintage' => 'nullable|string',
                'partners' => 'nullable|array',
                'reference1_name' => 'nullable|string',
                'reference1_contact' => 'nullable|digits:10',
                'reference1_address' => 'nullable|string',
                'reference2_name' => 'nullable|string',
                'reference2_contact' => 'nullable|digits:10',
                'reference2_address' => 'nullable|string',

                // Bank Details
                'bank_first_name' => 'nullable|string',
                'bank_middle_name' => 'nullable|string',
                'bank_last_name' => 'nullable|string',
                'bank_name' => 'nullable|string',
                'account_number' => 'nullable|string',
                'ifsc_code' => 'nullable|string',

                // File fields
                'income_proof' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:6144',
                'business_photo' => 'nullable|file|mimes:jpeg,png,jpg|max:6144',
                'business_proof' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:6144',
                'passbook_image' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:6144',
            ]);

            $destinationPath = 'loan_caf_documents';
            $uploadPath = public_path($destinationPath);
            if (!is_dir($uploadPath)) {
                mkdir($uploadPath, 0755, true);
            }

            $filePaths = [];
            $filesToProcess = [
                'income_proof' => 'income_proof_name',
                'business_photo' => 'business_photo_name',
                'business_proof' => 'business_proof_name',
                'passbook_image' => 'passbook_image'
            ];

            foreach ($filesToProcess as $requestKey => $dbColumn) {
                if ($request->hasFile($requestKey)) {
                    $file = $request->file($requestKey);
                    $filename = time() . '_' . $requestKey . '_' . $file->getClientOriginalName();
                    $file->move($uploadPath, $filename);
                    $filePaths[$dbColumn] = $destinationPath . '/' . $filename;
                }
            }

            // Auth context — prefer request params, fallback to auth user
            $user        = auth()->user();
            $cmsAdminId  = $request->input('cms_admin_id') ?: ($user->user_id ?? $user->cms_admin ?? $user->id);
            $branchId    = $request->input('branch_id')    ?: ($user->branch  ?? $user->branch_id ?? null);

            // Generate unique loan_application_id
            $lastApp = CreditApplicationForm::withoutGlobalScope('notDeleted')
                ->orderByRaw('CAST(SUBSTRING(loan_application_id, 5) AS UNSIGNED) DESC')
                ->first();
            $nextId = $lastApp ? ((int) str_replace('CAF-', '', $lastApp->loan_application_id)) + 1 : 1001;
            // Ensure uniqueness in case of gaps
            while (CreditApplicationForm::withoutGlobalScope('notDeleted')->where('loan_application_id', 'CAF-' . $nextId)->exists()) {
                $nextId++;
            }
            $loanApplicationId = 'CAF-' . $nextId;

            // Sanitize numeric fields - convert empty strings to null
            $numericFields = [
                'applicant_income',
                'other_sources_income',
                'family_dependents',
                'total_income_yearly',
                'travel_expense_monthly',
                'other_obligations_monthly',
                'total_monthly_expenses',
                'total_yearly_expenses',
                'total_obligation_amount',
                'total_installment_amount',
                'net_surplus',
                'down_payment',
                'discount'
            ];

            foreach ($numericFields as $field) {
                if (isset($validatedData[$field]) && $validatedData[$field] === '') {
                    $validatedData[$field] = null;
                }
            }

            // If enrollment_number provided, it must belong to a verified enrollment
            if (!empty($validatedData['enrollment_number'])) {
                $enrollmentOk = \App\Models\Loan\CustomerEnrollment::where('enrollment_number', $validatedData['enrollment_number'])
                    ->where('customer_unique_id', $validatedData['customer_unique_id'])
                    ->where('verification_status', 'verified')
                    ->exists();
                if (!$enrollmentOk) {
                    return response()->json([
                        'success' => false,
                        'message' => 'The provided enrollment is not verified or does not belong to this customer.',
                    ], 422);
                }
            }

            // Prepare data for creation
            $createData = array_merge($validatedData, $filePaths, [
                'loan_application_id' => $loanApplicationId,
                'branch_id' => $branchId,
                'cms_admin_id' => $cmsAdminId,
                'agent_unique_id' => $request->input('agent_unique_id'),
                'status' => 'field_executive',
                'is_verified' => false,
                'status_history' => [
                    [
                        'status' => 'created',
                        'timestamp' => now()->toDateTimeString(),
                        'reason' => 'CAF application created/submitted',
                        'performed_by' => auth()->user()->user_id ?? auth()->id() ?? 'system'
                    ],
                    [
                        'status' => 'field_executive',
                        'timestamp' => now()->toDateTimeString(),
                        'reason' => 'CAF application submitted for processing'
                    ]
                ]
            ]);

            // Null out business and bank fields for product credit mode
            if ($request->input('credit_mode') === 'product') {
                $nullFields = [
                    'business_type',
                    'business_nature',
                    'entitled',
                    'business_address',
                    'business_ownership',
                    'business_vintage',
                    'partners',
                    'reference1_name',
                    'reference1_contact',
                    'reference1_address',
                    'reference2_name',
                    'reference2_contact',
                    'reference2_address',
                    'bank_first_name',
                    'bank_middle_name',
                    'bank_last_name',
                    'bank_name',
                    'account_number',
                    'ifsc_code',
                    'business_photo_name',
                    'business_proof_name',
                    'passbook_image',
                ];
                foreach ($nullFields as $field) {
                    $createData[$field] = null;
                }
            }

            $caf = CreditApplicationForm::create($createData);

            return response()->json([
                'success' => true,
                'message' => 'Credit Application Form submitted successfully',
                'data' => $caf
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error storing CAF: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit CAF: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            // Handle JSON string inputs from FormData
            if ($request->has('income_sources') && is_string($request->income_sources)) {
                $request->merge(['income_sources' => json_decode($request->income_sources, true)]);
            }
            if ($request->has('expense_details') && is_string($request->expense_details)) {
                $request->merge(['expense_details' => json_decode($request->expense_details, true)]);
            }
            if ($request->has('obligation_rows') && is_string($request->obligation_rows)) {
                $request->merge(['obligation_rows' => json_decode($request->obligation_rows, true)]);
            }
            if ($request->has('partners') && is_string($request->partners)) {
                $request->merge(['partners' => json_decode($request->partners, true)]);
            }
            $validatedData = $request->validate([
                'customer_unique_id' => 'sometimes|required|string|exists:loan_customers,customer_unique_id',
                'credit_mode' => 'sometimes|required|string|in:product,cash',
                'credit_applied_for' => 'sometimes|required|numeric',
                'down_payment' => 'nullable|numeric',
                'discount' => 'nullable|numeric',
                'products' => 'nullable|array',
                'frequency' => 'sometimes|required|string',
                'tenure_option' => 'sometimes|required|string',
                'repayment_day' => 'nullable|string',

                // Household Income
                'applicant_type' => 'nullable|string',
                'applicant_income' => 'nullable|numeric',
                'income_sources' => 'nullable|array',
                'other_sources_income' => 'nullable|numeric',
                'family_dependents' => 'nullable|integer',
                'total_income_yearly' => 'nullable|numeric',

                // Expenses
                'expense_details' => 'nullable|array',
                'travel_expense_monthly' => 'nullable|numeric',
                'other_obligations_monthly' => 'nullable|numeric',
                'total_monthly_expenses' => 'nullable|numeric',
                'total_yearly_expenses' => 'nullable|numeric',

                // Obligations
                'obligation_rows' => 'nullable|array',
                'total_obligation_amount' => 'nullable|numeric',
                'total_installment_amount' => 'nullable|numeric',

                // Net Surplus
                'net_surplus' => 'nullable|numeric',

                // Business Details
                'business_type' => 'nullable|string',
                'business_nature' => 'nullable|string',
                'entitled' => 'nullable|string',
                'business_address' => 'nullable|string',
                'business_ownership' => 'nullable|string',
                'business_vintage' => 'nullable|string',
                'partners' => 'nullable|array',
                'reference1_name' => 'nullable|string',
                'reference1_contact' => 'nullable|digits:10',
                'reference1_address' => 'nullable|string',
                'reference2_name' => 'nullable|string',
                'reference2_contact' => 'nullable|digits:10',
                'reference2_address' => 'nullable|string',

                // Bank Details
                'bank_first_name' => 'nullable|string',
                'bank_middle_name' => 'nullable|string',
                'bank_last_name' => 'nullable|string',
                'bank_name' => 'nullable|string',
                'account_number' => 'nullable|string',
                'ifsc_code' => 'nullable|string',

                // File fields
                'income_proof' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:6144',
                'business_photo' => 'nullable|file|mimes:jpeg,png,jpg|max:6144',
                'business_proof' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:6144',
                'passbook_image' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:6144',
            ]);

            $caf = CreditApplicationForm::where('loan_application_id', $id)->firstOrFail();

            $destinationPath = 'loan_caf_documents';
            $uploadPath = public_path($destinationPath);

            $filePaths = [];
            $filesToProcess = [
                'income_proof' => 'income_proof_name',
                'business_photo' => 'business_photo_name',
                'business_proof' => 'business_proof_name',
                'passbook_image' => 'passbook_image'
            ];

            foreach ($filesToProcess as $requestKey => $dbColumn) {
                if ($request->hasFile($requestKey)) {
                    $file = $request->file($requestKey);
                    $filename = time() . '_' . $requestKey . '_' . $file->getClientOriginalName();
                    $file->move($uploadPath, $filename);
                    $filePaths[$dbColumn] = $destinationPath . '/' . $filename;
                }
            }

            // Sanitize numeric fields - convert empty strings to null
            $numericFields = [
                'applicant_income',
                'other_sources_income',
                'family_dependents',
                'total_income_yearly',
                'travel_expense_monthly',
                'other_obligations_monthly',
                'total_monthly_expenses',
                'total_yearly_expenses',
                'total_obligation_amount',
                'total_installment_amount',
                'net_surplus',
                'down_payment',
                'discount'
            ];

            foreach ($numericFields as $field) {
                if (isset($validatedData[$field]) && $validatedData[$field] === '') {
                    $validatedData[$field] = null;
                }
            }

            $updateData = array_merge($validatedData, $filePaths);

            // Null out business and bank fields for product credit mode
            $creditMode = $request->input('credit_mode') ?? $caf->credit_mode;
            if ($creditMode === 'product') {
                $nullFields = [
                    'business_type',
                    'business_nature',
                    'entitled',
                    'business_address',
                    'business_ownership',
                    'business_vintage',
                    'partners',
                    'reference1_name',
                    'reference1_contact',
                    'reference1_address',
                    'reference2_name',
                    'reference2_contact',
                    'reference2_address',
                    'bank_first_name',
                    'bank_middle_name',
                    'bank_last_name',
                    'bank_name',
                    'account_number',
                    'ifsc_code',
                    'business_photo_name',
                    'business_proof_name',
                    'passbook_image',
                ];
                foreach ($nullFields as $field) {
                    $updateData[$field] = null;
                }
            }

            // Add to history
            $history = $caf->status_history ?? [];
            $history[] = [
                'status' => 'updated',
                'timestamp' => now()->toDateTimeString(),
                'reason' => 'CAF application updated',
                'updated_by' => auth()->user()->user_id ?? auth()->id() ?? 'system'
            ];
            $updateData['status_history'] = $history;

            $caf->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Credit Application Form updated successfully',
                'data' => $caf
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating CAF: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update CAF: ' . $e->getMessage()
            ], 500);
        }
    }

    public function index(Request $request)
    {
        try {
            $query = CreditApplicationForm::with(['customer:customer_unique_id,first_name,last_name,email,contact_number_1'])
                ->select([
                    'id',
                    'loan_application_id',
                    'customer_unique_id',
                    'branch_id',
                    'cms_admin_id',
                    'agent_unique_id',
                    'credit_mode',
                    'credit_applied_for',
                    'status',
                    'is_verified',
                    'business_type',
                    'business_nature',
                    'net_surplus',
                    'created_at',
                    'updated_at'
                ]);

            // Apply filters — explicit request params take priority
            if ($request->filled('branch_id')) $query->where('branch_id', $request->branch_id);
            // user_id maps to cms_admin_id; only apply if records actually exist for it
            if ($request->filled('user_id')) {
                $hasRecords = CreditApplicationForm::where('cms_admin_id', $request->user_id)->exists();
                if ($hasRecords) $query->where('cms_admin_id', $request->user_id);
            } elseif ($request->filled('cms_admin_id')) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            // Search
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('loan_application_id', 'like', "%{$search}%")
                        ->orWhere('customer_unique_id', 'like', "%{$search}%")
                        ->orWhere('credit_applied_for', 'like', "%{$search}%")
                        ->orWhere('business_type', 'like', "%{$search}%");
                });
            }
            if ($request->filled('customer_unique_id')) $query->where('customer_unique_id', $request->customer_unique_id);
            if ($request->filled('status'))              $query->where('status', $request->status);
            if ($request->filled('agent_unique_id'))     $query->where('agent_unique_id', $request->agent_unique_id);
            if ($request->filled('credit_mode'))         $query->where('credit_mode', $request->credit_mode);
            if ($request->filled('is_verified'))    $query->where('is_verified',   filter_var($request->is_verified, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $request->boolean('is_verified'));
            if ($request->filled('is_pd_created'))  $query->where('is_pd_created', filter_var($request->is_pd_created, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $request->boolean('is_pd_created'));
            if ($request->has('is_delete_requested') && $request->is_delete_requested !== '') $query->where('is_delete_requested', filter_var($request->is_delete_requested, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $request->boolean('is_delete_requested'));
            if ($request->filled('min_credit_amount'))   $query->where('credit_applied_for', '>=', $request->min_credit_amount);
            if ($request->filled('max_credit_amount'))   $query->where('credit_applied_for', '<=', $request->max_credit_amount);
            if ($request->filled('from_date'))           $query->whereDate('created_at', '>=', $request->from_date);
            if ($request->filled('to_date'))             $query->whereDate('created_at', '<=', $request->to_date);

            $perPage = $request->get('per_page', 10);
            $cafs    = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'success'    => true,
                'message'    => 'CAFs retrieved successfully',
                'data'       => $cafs->items(),
                'pagination' => [
                    'current_page' => $cafs->currentPage(),
                    'per_page'     => $cafs->perPage(),
                    'total'        => $cafs->total(),
                    'last_page'    => $cafs->lastPage(),
                    'from'         => $cafs->firstItem(),
                    'to'           => $cafs->lastItem(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching CAFs: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all(),
                'sql_error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve CAFs: ' . $e->getMessage(),
                'error_details' => $e->getMessage(),
                'debug_info' => [
                    'filters_applied' => [
                        'search' => $request->search,
                        'branch_id' => $request->branch_id,
                        'cms_admin_id' => $request->cms_admin_id
                    ]
                ]
            ], 500);
        }
    }

    /**
     * Store and verify the PD (Personal Discussion) / Credit Application Verification.
     */
    public function storePD(Request $request)
    {
        try {
            // Handle both file uploads and string inputs for backward compatibility
            $validationRules = [
                'loan_application_id'        => 'required|string',
                'customer_unique_id'          => 'required|string',
                'pd_information'              => 'required',
                'obligation_details'          => 'nullable',
                'verification_status'         => 'required|string|in:verified,rejected',
                'verification_notes'          => 'nullable|string|max:500',
            ];

            // branch_id and cms_admin_id — prefer request params, fallback to auth
            $user       = auth()->user();
            $branchId   = $request->input('branch_id')    ?: ($user->branch ?? $user->branch_id ?? null);
            $cmsAdminId = $request->input('cms_admin_id') ?: ($user->user_id ?? $user->cms_admin ?? $user->id);

            // Check if files are being uploaded or strings are provided
            if ($request->hasFile('house_verification_photo')) {
                $validationRules['house_verification_photo'] = 'required|file|mimes:jpeg,png,jpg|max:6144';
            } else {
                $validationRules['house_verification_photo'] = 'required|string';
            }

            if ($request->hasFile('business_verification_photo')) {
                $validationRules['business_verification_photo'] = 'required|file|mimes:jpeg,png,jpg|max:6144';
            } else {
                $validationRules['business_verification_photo'] = 'required|string';
            }

            $validatedData = $request->validate($validationRules);

            // Handle files or base64 data
            $destinationPath = 'pd_information_document';
            $uploadPath = public_path($destinationPath);
            if (!is_dir($uploadPath)) {
                mkdir($uploadPath, 0755, true);
            }

            $housePhotoPath = null;
            $businessPhotoPath = null;

            // Helper function to process photo (file, base64, or string)
            $processPhoto = function ($input, $type) use ($uploadPath, $destinationPath) {
                if (request()->hasFile($type)) {
                    $file = request()->file($type);
                    $filename = time() . '_' . $type . '_' . $file->getClientOriginalName();
                    $file->move($uploadPath, $filename);
                    Log::info("$type file uploaded: " . $filename);
                    return $destinationPath . '/' . $filename;
                }

                if (is_string($input) && preg_match('/^data:image\/(\w+);base64,/', $input, $type_match)) {
                    $image_data = substr($input, strpos($input, ',') + 1);
                    $extension = strtolower($type_match[1]);
                    $filename = time() . '_' . $type . '.' . $extension;
                    file_put_contents($uploadPath . '/' . $filename, base64_decode($image_data));
                    Log::info("$type base64 saved: " . $filename);
                    return $destinationPath . '/' . $filename;
                }

                if (is_string($input) && !empty($input)) {
                    // It's already a filename or path
                    return (strpos($input, '/') === false) ? $destinationPath . '/' . $input : $input;
                }

                return null;
            };

            $housePhotoPath = $processPhoto($request->input('house_verification_photo'), 'house_verification_photo');
            $businessPhotoPath = $processPhoto($request->input('business_verification_photo'), 'business_verification_photo');

            // Parse pd_information if it's a string (from FormData)
            $pdInformation = $validatedData['pd_information'];
            if (is_string($pdInformation)) {
                $pdInformation = json_decode($pdInformation, true);
            }

            // Parse obligation_details if it's a string (from FormData)
            $obligationDetails = $request->input('obligation_details');
            if (is_string($obligationDetails)) {
                $obligationDetails = json_decode($obligationDetails, true);
            }

            // Generate unique pd_application_id — include soft-deleted records to avoid duplicates
            $lastPd = \App\Models\Loan\PdInformation::withoutGlobalScope('not_deleted')
                ->orderByRaw('CAST(SUBSTRING(pd_application_id, 4) AS UNSIGNED) DESC')
                ->first();
            $nextId = $lastPd ? ((int) str_replace('PD-', '', $lastPd->pd_application_id)) + 1 : 1001;
            while (\App\Models\Loan\PdInformation::withoutGlobalScope('not_deleted')->where('pd_application_id', 'PD-' . $nextId)->exists()) {
                $nextId++;
            }
            $pdApplicationId = 'PD-' . $nextId;

            $adminId = $user->user_id ?? $user->id ?? 'system';

            // Create the PD record
            $pdRecord = \App\Models\Loan\PdInformation::create([
                'pd_application_id'           => $pdApplicationId,
                'loan_application_id'         => $validatedData['loan_application_id'],
                'customer_unique_id'          => $validatedData['customer_unique_id'],
                'branch_id'                   => $branchId,
                'cms_admin_id'                => $cmsAdminId,
                'house_verification_photo' => $housePhotoPath,
                'business_verification_photo' => $businessPhotoPath,
                'pd_information' => $pdInformation,
                'obligation_details' => $obligationDetails,
                'verification_status' => $validatedData['verification_status'],
                'verification_notes' => $validatedData['verification_notes'],
                'status' => $validatedData['verification_status'] === 'verified' ? 'approved' : 'rejected',
                'is_verified' => $validatedData['verification_status'] === 'verified',
                'status_history' => [
                    [
                        'status' => $validatedData['verification_status'],
                        'timestamp' => now()->toDateTimeString(),
                        'reason' => $validatedData['verification_notes'] ?? 'PD Information Verified and Submitted',
                        'performed_by' => $adminId
                    ]
                ]
            ]);

            // Update is_pd_created in CreditApplicationForm
            CreditApplicationForm::where('loan_application_id', $validatedData['loan_application_id'])
                ->update(['is_pd_created' => true]);

            // Add full URLs for images in response
            $pdRecord->house_verification_photo_url = $housePhotoPath ? url($housePhotoPath) : null;
            $pdRecord->business_verification_photo_url = $businessPhotoPath ? url($businessPhotoPath) : null;

            return response()->json([
                'success' => true,
                'message' => 'PD Information ' . $validatedData['verification_status'] . ' successfully',
                'data' => $pdRecord
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error storing PD verification: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to save PD verification: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all PD records with filters.
     */
    public function getAllPD(Request $request)
    {
        try {
            $query = \App\Models\Loan\PdInformation::with([
                'customer:customer_unique_id,first_name,last_name,email,contact_number_1',
                'loanApplication:loan_application_id,customer_unique_id,branch_id,cms_admin_id,agent_unique_id,credit_mode,credit_applied_for,products,frequency,tenure_option,repayment_day,applicant_type,applicant_income,income_sources,other_sources_income,income_proof_name,family_dependents,total_income_yearly,expense_details,travel_expense_monthly,other_obligations_monthly,total_monthly_expenses,total_yearly_expenses,obligation_rows,total_obligation_amount,total_installment_amount,net_surplus,down_payment,business_type,business_nature,entitled,business_address,business_ownership,business_vintage,business_photo_name,business_proof_name,reference1_name,reference1_contact,reference1_address,reference2_name,reference2_contact,reference2_address,partners,bank_first_name,bank_middle_name,bank_last_name,bank_name,account_number,ifsc_code,passbook_image,status,is_verified,is_pd_created,is_cam_created,created_at,updated_at'
            ])
                ->select([
                    'id',
                    'pd_application_id',
                    'loan_application_id',
                    'customer_unique_id',
                    'branch_id',
                    'cms_admin_id',
                    'house_verification_photo',
                    'business_verification_photo',
                    'verification_status',
                    'verification_notes',
                    'status',
                    'is_verified',
                    'is_cam_created',
                    'created_at',
                    'updated_at'
                ])
                ->where('is_deleted', false);

            // Search filter
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('pd_application_id', 'like', '%' . $search . '%')
                        ->orWhere('loan_application_id', 'like', '%' . $search . '%')
                        ->orWhere('customer_unique_id', 'like', '%' . $search . '%')
                        ->orWhere('verification_notes', 'like', '%' . $search . '%');
                });
            }

            // Filter by customer
            if ($request->has('customer_unique_id') && !empty($request->customer_unique_id)) {
                $query->where('customer_unique_id', $request->customer_unique_id);
            }

            // Filter by loan application
            if ($request->has('loan_application_id') && !empty($request->loan_application_id)) {
                $query->where('loan_application_id', $request->loan_application_id);
            }

            // Filter by PD application ID
            if ($request->has('pd_application_id') && !empty($request->pd_application_id)) {
                $query->where('pd_application_id', $request->pd_application_id);
            }

            // Filter by branch_id
            if ($request->has('branch_id') && !empty($request->branch_id)) {
                $branchId = $request->branch_id;
                $query->where(function ($q) use ($branchId) {
                    $q->where('branch_id', $branchId)
                        ->orWhere('branch_id', 'BR' . str_pad($branchId, 4, '0', STR_PAD_LEFT));
                });
            }

            // Filter by cms_admin_id
            if ($request->has('cms_admin_id') && !empty($request->cms_admin_id)) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            // Filter by verification status
            if ($request->has('verification_status') && !empty($request->verification_status)) {
                $query->where('verification_status', $request->verification_status);
            }

            // Filter by status
            if ($request->has('status') && !empty($request->status)) {
                $query->where('status', $request->status);
            }

            // Filter by is_verified
            if ($request->has('is_verified') && $request->is_verified !== '') {
                $query->where('is_verified', $request->boolean('is_verified'));
            }

            // Filter by is_pd_created
            if ($request->has('is_pd_created') && $request->is_pd_created !== '') {
                $query->where('is_pd_created', $request->boolean('is_pd_created'));
            }

            // Filter by is_cam_created
            if ($request->has('is_cam_created') && $request->is_cam_created !== '') {
                $query->where('is_cam_created', $request->boolean('is_cam_created'));
            }

            // Filter by date range
            if ($request->has('from_date') && !empty($request->from_date)) {
                $query->whereDate('created_at', '>=', $request->from_date);
            }
            if ($request->has('to_date') && !empty($request->to_date)) {
                $query->whereDate('created_at', '<=', $request->to_date);
            }

            // Filter by updated date range
            if ($request->has('updated_from_date') && !empty($request->updated_from_date)) {
                $query->whereDate('updated_at', '>=', $request->updated_from_date);
            }
            if ($request->has('updated_to_date') && !empty($request->updated_to_date)) {
                $query->whereDate('updated_at', '<=', $request->updated_to_date);
            }

            $perPage = $request->get('per_page', 10);
            $pdRecords = $query->orderBy('created_at', 'desc')->paginate($perPage);

            // Add image URLs to each record
            $pdRecords->getCollection()->transform(function ($record) {
                $record->house_verification_photo_url = $record->house_verification_photo ? url($record->house_verification_photo) : null;
                $record->business_verification_photo_url = $record->business_verification_photo ? url($record->business_verification_photo) : null;
                return $record;
            });

            return response()->json([
                'success' => true,
                'message' => 'PD records retrieved successfully',
                'data' => $pdRecords->items(),
                'pagination' => [
                    'current_page' => $pdRecords->currentPage(),
                    'per_page' => $pdRecords->perPage(),
                    'total' => $pdRecords->total(),
                    'last_page' => $pdRecords->lastPage(),
                    'from' => $pdRecords->firstItem(),
                    'to' => $pdRecords->lastItem()
                ],
                'filters' => [
                    'search' => $request->search,
                    'customer_unique_id' => $request->customer_unique_id,
                    'loan_application_id' => $request->loan_application_id,
                    'pd_application_id' => $request->pd_application_id,
                    'branch_id' => $request->branch_id,
                    'cms_admin_id' => $request->cms_admin_id,
                    'verification_status' => $request->verification_status,
                    'status' => $request->status,
                    'is_verified' => $request->is_verified,
                    'is_pd_created' => $request->is_pd_created,
                    'is_cam_created' => $request->is_cam_created,
                    'from_date' => $request->from_date,
                    'to_date' => $request->to_date,
                    'updated_from_date' => $request->updated_from_date,
                    'updated_to_date' => $request->updated_to_date
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching PD records: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve PD records: ' . $e->getMessage(),
                'error_details' => $e->getMessage(),
                'debug_info' => [
                    'filters_applied' => [
                        'search' => $request->search,
                        'branch_id' => $request->branch_id,
                        'cms_admin_id' => $request->cms_admin_id,
                        'verification_status' => $request->verification_status
                    ]
                ]
            ], 500);
        }
    }

    /**
     * Get all PD records where associated CAF has credit_mode = 'cash'.
     */
    public function getAllCashPD(Request $request)
    {
        try {
            $query = \App\Models\Loan\PdInformation::with([
                'customer:customer_unique_id,first_name,last_name,email,contact_number_1',
                'loanApplication' // Load complete CAF details
            ])
                ->select([
                    'id',
                    'pd_application_id',
                    'loan_application_id',
                    'customer_unique_id',
                    'branch_id',
                    'cms_admin_id',
                    'house_verification_photo',
                    'business_verification_photo',
                    'verification_status',
                    'verification_notes',
                    'status',
                    'is_verified',
                    'is_cam_created',
                    'created_at',
                    'updated_at'
                ])
                ->where('is_deleted', false)
                ->whereHas('loanApplication', function ($q) {
                    $q->where('credit_mode', 'cash');
                });

            // Search filter
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('pd_application_id', 'like', '%' . $search . '%')
                        ->orWhere('loan_application_id', 'like', '%' . $search . '%')
                        ->orWhere('customer_unique_id', 'like', '%' . $search . '%')
                        ->orWhere('verification_notes', 'like', '%' . $search . '%');
                });
            }

            // Filter by customer
            if ($request->has('customer_unique_id') && !empty($request->customer_unique_id)) {
                $query->where('customer_unique_id', $request->customer_unique_id);
            }

            // Filter by loan application
            if ($request->has('loan_application_id') && !empty($request->loan_application_id)) {
                $query->where('loan_application_id', $request->loan_application_id);
            }

            // Filter by PD application ID
            if ($request->has('pd_application_id') && !empty($request->pd_application_id)) {
                $query->where('pd_application_id', $request->pd_application_id);
            }

            // Filter by branch_id
            if ($request->has('branch_id') && !empty($request->branch_id)) {
                $branchId = $request->branch_id;
                $query->where(function ($q) use ($branchId) {
                    $q->where('branch_id', $branchId)
                        ->orWhere('branch_id', 'BR' . str_pad($branchId, 4, '0', STR_PAD_LEFT));
                });
            }

            // Filter by cms_admin_id
            if ($request->has('cms_admin_id') && !empty($request->cms_admin_id)) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            // Filter by verification status
            if ($request->has('verification_status') && !empty($request->verification_status)) {
                $query->where('verification_status', $request->verification_status);
            }

            // Filter by status
            if ($request->has('status') && !empty($request->status)) {
                $query->where('status', $request->status);
            }

            // Filter by is_verified
            if ($request->has('is_verified') && $request->is_verified !== '') {
                $query->where('is_verified', $request->boolean('is_verified'));
            }

            // Filter by is_pd_created
            if ($request->has('is_pd_created') && $request->is_pd_created !== '') {
                $query->where('is_pd_created', $request->boolean('is_pd_created'));
            }

            // Filter by is_cam_created
            if ($request->has('is_cam_created') && $request->is_cam_created !== '') {
                $query->where('is_cam_created', $request->boolean('is_cam_created'));
            }

            // Filter by date range
            if ($request->has('from_date') && !empty($request->from_date)) {
                $query->whereDate('created_at', '>=', $request->from_date);
            }
            if ($request->has('to_date') && !empty($request->to_date)) {
                $query->whereDate('created_at', '<=', $request->to_date);
            }

            // Filter by updated date range
            if ($request->has('updated_from_date') && !empty($request->updated_from_date)) {
                $query->whereDate('updated_at', '>=', $request->updated_from_date);
            }
            if ($request->has('updated_to_date') && !empty($request->updated_to_date)) {
                $query->whereDate('updated_at', '<=', $request->updated_to_date);
            }

            $perPage = $request->get('per_page', 10);
            $pdRecords = $query->orderBy('created_at', 'desc')->paginate($perPage);

            // Add image URLs to each record and enhance CAF data
            $pdRecords->getCollection()->transform(function ($record) {
                $record->house_verification_photo_url = $record->house_verification_photo ? url($record->house_verification_photo) : null;
                $record->business_verification_photo_url = $record->business_verification_photo ? url($record->business_verification_photo) : null;

                // Add CAF image URLs if CAF exists
                if ($record->loanApplication) {
                    $record->loanApplication->income_proof_url = $record->loanApplication->income_proof_name ? url($record->loanApplication->income_proof_name) : null;
                    $record->loanApplication->business_photo_url = $record->loanApplication->business_photo_name ? url($record->loanApplication->business_photo_name) : null;
                    $record->loanApplication->business_proof_url = $record->loanApplication->business_proof_name ? url($record->loanApplication->business_proof_name) : null;
                    $record->loanApplication->passbook_image_url = $record->loanApplication->passbook_image ? url($record->loanApplication->passbook_image) : null;
                }

                return $record;
            });

            return response()->json([
                'success' => true,
                'message' => 'PD records with CAF details retrieved successfully',
                'data' => $pdRecords->items(),
                'pagination' => [
                    'current_page' => $pdRecords->currentPage(),
                    'per_page' => $pdRecords->perPage(),
                    'total' => $pdRecords->total(),
                    'last_page' => $pdRecords->lastPage(),
                    'from' => $pdRecords->firstItem(),
                    'to' => $pdRecords->lastItem()
                ],
                'filters' => [
                    'search' => $request->search,
                    'customer_unique_id' => $request->customer_unique_id,
                    'loan_application_id' => $request->loan_application_id,
                    'pd_application_id' => $request->pd_application_id,
                    'branch_id' => $request->branch_id,
                    'cms_admin_id' => $request->cms_admin_id,
                    'verification_status' => $request->verification_status,
                    'status' => $request->status,
                    'is_verified' => $request->is_verified,
                    'is_pd_created' => $request->is_pd_created,
                    'is_cam_created' => $request->is_cam_created,
                    'from_date' => $request->from_date,
                    'to_date' => $request->to_date,
                    'updated_from_date' => $request->updated_from_date,
                    'updated_to_date' => $request->updated_to_date
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching cash PD records: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve cash PD records: ' . $e->getMessage(),
                'error_details' => $e->getMessage(),
                'debug_info' => [
                    'filters_applied' => [
                        'search' => $request->search,
                        'branch_id' => $request->branch_id,
                        'cms_admin_id' => $request->cms_admin_id,
                        'verification_status' => $request->verification_status
                    ]
                ]
            ], 500);
        }
    }

    /**
     * Get all PD records where associated CAF has credit_mode = 'product'.
     */
    public function getAllProductPD(Request $request)
    {
        try {
            $query = \App\Models\Loan\PdInformation::with([
                'customer:customer_unique_id,first_name,last_name,email,contact_number_1',
                'loanApplication' // Load complete CAF details
            ])
                ->select([
                    'id',
                    'pd_application_id',
                    'loan_application_id',
                    'customer_unique_id',
                    'branch_id',
                    'cms_admin_id',
                    'house_verification_photo',
                    'business_verification_photo',
                    'verification_status',
                    'verification_notes',
                    'status',
                    'is_verified',
                    'is_cam_created',
                    'is_disbursement_created',
                    'created_at',
                    'updated_at'
                ])
                ->where('is_deleted', false)
                ->whereHas('loanApplication', function ($q) {
                    $q->where('credit_mode', 'product');
                });

            // Search filter
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('pd_application_id', 'like', '%' . $search . '%')
                        ->orWhere('loan_application_id', 'like', '%' . $search . '%')
                        ->orWhere('customer_unique_id', 'like', '%' . $search . '%')
                        ->orWhere('verification_notes', 'like', '%' . $search . '%');
                });
            }

            // Filter by customer
            if ($request->has('customer_unique_id') && !empty($request->customer_unique_id)) {
                $query->where('customer_unique_id', $request->customer_unique_id);
            }

            // Filter by loan application
            if ($request->has('loan_application_id') && !empty($request->loan_application_id)) {
                $query->where('loan_application_id', $request->loan_application_id);
            }

            // Filter by PD application ID
            if ($request->has('pd_application_id') && !empty($request->pd_application_id)) {
                $query->where('pd_application_id', $request->pd_application_id);
            }

            // Filter by branch_id
            if ($request->has('branch_id') && !empty($request->branch_id)) {
                $branchId = $request->branch_id;
                $query->where(function ($q) use ($branchId) {
                    $q->where('branch_id', $branchId)
                        ->orWhere('branch_id', 'BR' . str_pad($branchId, 4, '0', STR_PAD_LEFT));
                });
            }

            // Filter by cms_admin_id
            if ($request->has('cms_admin_id') && !empty($request->cms_admin_id)) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            // Filter by verification status
            if ($request->has('verification_status') && !empty($request->verification_status)) {
                $query->where('verification_status', $request->verification_status);
            }

            // Filter by status
            if ($request->has('status') && !empty($request->status)) {
                $query->where('status', $request->status);
            }

            // Filter by is_verified
            if ($request->has('is_verified') && $request->is_verified !== '') {
                $query->where('is_verified', $request->boolean('is_verified'));
            }

            // Filter by is_pd_created
            if ($request->has('is_pd_created') && $request->is_pd_created !== '') {
                $query->where('is_pd_created', $request->boolean('is_pd_created'));
            }

            // Filter by is_cam_created
            if ($request->has('is_cam_created') && $request->is_cam_created !== '') {
                $query->where('is_cam_created', $request->boolean('is_cam_created'));
            }

            // Filter by is_disbursement_created
            if ($request->has('is_disbursement_created') && $request->is_disbursement_created !== '') {
                $query->where('is_disbursement_created', $request->boolean('is_disbursement_created'));
            }

            // Filter by date range
            if ($request->has('from_date') && !empty($request->from_date)) {
                $query->whereDate('created_at', '>=', $request->from_date);
            }
            if ($request->has('to_date') && !empty($request->to_date)) {
                $query->whereDate('created_at', '<=', $request->to_date);
            }

            // Filter by updated date range
            if ($request->has('updated_from_date') && !empty($request->updated_from_date)) {
                $query->whereDate('updated_at', '>=', $request->updated_from_date);
            }
            if ($request->has('updated_to_date') && !empty($request->updated_to_date)) {
                $query->whereDate('updated_at', '<=', $request->updated_to_date);
            }

            $perPage = $request->get('per_page', 10);
            $pdRecords = $query->orderBy('created_at', 'desc')->paginate($perPage);

            // Add image URLs to each record and enhance CAF data
            $pdRecords->getCollection()->transform(function ($record) {
                $record->house_verification_photo_url = $record->house_verification_photo ? url($record->house_verification_photo) : null;
                $record->business_verification_photo_url = $record->business_verification_photo ? url($record->business_verification_photo) : null;

                // Add CAF image URLs if CAF exists
                if ($record->loanApplication) {
                    $record->loanApplication->income_proof_url = $record->loanApplication->income_proof_name ? url($record->loanApplication->income_proof_name) : null;
                    $record->loanApplication->business_photo_url = $record->loanApplication->business_photo_name ? url($record->loanApplication->business_photo_name) : null;
                    $record->loanApplication->business_proof_url = $record->loanApplication->business_proof_name ? url($record->loanApplication->business_proof_name) : null;
                    $record->loanApplication->passbook_image_url = $record->loanApplication->passbook_image ? url($record->loanApplication->passbook_image) : null;
                }

                return $record;
            });

            return response()->json([
                'success' => true,
                'message' => 'Product PD records with CAF details retrieved successfully',
                'data' => $pdRecords->items(),
                'pagination' => [
                    'current_page' => $pdRecords->currentPage(),
                    'per_page' => $pdRecords->perPage(),
                    'total' => $pdRecords->total(),
                    'last_page' => $pdRecords->lastPage(),
                    'from' => $pdRecords->firstItem(),
                    'to' => $pdRecords->lastItem()
                ],
                'filters' => [
                    'search' => $request->search,
                    'customer_unique_id' => $request->customer_unique_id,
                    'loan_application_id' => $request->loan_application_id,
                    'pd_application_id' => $request->pd_application_id,
                    'branch_id' => $request->branch_id,
                    'cms_admin_id' => $request->cms_admin_id,
                    'verification_status' => $request->verification_status,
                    'status' => $request->status,
                    'is_verified' => $request->is_verified,
                    'is_pd_created' => $request->is_pd_created,
                    'is_cam_created' => $request->is_cam_created,
                    'is_disbursement_created' => $request->is_disbursement_created,
                    'from_date' => $request->from_date,
                    'to_date' => $request->to_date,
                    'updated_from_date' => $request->updated_from_date,
                    'updated_to_date' => $request->updated_to_date
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching product PD records: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve product PD records: ' . $e->getMessage(),
                'error_details' => $e->getMessage(),
                'debug_info' => [
                    'filters_applied' => [
                        'search' => $request->search,
                        'branch_id' => $request->branch_id,
                        'cms_admin_id' => $request->cms_admin_id,
                        'verification_status' => $request->verification_status
                    ]
                ]
            ], 500);
        }
    }

    /**
     * Get PD record by ID (supports both database ID and pd_application_id).
     */
    public function getPDById($id)
    {
        try {
            // Try to find by database ID first (if it's numeric)
            if (is_numeric($id)) {
                $pdRecord = \App\Models\Loan\PdInformation::where('id', $id)
                    ->where('is_deleted', false)
                    ->first();
            } else {
                // If not numeric, try to find by pd_application_id
                $pdRecord = \App\Models\Loan\PdInformation::where('pd_application_id', $id)
                    ->where('is_deleted', false)
                    ->first();
            }

            if (!$pdRecord) {
                return response()->json([
                    'success' => false,
                    'message' => 'PD record not found',
                    'error_details' => [
                        'searched_id' => $id,
                        'search_type' => is_numeric($id) ? 'database_id' : 'pd_application_id',
                        'suggestion' => is_numeric($id)
                            ? 'Use pd_application_id like PD-1001 or check if this database ID exists'
                            : 'Check if this PD application ID exists or use the database ID instead'
                    ]
                ], 404);
            }

            // Add full URLs for images
            $pdRecord->house_verification_photo_url = $pdRecord->house_verification_photo ? url($pdRecord->house_verification_photo) : null;
            $pdRecord->business_verification_photo_url = $pdRecord->business_verification_photo ? url($pdRecord->business_verification_photo) : null;

            return response()->json([
                'success' => true,
                'message' => 'PD record retrieved successfully',
                'data' => $pdRecord
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching PD record by ID: ' . $e->getMessage(), [
                'id' => $id,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve PD record',
                'error_details' => [
                    'error' => $e->getMessage(),
                    'searched_id' => $id
                ]
            ], 500);
        }
    }

    /**
     * Get PD record by pd_application_id.
     */
    public function getPDByApplicationId($pdApplicationId)
    {
        try {
            $pdRecord = \App\Models\Loan\PdInformation::where('pd_application_id', $pdApplicationId)
                ->where('is_deleted', false)
                ->first();

            if (!$pdRecord) {
                return response()->json([
                    'success' => false,
                    'message' => 'PD record not found',
                    'error_details' => [
                        'searched_pd_application_id' => $pdApplicationId,
                        'suggestion' => 'Check if this PD application ID exists or verify the format (e.g., PD-1001)'
                    ]
                ], 404);
            }

            // Add full URLs for images
            $pdRecord->house_verification_photo_url = $pdRecord->house_verification_photo ? url($pdRecord->house_verification_photo) : null;
            $pdRecord->business_verification_photo_url = $pdRecord->business_verification_photo ? url($pdRecord->business_verification_photo) : null;

            return response()->json([
                'success' => true,
                'message' => 'PD record retrieved successfully',
                'data' => $pdRecord
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching PD record by application ID: ' . $e->getMessage(), [
                'pd_application_id' => $pdApplicationId,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve PD record',
                'error_details' => [
                    'error' => $e->getMessage(),
                    'searched_pd_application_id' => $pdApplicationId
                ]
            ], 500);
        }
    }

    /**
     * Update PD record.
     */
    public function updatePD(Request $request, $id)
    {
        try {
            // Find the record by pd_application_id (e.g., PD-1002)
            $pdRecord = \App\Models\Loan\PdInformation::where('pd_application_id', $id)
                ->where('is_deleted', false)
                ->first();

            // If not found by application ID, attempt search by database ID if numeric
            if (!$pdRecord && is_numeric($id)) {
                $pdRecord = \App\Models\Loan\PdInformation::where('id', $id)
                    ->where('is_deleted', false)
                    ->first();
            }

            if (!$pdRecord) {
                return response()->json([
                    'success' => false,
                    'message' => 'PD record not found for update',
                    'error_details' => [
                        'searched_id' => $id,
                        'search_type' => is_numeric($id) ? 'potential_database_id' : 'pd_application_id'
                    ]
                ], 404);
            }

            // Process file uploads first
            $updateData = [];
            if ($request->hasFile('house_verification_photo')) {
                $file = $request->file('house_verification_photo');
                $filename = 'house_' . time() . '_' . $file->getClientOriginalName();
                $path = 'pd_information_document/' . $filename;
                $file->move(public_path('pd_information_document'), $filename);
                $updateData['house_verification_photo'] = $path;
            }

            if ($request->hasFile('business_verification_photo')) {
                $file = $request->file('business_verification_photo');
                $filename = 'business_' . time() . '_' . $file->getClientOriginalName();
                $path = 'pd_information_document/' . $filename;
                $file->move(public_path('pd_information_document'), $filename);
                $updateData['business_verification_photo'] = $path;
            }

            // Clean pd_information if it's sent as a JSON string (common with FormData/Update behavior)
            if ($request->has('pd_information') && is_string($request->input('pd_information'))) {
                $decoded = json_decode($request->input('pd_information'), true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $request->merge(['pd_information' => $decoded]);
                }
            }

            $validatedData = $request->validate([
                'pd_information' => 'nullable|array',
                'obligation_details' => 'nullable|string', // Support for the additional column
                'verification_status' => 'nullable|string|in:verified,rejected',
                'verification_notes' => 'nullable|string|max:500',
            ]);

            $updateData = array_merge($validatedData, $updateData);

            // Handle obligation_details specifically
            if (isset($updateData['obligation_details']) && is_string($updateData['obligation_details'])) {
                $updateData['obligation_details'] = json_decode($updateData['obligation_details'], true);
            }

            $user = auth()->user();
            $adminId = $user->user_id ?? $user->id ?? 'system';

            // Update status history if verification_status changed
            $statusHistory = $pdRecord->status_history ?? [];
            if (isset($updateData['verification_status']) && $updateData['verification_status'] !== $pdRecord->verification_status) {
                $statusHistory[] = [
                    'status' => $updateData['verification_status'],
                    'timestamp' => now()->toDateTimeString(),
                    'reason' => $updateData['verification_notes'] ?? 'PD record updated',
                    'performed_by' => $adminId
                ];
            }
            $updateData['status_history'] = $statusHistory;

            if (isset($updateData['verification_status'])) {
                $updateData['status'] = $updateData['verification_status'] === 'verified' ? 'approved' : 'rejected';
                $updateData['is_verified'] = $updateData['verification_status'] === 'verified';
            }

            $pdRecord->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'PD record updated successfully',
                'data' => $pdRecord->fresh()
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating PD record: ' . $e->getMessage(), [
                'id' => $id,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to update PD record',
                'error_details' => [
                    'error' => $e->getMessage(),
                    'searched_id' => $id
                ]
            ], 500);
        }
    }

    /**
     * Delete PD record (soft delete).
     */
    public function deletePD($id)
    {
        try {
            // Try to find by database ID first (if numeric), otherwise by pd_application_id
            if (is_numeric($id)) {
                $pdRecord = \App\Models\Loan\PdInformation::where('id', $id)
                    ->where('is_deleted', false)
                    ->first();
            } else {
                $pdRecord = \App\Models\Loan\PdInformation::where('pd_application_id', $id)
                    ->where('is_deleted', false)
                    ->first();
            }

            if (!$pdRecord) {
                return response()->json([
                    'success' => false,
                    'message' => 'PD record not found for deletion',
                    'error_details' => [
                        'searched_id' => $id,
                        'search_type' => is_numeric($id) ? 'database_id' : 'pd_application_id',
                        'note' => 'Record may already be deleted or does not exist'
                    ]
                ], 404);
            }

            $pdRecord->update(['is_deleted' => true]);

            return response()->json([
                'success' => true,
                'message' => 'PD record deleted successfully',
                'data' => [
                    'deleted_record_id' => $pdRecord->id,
                    'pd_application_id' => $pdRecord->pd_application_id
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting PD record: ' . $e->getMessage(), [
                'id' => $id,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete PD record',
                'error_details' => [
                    'error' => $e->getMessage(),
                    'searched_id' => $id
                ]
            ], 500);
        }
    }

    public function getVerifiedCafs(Request $request)
    {
        try {
            $user       = auth()->user();
            $authBranch = $user->branch ?? $user->branch_id ?? null;
            $authAdmin  = $user->user_id ?? $user->cms_admin ?? null;
            $isAdmin    = in_array($user->role ?? '', ['admin', 'super_admin'], true);

            $query = CreditApplicationForm::with(['customer:customer_unique_id,first_name,last_name,email,contact_number_1'])
                ->select([
                    'id',
                    'loan_application_id',
                    'customer_unique_id',
                    'branch_id',
                    'cms_admin_id',
                    'credit_mode',
                    'credit_applied_for',
                    'status',
                    'is_verified',
                    'is_pd_created',
                    'business_type',
                    'business_nature',
                    'net_surplus',
                    'created_at',
                    'updated_at'
                ])
                ->where('is_verified', true);

            if (!$isAdmin) {
                if ($authBranch) $query->where('branch_id',    $authBranch);
                if ($authAdmin)  $query->where('cms_admin_id', $authAdmin);
            }

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(fn($q) => $q->where('loan_application_id', 'like', "%{$s}%")
                    ->orWhere('customer_unique_id', 'like', "%{$s}%"));
            }
            if ($request->filled('customer_unique_id')) $query->where('customer_unique_id', $request->customer_unique_id);
            if ($request->filled('status'))             $query->where('status', $request->status);
            if ($request->filled('credit_mode'))        $query->where('credit_mode', $request->credit_mode);
            if ($request->has('is_pd_created') && $request->is_pd_created !== '') $query->where('is_pd_created', $request->boolean('is_pd_created'));
            if ($request->filled('from_date')) $query->whereDate('created_at', '>=', $request->from_date);
            if ($request->filled('to_date'))   $query->whereDate('created_at', '<=', $request->to_date);

            $cafs = $query->orderBy('updated_at', 'desc')->paginate($request->get('per_page', 10));

            return response()->json([
                'success' => true,
                'message' => 'Verified CAFs retrieved successfully',
                'data' => $cafs->items(),
                'pagination' => [
                    'current_page' => $cafs->currentPage(),
                    'per_page' => $cafs->perPage(),
                    'total' => $cafs->total(),
                    'last_page' => $cafs->lastPage(),
                    'from' => $cafs->firstItem(),
                    'to' => $cafs->lastItem()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching verified CAFs: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to retrieve verified CAFs: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get CAFs that are both verified and have a PD created.
     */
    public function getPdCreatedCafs(Request $request)
    {
        try {
            $query = CreditApplicationForm::with(['customer:customer_unique_id,first_name,last_name,email,contact_number_1'])
                ->join('loan_pd_information', 'loan_credit_application_forms.loan_application_id', '=', 'loan_pd_information.loan_application_id')
                ->select(
                    'loan_credit_application_forms.id',
                    'loan_credit_application_forms.loan_application_id',
                    'loan_credit_application_forms.customer_unique_id',
                    'loan_credit_application_forms.branch_id',
                    'loan_credit_application_forms.cms_admin_id',
                    'loan_credit_application_forms.credit_mode',
                    'loan_credit_application_forms.credit_applied_for',
                    'loan_credit_application_forms.status',
                    'loan_credit_application_forms.is_verified',
                    'loan_credit_application_forms.is_pd_created',
                    'loan_credit_application_forms.business_type',
                    'loan_credit_application_forms.business_nature',
                    'loan_credit_application_forms.net_surplus',
                    'loan_credit_application_forms.created_at',
                    'loan_credit_application_forms.updated_at',
                    'loan_pd_information.pd_application_id',
                    'loan_pd_information.pd_information',
                    'loan_pd_information.house_verification_photo',
                    'loan_pd_information.business_verification_photo',
                    'loan_pd_information.verification_status as pd_verification_status'
                )
                ->where('loan_credit_application_forms.is_verified', true)
                ->where('loan_credit_application_forms.is_pd_created', true)
                ->where('loan_pd_information.is_deleted', false);

            // Search filter
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('loan_credit_application_forms.loan_application_id', 'like', '%' . $search . '%')
                        ->orWhere('loan_credit_application_forms.customer_unique_id', 'like', '%' . $search . '%')
                        ->orWhere('loan_credit_application_forms.credit_applied_for', 'like', '%' . $search . '%')
                        ->orWhere('loan_credit_application_forms.business_type', 'like', '%' . $search . '%')
                        ->orWhere('loan_pd_information.pd_application_id', 'like', '%' . $search . '%');
                });
            }

            // Filter by customer
            if ($request->has('customer_unique_id') && !empty($request->customer_unique_id)) {
                $query->where('loan_credit_application_forms.customer_unique_id', $request->customer_unique_id);
            }

            // Filter by loan application
            if ($request->has('loan_application_id') && !empty($request->loan_application_id)) {
                $query->where('loan_credit_application_forms.loan_application_id', $request->loan_application_id);
            }

            // Filter by status
            if ($request->has('status') && !empty($request->status)) {
                $query->where('loan_credit_application_forms.status', $request->status);
            }

            // Filter by branch_id
            if ($request->has('branch_id') && !empty($request->branch_id)) {
                $branchId = $request->branch_id;
                $query->where(function ($q) use ($branchId) {
                    $q->where('loan_credit_application_forms.branch_id', $branchId)
                        ->orWhere('loan_credit_application_forms.branch_id', 'BR' . str_pad($branchId, 4, '0', STR_PAD_LEFT));
                });
            }

            // Filter by cms_admin_id
            if ($request->has('cms_admin_id') && !empty($request->cms_admin_id)) {
                $query->where('loan_credit_application_forms.cms_admin_id', $request->cms_admin_id);
            }

            // Filter by PD verification status
            if ($request->has('pd_verification_status') && !empty($request->pd_verification_status)) {
                $query->where('loan_pd_information.verification_status', $request->pd_verification_status);
            }

            // Filter by credit mode
            if ($request->has('credit_mode') && !empty($request->credit_mode)) {
                $query->where('loan_credit_application_forms.credit_mode', $request->credit_mode);
            }

            // Filter by credit amount range
            if ($request->has('min_credit_amount') && !empty($request->min_credit_amount)) {
                $query->where('loan_credit_application_forms.credit_applied_for', '>=', $request->min_credit_amount);
            }
            if ($request->has('max_credit_amount') && !empty($request->max_credit_amount)) {
                $query->where('loan_credit_application_forms.credit_applied_for', '<=', $request->max_credit_amount);
            }

            // Filter by date range
            if ($request->has('from_date') && !empty($request->from_date)) {
                $query->whereDate('loan_credit_application_forms.created_at', '>=', $request->from_date);
            }
            if ($request->has('to_date') && !empty($request->to_date)) {
                $query->whereDate('loan_credit_application_forms.created_at', '<=', $request->to_date);
            }

            $perPage = $request->get('per_page', 10);
            $cafs = $query->orderBy('loan_pd_information.created_at', 'desc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'message' => 'PD Created CAFs with PD information retrieved successfully',
                'data' => $cafs->items(),
                'pagination' => [
                    'current_page' => $cafs->currentPage(),
                    'per_page' => $cafs->perPage(),
                    'total' => $cafs->total(),
                    'last_page' => $cafs->lastPage(),
                    'from' => $cafs->firstItem(),
                    'to' => $cafs->lastItem()
                ],
                'filters' => [
                    'search' => $request->search,
                    'customer_unique_id' => $request->customer_unique_id,
                    'loan_application_id' => $request->loan_application_id,
                    'status' => $request->status,
                    'branch_id' => $request->branch_id,
                    'cms_admin_id' => $request->cms_admin_id,
                    'pd_verification_status' => $request->pd_verification_status,
                    'credit_mode' => $request->credit_mode,
                    'min_credit_amount' => $request->min_credit_amount,
                    'max_credit_amount' => $request->max_credit_amount,
                    'from_date' => $request->from_date,
                    'to_date' => $request->to_date
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching PD created CAFs: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve PD created CAFs: ' . $e->getMessage(),
                'error_details' => $e->getMessage()
            ], 500);
        }
    }

    public function show($loanApplicationId)
    {
        try {
            $caf = CreditApplicationForm::with([
                'customer',
                'enrollment'
            ])
                ->where('loan_application_id', $loanApplicationId)
                ->firstOrFail();

            $caf->income_proof_url = $caf->income_proof_name
                ? url($caf->income_proof_name)
                : null;

            $caf->business_photo_url = $caf->business_photo_name
                ? url($caf->business_photo_name)
                : null;

            $caf->business_proof_url = $caf->business_proof_name
                ? url($caf->business_proof_name)
                : null;

            $caf->passbook_image_url = $caf->passbook_image
                ? url($caf->passbook_image)
                : null;

            return response()->json([
                'success' => true,
                'data' => $caf
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'CAF not found'
            ], 404);
        }
    }
    public function cancelDeletionRequest(Request $request, $loanApplicationId)
    {
        try {
            $request->validate(['reason' => 'nullable|string']);

            $caf = CreditApplicationForm::where('loan_application_id', $loanApplicationId)->firstOrFail();

            if (!$caf->is_delete_requested) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active deletion request found for this CAF'
                ], 400);
            }

            $history = $caf->status_history ?? [];
            $history[] = [
                'status' => $caf->status,
                'timestamp' => now()->toDateTimeString(),
                'reason' => $request->reason ?? 'Deletion request cancelled',
                'updated_by' => auth()->user()->user_id ?? auth()->user()->name
            ];

            $caf->update([
                'is_delete_requested' => 0,
                'status_history' => $history
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Deletion request cancelled successfully',
                'data' => $caf->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel deletion request: ' . $e->getMessage()
            ], 500);
        }
    }

    public function deletionRequest(Request $request, $loanApplicationId)
    {
        try {
            $request->validate([
                'reason' => 'nullable|string'
            ]);

            $caf = CreditApplicationForm::where('loan_application_id', $loanApplicationId)->firstOrFail();

            $history = $caf->status_history ?? [];
            $history[] = [
                'status' => $caf->status,
                'timestamp' => now()->toDateTimeString(),
                'reason' => $request->reason ?? 'Deletion request raised',
                'updated_by' => auth()->user()->user_id ?? auth()->user()->name
            ];

            $caf->update([
                'is_delete_requested' => 1,
                'status_history' => $history
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Deletion request submitted successfully',
                'data' => $caf
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit deletion request: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateStatus(Request $request, $loanApplicationId)
    {
        try {
            $request->validate([
                'status' => 'required|string|in:field_executive,branch_manager,branch_support_executive,approved,rejected',
                'reason' => 'nullable|string'
            ]);

            $caf = CreditApplicationForm::where('loan_application_id', $loanApplicationId)->firstOrFail();

            $history = $caf->status_history ?? [];
            $history[] = [
                'status' => $request->status,
                'timestamp' => now()->toDateTimeString(),
                'reason' => $request->reason ?? 'Status updated to ' . $request->status,
                'updated_by' => auth()->user()->user_id ?? auth()->user()->name
            ];

            $caf->update([
                'status' => $request->status,
                'status_history' => $history
            ]);

            return response()->json([
                'success' => true,
                'message' => 'CAF status updated to ' . $request->status,
                'data' => $caf
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify CAF status.
     */
    public function verify(Request $request, string $id)
    {
        try {
            $validatedData = $request->validate([
                'reason' => 'nullable|string|max:500'
            ]);

            $caf = CreditApplicationForm::findOrFail($id);

            if ($caf->status !== 'branch_manager') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only applications at Branch Manager stage can be verified. Current status: ' . $caf->status
                ], 400);
            }

            $history = $caf->status_history ?? [];
            $history[] = [
                'status' => 'verified',
                'timestamp' => now()->toDateTimeString(),
                'reason' => $validatedData['reason'] ?? 'CAF verified by Branch Manager',
                'changed_by' => auth()->user()->user_id ?? auth()->id() ?? 'system'
            ];

            $caf->update([
                'is_verified' => true,
                // 'status' => 'approved', // Assuming verification means approval based on previous context, or keep it as is if only is_verified changes
                'status_history' => $history
            ]);

            return response()->json([
                'success' => true,
                'message' => 'CAF verified successfully',
                'data' => $caf->fresh()
            ]);
        } catch (\Exception $e) {
            Log::error('Error verifying CAF: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to verify CAF'
            ], 500);
        }
    }

    /**
     * Revert CAF from branch_manager to field_executive.
     */
    public function revertToFieldExecutive(Request $request, string $id)
    {
        try {
            $validatedData = $request->validate([
                'reason' => 'required|string|max:500'
            ]);

            $caf = CreditApplicationForm::findOrFail($id);

            if ($caf->status !== 'branch_manager') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only branch manager applications can be reverted to field executive. Current status: ' . $caf->status
                ], 400);
            }

            $history = $caf->status_history ?? [];
            $history[] = [
                'status' => 'field_executive',
                'timestamp' => now()->toISOString(),
                'reason' => $validatedData['reason'],
                'changed_by' => auth()->user()->user_id ?? auth()->id() ?? 'system'
            ];

            $caf->update([
                'status' => 'field_executive',
                'status_history' => $history
            ]);

            return response()->json([
                'success' => true,
                'message' => 'CAF reverted to Field Executive successfully',
                'data' => $caf->fresh()
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'CAF not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error reverting CAF to field executive: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to revert CAF'
            ], 500);
        }
    }

    /**
     * Cascade soft delete: CAF → PD → CAM → Disbursement → Loan → EmiSchedules
     */
    public function deleteCaf(string $id)
    {
        try {
            $caf = is_numeric($id)
                ? CreditApplicationForm::withoutGlobalScope('notDeleted')->where('id', $id)->firstOrFail()
                : CreditApplicationForm::withoutGlobalScope('notDeleted')->where('loan_application_id', $id)->firstOrFail();

            $loanAppId = $caf->loan_application_id;
            $deleted = [];

            // PD
            $pdCount = \App\Models\Loan\PdInformation::withoutGlobalScope('not_deleted')
                ->where('loan_application_id', $loanAppId)
                ->where('is_deleted', 0)
                ->count();
            if ($pdCount > 0) {
                \App\Models\Loan\PdInformation::withoutGlobalScope('not_deleted')
                    ->where('loan_application_id', $loanAppId)
                    ->update(['is_deleted' => 1]);
                $deleted['pd'] = ['table' => 'loan_pd_information', 'records_deleted' => $pdCount];
            }

            // CAM
            $camCount = \App\Models\Loan\CAM::withoutGlobalScope('not_deleted')
                ->where('loan_application_id', $loanAppId)
                ->where('is_deleted', 0)
                ->count();
            if ($camCount > 0) {
                \App\Models\Loan\CAM::withoutGlobalScope('not_deleted')
                    ->where('loan_application_id', $loanAppId)
                    ->update(['is_deleted' => 1]);
                $deleted['cam'] = ['table' => 'loan_cam', 'records_deleted' => $camCount];
            }

            // Disbursement
            $disbCount = \App\Models\Loan\Disbursement::withoutGlobalScope('not_deleted')
                ->where('loan_application_id', $loanAppId)
                ->where('is_deleted', 0)
                ->count();
            if ($disbCount > 0) {
                \App\Models\Loan\Disbursement::withoutGlobalScope('not_deleted')
                    ->where('loan_application_id', $loanAppId)
                    ->update(['is_deleted' => 1]);
                $deleted['disbursement'] = ['table' => 'loan_disbursements', 'records_deleted' => $disbCount];
            }

            // Loans
            $loanNumbers = \App\Models\Loan\Loan::withoutGlobalScope('not_deleted')
                ->where('loan_application_id', $loanAppId)
                ->pluck('loan_number');

            if ($loanNumbers->isNotEmpty()) {
                // EMI Schedules
                $emiCount = \App\Models\Loan\EmiSchedule::withoutGlobalScope('not_deleted')
                    ->whereIn('loan_id', $loanNumbers)
                    ->where('is_deleted', 0)
                    ->count();
                if ($emiCount > 0) {
                    \App\Models\Loan\EmiSchedule::withoutGlobalScope('not_deleted')
                        ->whereIn('loan_id', $loanNumbers)
                        ->update(['is_deleted' => 1]);
                    $deleted['emi_schedules'] = ['table' => 'loan_emi_schedules', 'records_deleted' => $emiCount];
                }

                // EMI Payments
                $emiPaymentCount = \App\Models\Loan\EmiPayment::whereIn('loan_id', $loanNumbers)
                    ->where('is_deleted', 0)
                    ->count();
                if ($emiPaymentCount > 0) {
                    \App\Models\Loan\EmiPayment::whereIn('loan_id', $loanNumbers)
                        ->update(['is_deleted' => 1]);
                    $deleted['emi_payments'] = ['table' => 'loan_emi_payments', 'records_deleted' => $emiPaymentCount];
                }

                $loanCount = $loanNumbers->count();
                \App\Models\Loan\Loan::withoutGlobalScope('not_deleted')
                    ->whereIn('loan_number', $loanNumbers)
                    ->update(['is_deleted' => 1]);
                $deleted['loans'] = ['table' => 'loan_loans', 'records_deleted' => $loanCount, 'loan_numbers' => $loanNumbers->values()];
            }

            // CAF
            CreditApplicationForm::withoutGlobalScope('notDeleted')
                ->where('loan_application_id', $loanAppId)
                ->update(['is_deleted' => 1]);
            $deleted['caf'] = ['table' => 'loan_credit_application_forms', 'records_deleted' => 1];

            return response()->json([
                'success' => true,
                'message' => 'CAF and all related records soft deleted successfully',
                'loan_application_id' => $loanAppId,
                'deleted_summary' => $deleted,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'CAF not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error cascade deleting CAF: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'message' => 'Failed to delete: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Soft delete a CAF by setting is_deleted = 1
     */
    public function destroy(string $id)
    {
        try {
            // Find by loan_application_id or database id
            if (is_numeric($id)) {
                $caf = CreditApplicationForm::findOrFail($id);
            } else {
                $caf = CreditApplicationForm::where('loan_application_id', $id)->firstOrFail();
            }

            // Soft delete the CAF
            $caf->softDelete();

            // Add to status history
            $history = $caf->status_history ?? [];
            $history[] = [
                'status' => 'deleted',
                'timestamp' => now()->toDateTimeString(),
                'reason' => 'CAF soft deleted',
                'deleted_by' => auth()->user()->user_id ?? auth()->id() ?? 'system'
            ];
            $caf->update(['status_history' => $history]);

            return response()->json([
                'success' => true,
                'message' => 'CAF soft deleted successfully'
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'CAF not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error soft deleting CAF: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete CAF'
            ], 500);
        }
    }

    /**
     * Get all soft deleted CAFs
     */
    public function getTrashedCafs(Request $request)
    {
        try {
            $query = CreditApplicationForm::onlyTrashed()->with(['customer:customer_unique_id,first_name,last_name,email,contact_number_1']);

            // Search filter
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('loan_application_id', 'like', '%' . $search . '%')
                        ->orWhere('customer_unique_id', 'like', '%' . $search . '%')
                        ->orWhere('credit_applied_for', 'like', '%' . $search . '%')
                        ->orWhere('business_type', 'like', '%' . $search . '%');
                });
            }

            // Filter by customer
            if ($request->has('customer_unique_id') && !empty($request->customer_unique_id)) {
                $query->where('customer_unique_id', $request->customer_unique_id);
            }

            // Filter by branch_id
            if ($request->has('branch_id') && !empty($request->branch_id)) {
                $query->where('branch_id', $request->branch_id);
            }

            // Filter by cms_admin_id
            if ($request->has('cms_admin_id') && !empty($request->cms_admin_id)) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            $perPage = $request->get('per_page', 10);
            $cafs = $query->orderBy('updated_at', 'desc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'message' => 'Deleted CAFs retrieved successfully',
                'data' => $cafs->items(),
                'pagination' => [
                    'current_page' => $cafs->currentPage(),
                    'per_page' => $cafs->perPage(),
                    'total' => $cafs->total(),
                    'last_page' => $cafs->lastPage(),
                    'from' => $cafs->firstItem(),
                    'to' => $cafs->lastItem()
                ],
                'filters' => [
                    'search' => $request->search,
                    'customer_unique_id' => $request->customer_unique_id,
                    'branch_id' => $request->branch_id,
                    'cms_admin_id' => $request->cms_admin_id,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching deleted CAFs: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve deleted CAFs'
            ], 500);
        }
    }

    /**
     * Restore a soft deleted CAF
     */
    public function restoreCaf(string $id)
    {
        try {
            // Find by loan_application_id or database id in trashed records
            if (is_numeric($id)) {
                $caf = CreditApplicationForm::onlyTrashed()->where('id', $id)->first();
            } else {
                $caf = CreditApplicationForm::onlyTrashed()->where('loan_application_id', $id)->first();
            }

            if (!$caf) {
                return response()->json([
                    'success' => false,
                    'message' => 'Deleted CAF not found'
                ], 404);
            }

            // Restore the CAF
            $caf->restore();

            // Add to status history
            $history = $caf->status_history ?? [];
            $history[] = [
                'status' => 'restored',
                'timestamp' => now()->toDateTimeString(),
                'reason' => 'CAF restored from deletion',
                'restored_by' => auth()->user()->user_id ?? auth()->id() ?? 'system'
            ];
            $caf->update(['status_history' => $history]);

            return response()->json([
                'success' => true,
                'message' => 'CAF restored successfully',
                'data' => $caf->fresh()->load('customer')
            ]);
        } catch (\Exception $e) {
            Log::error('Error restoring CAF: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to restore CAF'
            ], 500);
        }
    }

    /**
     * Permanently delete a soft deleted CAF
     */
    public function forceDeleteCaf(string $id)
    {
        try {
            // Find by loan_application_id or database id in trashed records
            if (is_numeric($id)) {
                $caf = CreditApplicationForm::onlyTrashed()->where('id', $id)->first();
            } else {
                $caf = CreditApplicationForm::onlyTrashed()->where('loan_application_id', $id)->first();
            }

            if (!$caf) {
                return response()->json([
                    'success' => false,
                    'message' => 'Deleted CAF not found'
                ], 404);
            }

            // Permanently delete the CAF
            $caf->forceDelete();

            return response()->json([
                'success' => true,
                'message' => 'CAF permanently deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error permanently deleting CAF: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to permanently delete CAF'
            ], 500);
        }
    }
}
