<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\Loan\LoanCustomer;
use App\Models\Loan\CustomerEnrollment;
use App\Models\Loan\CreditApplicationForm;
use App\Models\Loan\Loan;
use App\Models\Loan\PdInformation;
use App\Models\Loan\CAM;
use App\Models\Loan\Disbursement;
use App\Models\Loan\EmiSchedule;
use App\Models\Loan\EmiPayment;
use App\Models\Loan\LoanCustomerVerificationHistory;
use App\Models\OtpVerification;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

class LoanCustomerController extends Controller
{
    public function index(Request $request)
    {
        try {

            Log::info('Fetching all loan customers');

            $query = LoanCustomer::with([
                'roleData',
                'latestEnrollment',
                'activeLoans',
            ])->where('is_deleted', 0);

            if ($request->filled('search')) {

                $search = $request->search;

                $query->where(function ($q) use ($search) {

                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('contact_number_1', 'like', "%{$search}%")
                        ->orWhere('customer_unique_id', 'like', "%{$search}%");
                });
            }

            if ($request->filled('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            if ($request->filled('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }

            if ($request->filled('cms_admin_id')) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            if ($request->filled('agent_unique_id')) {
                $query->where('agent_unique_id', $request->agent_unique_id);
            }

            if ($request->has('is_delete_requested') && $request->is_delete_requested !== '') {
                $query->where('is_delete_requested', filter_var($request->is_delete_requested, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $request->boolean('is_delete_requested'));
            }

            if ($request->filled('enrolled_by')) {
                $query->whereHas('latestEnrollment', function ($q) use ($request) {
                    $q->withoutGlobalScope('notDeleted')
                      ->where('enrolled_by', $request->enrolled_by);
                });
            }

            /*
        |--------------------------------------------------------------------------
        | Enrollment Status Filter
        |--------------------------------------------------------------------------
        */

            if ($request->filled('status')) {

                $query->whereHas('latestEnrollment', function ($q) use ($request) {
                    $q->withoutGlobalScope('notDeleted');

                    if ($request->status === 'field_executive') {

                        $q->whereIn('status', [
                            'field_executive',
                            'reverted'
                        ]);
                    } else {

                        $q->where('status', $request->status);
                    }
                });
            }

            /*
        |--------------------------------------------------------------------------
        | Enrollment Verification Filter
        |--------------------------------------------------------------------------
        */

            if ($request->filled('verification_status')) {

                $query->whereHas('latestEnrollment', function ($q) use ($request) {
                    $q->withoutGlobalScope('notDeleted')
                      ->where(
                        'verification_status',
                        $request->verification_status
                      );
                });
            }

            $perPage = $request->get('per_page', 10);

            $users = $query
                ->orderByDesc(
                    CustomerEnrollment::withoutGlobalScope('notDeleted')
                        ->select('created_at')
                        ->whereColumn(
                            'customer_enrollments.customer_unique_id',
                            'loan_customers.customer_unique_id'
                        )
                        ->latest('id')
                        ->limit(1)
                )
                ->paginate($perPage);

            $data = collect($users->items())->map(function ($customer) {

                $enrollment = $customer->latestEnrollment;

                $item = $customer->toArray();

                $item['status'] = $enrollment?->status;
                $item['verification_status'] = $enrollment?->verification_status;
                $item['enrollment_number'] = $enrollment?->enrollment_number;
                $item['enrollment_date'] = $enrollment?->enrollment_date;

                $item['enrollment'] = $enrollment;
                $item['status_history'] = $enrollment?->status_history;

                $item['loans'] = $customer->activeLoans->map(function ($loan) {
                    $loanEndDate = null;
                    if ($loan->installment_start_date && $loan->tenure_months) {
                        $loanEndDate = \Carbon\Carbon::parse($loan->installment_start_date)
                            ->addMonths((int) $loan->tenure_months)
                            ->toDateString();
                    }
                    return [
                        'loan_number'            => $loan->loan_number,
                        'loan_application_id'    => $loan->loan_application_id,
                        'loan_amount'            => $loan->loan_amount,
                        'emi_amount'             => $loan->emi_amount,
                        'interest_rate'          => $loan->interest_rate,
                        'tenure_months'          => $loan->tenure_months,
                        'frequency'              => $loan->frequency,
                        'loan_start_date'        => $loan->loan_start_date,
                        'installment_start_date' => $loan->installment_start_date,
                        'loan_end_date'          => $loanEndDate,
                        'disbursement_amount'    => $loan->disbursement_amount,
                    ];
                })->values();

                $item['total_running_loans'] = $customer->activeLoans->count();

                return $item;
            });

            return response()->json([
                'success' => true,
                'message' => 'Users retrieved successfully',
                'data' => $data,
                'pagination' => [
                    'current_page' => $users->currentPage(),
                    'per_page' => $users->perPage(),
                    'total' => $users->total(),
                    'last_page' => $users->lastPage(),
                    'from' => $users->firstItem(),
                    'to' => $users->lastItem(),
                ],
                'filters' => [
                    'search' => $request->search,
                    'user_id' => $request->user_id,
                    'branch_id' => $request->branch_id,
                    'cms_admin_id' => $request->cms_admin_id,
                    'agent_unique_id' => $request->agent_unique_id,
                    'enrolled_by' => $request->enrolled_by,
                    'status' => $request->status,
                    'verification_status' => $request->verification_status,
                ]
            ]);
        } catch (\Exception $e) {

            Log::error('Error fetching loan customers', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve users'
            ], 500);
        }
    }

    public function getAllWithoutPagination(Request $request)
    {
        try {

            Log::info('Fetching all loan customers without pagination', [
                'filters' => $request->all()
            ]);

            $query = LoanCustomer::with([
                'roleData',
                'latestEnrollment'
            ])->where('is_deleted', 0);

            if ($request->filled('search')) {

                $search = $request->search;

                $query->where(function ($q) use ($search) {

                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('contact_number_1', 'like', "%{$search}%")
                        ->orWhere('customer_unique_id', 'like', "%{$search}%");
                });
            }

            if ($request->filled('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            if ($request->filled('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }

            if ($request->filled('cms_admin_id')) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            if ($request->filled('role')) {
                $query->where('role', $request->role);
            }

            /*
        |--------------------------------------------------------------------------
        | Enrollment Status Filter
        |--------------------------------------------------------------------------
        */

            if ($request->filled('status')) {

                $query->whereHas('latestEnrollment', function ($q) use ($request) {
                    $q->withoutGlobalScope('notDeleted')
                      ->where('status', $request->status);
                });
            }

            /*
        |--------------------------------------------------------------------------
        | Enrollment Verification Filter
        |--------------------------------------------------------------------------
        */

            if ($request->filled('verification_status')) {

                $query->whereHas('latestEnrollment', function ($q) use ($request) {
                    $q->withoutGlobalScope('notDeleted')
                      ->where(
                        'verification_status',
                        $request->verification_status
                      );
                });
            }

            Log::info('SQL Query', [
                'sql' => $query->toSql(),
                'bindings' => $query->getBindings()
            ]);

            $users = $query
                ->orderBy('created_at', 'desc')
                ->get();

            $users = $users->map(function ($customer) {

                $enrollment = $customer->latestEnrollment;

                $item = $customer->toArray();

                $item['status'] = $enrollment?->status;
                $item['verification_status'] = $enrollment?->verification_status;
                $item['enrollment_number'] = $enrollment?->enrollment_number;
                $item['enrollment_date'] = $enrollment?->enrollment_date;
                $item['verification_notes'] = $enrollment?->verification_notes;

                $item['enrollment'] = $enrollment;

                return $item;
            });

            Log::info('Query results', [
                'count' => $users->count()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Users retrieved successfully',
                'data' => $users,
                'total_count' => $users->count(),
                'filters' => [
                    'search' => $request->search,
                    'user_id' => $request->user_id,
                    'branch_id' => $request->branch_id,
                    'cms_admin_id' => $request->cms_admin_id,
                    'role' => $request->role,
                    'status' => $request->status,
                    'verification_status' => $request->verification_status,
                ]
            ]);
        } catch (\Exception $e) {

            Log::error(
                'Error fetching loan customers without pagination',
                [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]
            );

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve users'
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            // Parse profileForm JSON if it exists
            $profileForm = [];
            if ($request->has('profileForm')) {
                $profileForm = is_string($request->profileForm)
                    ? json_decode($request->profileForm, true)
                    : $request->profileForm;
            }

            // Custom validation for enrollment date to accept both date and datetime formats
            if (!empty($profileForm['enrollmentDate'])) {
                $enrollmentDate = $profileForm['enrollmentDate'];
                try {
                    $parsedDate = \Carbon\Carbon::parse($enrollmentDate);
                    // If only date is provided (time is 00:00:00), set current time
                    if ($parsedDate->format('H:i:s') === '00:00:00') {
                        $parsedDate = $parsedDate->setTime(now()->hour, now()->minute, now()->second);
                    }
                    $profileForm['enrollmentDate'] = $parsedDate->format('Y-m-d H:i:s');
                } catch (\Exception $e) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid enrollment date format. Please provide a valid date or datetime.',
                        'errors' => ['enrollmentDate' => ['Invalid date format']]
                    ], 422);
                }
            }

            $validatedData = $request->validate([
                'agent_unique_id' => 'required|string|exists:loan_agents,agent_unique_id',
                'sourcing_type' => 'required|in:self,referral',
                'referral_id' => 'nullable|string|required_if:sourcing_type,referral',
                'user_id' => 'nullable',
                'branch_id' => 'nullable',
                'cms_admin_id' => 'nullable',
                'profileForm' => 'nullable',
                'otp' => 'nullable|string|size:6',
                'password' => 'required|string|min:6',
                'enroll_by' => 'nullable',

            ]);

            $email = $profileForm['emailId'] ?? $request->input('profileForm.emailId');

            // Verify OTP
            $otpVerified = true;
            if ($request->filled('otp')) {
                $otpVerified = OtpVerification::where('email', $email)
                    ->where('otp', $request->otp)
                    ->where('is_verified', true)
                    ->exists();
            }

            if (!$otpVerified) {
                return response()->json([
                    'success' => false,
                    'message' => 'Email verification required. Please verify the OTP first.'
                ], 422);
            }

            // Validate age must be 18 or greater
            if (!empty($profileForm['dob'])) {
                $dob = new \DateTime($profileForm['dob']);
                $now = new \DateTime();
                $age = $now->diff($dob)->y;

                if ($age < 18) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Validation failed',
                        'errors' => ['dob' => ['The customer must be at least 18 years old.']]
                    ], 422);
                }
            }

            // Validate email uniqueness if provided
            if (!empty($profileForm['emailId'])) {
                $emailExists = \App\Models\Loan\LoanCustomer::where('email', $profileForm['emailId'])->exists();
                if ($emailExists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Validation failed',
                        'errors' => ['emailId' => ['The email has already been taken.']]
                    ], 422);
                }
            }

            // Extract files from request - Debug what files are received
            \Log::info('All request files:', $request->allFiles());
            \Log::info('Request has files:', array_keys($request->allFiles()));
            \Log::info('Request all data:', $request->all());

            // Collect all files from the request, including nested ones
            $kycImages = $request->allFiles();

            // Flatten the nested files array if they are in profileForm or kycImages
            if ($request->hasFile('profileForm')) {
                foreach ($request->file('profileForm') as $key => $file) {
                    if (is_array($file)) {
                        foreach ($file as $subKey => $subFile) {
                            $kycImages["profileForm.{$key}.{$subKey}"] = $subFile;
                        }
                    } else {
                        $kycImages["profileForm.{$key}"] = $file;
                    }
                }
            }

            if ($request->hasFile('kycImages')) {
                foreach ($request->file('kycImages') as $key => $file) {
                    $kycImages["kycImages.{$key}"] = $file;
                }
            }

            $destinationPath = public_path('loan_customer_documents');
            if (!is_dir($destinationPath)) {
                mkdir($destinationPath, 0755, true);
            }

            $kycImagePaths = [];
            \Log::info('Processing images:', $kycImages);

            // Map any found files to database fields
            $dbFieldMap = [
                'aadhaarImage' => 'adhaar_image',
                'aadhaar' => 'adhaar_image',
                'kycImages.aadhaarImage' => 'adhaar_image',
                'profileForm.kycNumbers.aadhaarImage' => 'adhaar_image',
                'panImage' => 'pan_image',
                'panCard' => 'pan_image',
                'kycImages.panImage' => 'pan_image',
                'profileForm.kycNumbers.panImage' => 'pan_image',
                'panCardImage' => 'pan_image',
                'voterIdImage' => 'voter_id_image',
                'voterId' => 'voter_id_image',
                'kycImages.voterIdImage' => 'voter_id_image',
                'profileForm.kycNumbers.voterIdImage' => 'voter_id_image',
                'aadhaarImageBack' => 'adhaar_image_back',
                'kycImages.aadhaarImageBack' => 'adhaar_image_back',
                'profileForm.kycNumbers.aadhaarImageBack' => 'adhaar_image_back',
                'voterIdImageBack' => 'voter_id_image_back',
                'kycImages.voterIdImageBack' => 'voter_id_image_back',
                'profileForm.kycNumbers.voterIdImageBack' => 'voter_id_image_back',
                'otherDocument' => 'other_document',
                'kycImages.otherDocument' => 'other_document',
                'profileForm.kycNumbers.otherDocument' => 'other_document',
                'drivingLicenseImage' => 'driving_license_image',
                'drivingLicense' => 'driving_license_image',
                'profileForm.kycNumbers.drivingLicenseImage' => 'driving_license_image',
                'rationCardImage' => 'ration_card_image',
                'rationCard' => 'ration_card_image',
                'profileForm.kycNumbers.rationCardImage' => 'ration_card_image',
                'passbookImage' => 'passbook_image',
                'passbook' => 'passbook_image',
                'profileForm.kycNumbers.passbookImage' => 'passbook_image'
            ];

            foreach ($kycImages as $fieldName => $file) {
                if ($file instanceof \Illuminate\Http\UploadedFile) {
                    if (isset($dbFieldMap[$fieldName])) {
                        $dbField = $dbFieldMap[$fieldName];
                        $extension = $file->getClientOriginalExtension();
                        $filename = time() . '_' . str_replace(['.', '[', ']'], '_', $fieldName) . '.' . $extension;
                        $file->move($destinationPath, $filename);
                        $kycImagePaths[$dbField] = 'loan_customer_documents/' . $filename;
                        \Log::info("Saved {$fieldName} to {$kycImagePaths[$dbField]}");
                    }

                    if (str_contains($fieldName, 'customerPhoto')) {
                        $extension = $file->getClientOriginalExtension();
                        $filename = time() . '_customer_photo.' . $extension;
                        $file->move($destinationPath, $filename);
                        $customerPhotoPath = 'loan_customer_documents/' . $filename;
                        \Log::info("Saved customer photo to {$customerPhotoPath}");
                    }
                }
            }

            $fullName = trim(($profileForm['firstName'] ?? 'Customer') . ' ' . ($profileForm['middleName'] ?? '') . ' ' . ($profileForm['lastName'] ?? ''));

            $role = 'customer';
            if (!Role::where('name', $role)->exists()) {
                $lastRole = Role::orderBy('role_id', 'desc')->first();
                $newRoleId = $lastRole ? (int)$lastRole->role_id + 1 : 1;

                Role::create([
                    'role_id' => $newRoleId,
                    'name' => $role,
                    'description' => ucfirst($role) . ' role',
                    'permissions' => ['read']
                ]);
            }

            // Extract profileForm from the request as it might be an array or a JSON string
            $profileFormInput = $request->input('profileForm', []);
            if (is_string($profileFormInput)) {
                $decoded = json_decode($profileFormInput, true);
                $profileFormFromRequest = is_array($decoded) ? $decoded : [];
            } else {
                $profileFormFromRequest = is_array($profileFormInput) ? $profileFormInput : [];
            }

            // Merge with the already processed profileForm (which has the time-fixed enrollment date)
            $profileForm = array_merge($profileFormFromRequest, $profileForm);

            // Log the parsed profile form for debugging
            \Log::info('Parsed profile form:', ['data' => $profileForm]);

            // Helper to get nested values like profileForm[kycNumbers][aadhaar]
            $getNested = function ($key, $default = null) use ($request, $profileForm) {
                // 1. Try from the profileForm array we just parsed
                if (str_contains($key, '.')) {
                    $parts = explode('.', $key);
                    $temp = $profileForm;
                    foreach ($parts as $part) {
                        if (isset($temp[$part]) && !is_null($temp[$part])) {
                            // If the nested value is a JSON string (like kycNumbers often is from the frontend)
                            if (is_string($temp[$part]) && (str_starts_with($temp[$part], '{') || str_starts_with($temp[$part], '['))) {
                                $decoded = json_decode($temp[$part], true);
                                if (json_last_error() === JSON_ERROR_NONE) {
                                    $temp = $decoded;
                                    continue;
                                }
                            }
                            $temp = $temp[$part];
                        } else {
                            $temp = null;
                            break;
                        }
                    }
                    if ($temp !== null && $temp !== '') return $temp;
                }

                // 2. Try from direct request input (Laravel handles nested keys like profileForm[kycNumbers][aadhaar] via dot notation)
                $requestVal = $request->input("profileForm." . $key);
                if ($requestVal !== null && $requestVal !== '') return $requestVal;

                return $default;
            };

            $plainPassword = $request->input('password');

            $rawIsDisabled = $profileForm['isDisabled'] ?? $request->input('profileForm.isDisabled');
            $disabilityType = $profileForm['disabilityType'] ?? $request->input('profileForm.disabilityType');

            $isDisabledValue = null;
            if (!is_null($rawIsDisabled) && $rawIsDisabled !== '') {
                $normalized = is_string($rawIsDisabled) ? strtolower($rawIsDisabled) : $rawIsDisabled;
                $isDisabledValue = in_array($normalized, ['yes', 1, true], true)
                    ? true
                    : (in_array($normalized, ['no', 0, false], true) ? false : null);
            }

            $gender = $profileForm['gender'] ?? $request->input('profileForm.gender');
            if ($gender) {
                $gender = strtolower(trim($gender));
                if (!in_array($gender, ['male', 'female', 'other'])) {
                    $gender = null;
                }
            } else {
                $gender = null;
            }

            $user = LoanCustomer::create([
                'email' => $profileForm['emailId'] ?? $request->input('profileForm.emailId') ?? 'customer_' . time() . '@temp.com',
                'password' => Hash::make($plainPassword),
                'unhashed_password' => $plainPassword,
                'user_id' => $validatedData['user_id'] ?? $request->user_id ?? $request->input('user_id'),
                'branch_id' => $validatedData['branch_id'] ?? $request->branch_id ?? $request->input('branch_id'),
                'cms_admin_id' => $validatedData['cms_admin_id'] ?? $request->cms_admin_id ?? $request->input('cms_admin_id'),
                'role' => $role,
                // 'status' => 'field_executive',
                'agent_unique_id' => $validatedData['agent_unique_id'] ?? null,
                'sourcing_type' => $validatedData['sourcing_type'],
                'referral_id' => $validatedData['referral_id'] ?? null,
                // 'enrollment_date' => $profileForm['enrollmentDate'] ?? $request->input('profileForm.enrollmentDate'),
                'first_name' => $profileForm['firstName'] ?? $request->input('profileForm.firstName'),
                'middle_name' => $profileForm['middleName'] ?? $request->input('profileForm.middleName'),
                'last_name' => $profileForm['lastName'] ?? $request->input('profileForm.lastName'),
                'gender' => $gender,
                'date_of_birth' => $profileForm['dob'] ?? $request->input('profileForm.dob'),
                'father_name' => $profileForm['fatherName'] ?? $request->input('profileForm.fatherName'),
                'service_area_pin' => $profileForm['serviceAreaPin'] ?? $request->input('profileForm.serviceAreaPin'),
                'religion' => $profileForm['religion'] ?? $request->input('profileForm.religion'),
                'caste' => $profileForm['caste'] ?? $request->input('profileForm.caste'),
                'permanent_address' => $profileForm['permanentAddress'] ?? $request->input('profileForm.permanentAddress'),
                'correspondence_address' => $profileForm['correspondenceAddress'] ?? $request->input('profileForm.correspondenceAddress'),
                'contact_number_1' => $profileForm['contactNumber1'] ?? $request->input('profileForm.contactNumber1'),
                'contact_number_2' => $profileForm['contactNumber2'] ?? $request->input('profileForm.contactNumber2'),
                'adhaar_number' => $getNested('kycNumbers.aadhaar'),
                'adhaar_image' => $kycImagePaths['adhaar_image'] ?? null,
                'adhaar_image_back' => $kycImagePaths['adhaar_image_back'] ?? null,
                'pan_number' => $getNested('kycNumbers.panCard'),
                'pan_image' => $kycImagePaths['pan_image'] ?? null,
                'driving_license_number' => $getNested('kycNumbers.drivingLicense'),
                'driving_license_image' => $kycImagePaths['driving_license_image'] ?? null,
                'voter_id_number' => $getNested('kycNumbers.voterId'),
                'voter_id_image' => $kycImagePaths['voter_id_image'] ?? null,
                'voter_id_image_back' => $kycImagePaths['voter_id_image_back'] ?? null,
                'ration_card_number' => $getNested('kycNumbers.rationCard'),
                'ration_card_image' => $kycImagePaths['ration_card_image'] ?? null,
                'other_name' => $getNested('kycNumbers.otherName') ?? $profileForm['otherName'] ?? null,
                'other_document' => $kycImagePaths['other_document'] ?? null,
                'nominee_name' => $profileForm['nomineeName'] ?? $request->input('profileForm.nomineeName'),
                'nominee_relationship' => $profileForm['nomineeRelationship'] ?? $request->input('profileForm.nomineeRelationship'),
                'nominee_relationship_other' => (($profileForm['nomineeRelationship'] ?? $request->input('profileForm.nomineeRelationship')) === 'Other')
                    ? ($profileForm['nomineeRelationshipOther'] ?? $request->input('profileForm.nomineeRelationshipOther'))
                    : null,
                'nominee_address' => $profileForm['nomineeAddress'] ?? null,
                'occupation' => $profileForm['occupation'] ?? null,
                'salaried_type' => $profileForm['salariedType'] ?? null,
                'business_nature' => $profileForm['businessNature'] ?? null,
                'spouse_occupation' => $profileForm['spouseOccupation'] ?? null,
                'spouse_salaried_type' => $profileForm['spouseSalariedType'] ?? null,
                'spouse_business_nature' => $profileForm['spouseBusinessNature'] ?? null,
                'residence_type' => $profileForm['residenceType'] ?? null,
                'years_of_staying' => $profileForm['yearsOfStaying'] ?? null,
                'house_type' => $profileForm['houseType'] ?? null,
                'number_of_rooms' => $profileForm['numberOfRooms'] ?? null,
                'assets' => isset($profileForm['assets']) ? (is_array($profileForm['assets']) ? json_encode($profileForm['assets']) : $profileForm['assets']) : null,
                'is_disabled' => $isDisabledValue,
                'disability_type' => $isDisabledValue ? ($disabilityType ?? null) : null,
                'customer_consent' => (bool) $request->input('profileForm.customerConsent', false),
                'customer_photo' => $customerPhotoPath,
                'passbook_image' => $kycImagePaths['passbook_image'] ?? null,
                // 'status_history' => [
                //     [
                //         'status' => 'field_executive',
                //         'timestamp' => now()->toDateTimeString(),
                //         'reason' => 'Customer account created'
                //     ]
                // ],
            ]);

            $enrollment = CustomerEnrollment::create([
                'customer_unique_id' => $user->customer_unique_id,
                'branch_id' => $user->branch_id,
                'cms_admin_id' => $user->cms_admin_id,
                 'enrolled_by'        => $request->input('enroll_by') ?? auth()->user()?->user_id ?? null,
                'enrollment_date' => $profileForm['enrollmentDate'] ?? now(),

                'status' => 'field_executive',

                'verification_status' => 'pending',

                'status_history' => [
                    [
                        'status' => 'field_executive',
                        'timestamp' => now()->toDateTimeString(),
                        'reason' => 'Customer account created'
                    ]
                ]
            ]);

            $enrollment = CustomerEnrollment::where(
                'customer_unique_id',
                $user->customer_unique_id
            )->latest('id')->first();

            return response()->json([
                'success' => true,
                'message' => 'User created successfully',
                'data' => [
                    ...$user->load('roleData')->toArray(),
                    'enrollment' => $enrollment
                ]
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (QueryException $e) {
            Log::error('Database error creating loan customer: ' . $e->getMessage(), ['query' => $e->getSql()]);
            return response()->json([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ], 500);
        } catch (\Exception $e) {
            Log::error('Error creating loan customer: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create user: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show(string $customerUniqueId)
    {
        try {

            $authUser = auth()->user();

            $customer = LoanCustomer::withoutGlobalScope('notDeleted')
                ->where('customer_unique_id', $customerUniqueId)
                ->when(request()->filled('branch_id'), fn($q) => $q->where('branch_id', request()->branch_id))
                ->first();

            if (!$customer) {
                return response()->json(['success' => false, 'message' => 'Customer not found'], 404);
            }

            if ($customer->is_deleted) {
                return response()->json(['success' => false, 'message' => 'This customer has been deleted'], 404);
            }

            // If logged-in user is Field Executive, restrict to their agent's customers only
            if ($authUser && strtolower($authUser->role ?? '') === 'field executive') {
                $agent = \App\Models\Loan\LoanAgent::where('email', $authUser->email)->first();
                if (!$agent || $customer->agent_unique_id !== $agent->agent_unique_id) {
                    return response()->json(['success' => false, 'message' => 'User not found'], 404);
                }
            }

            $customer->load('roleData');

            /*
        |--------------------------------------------------------------------------
        | Get Enrollment
        |--------------------------------------------------------------------------
        */

            if (request()->filled('enrollment_number')) {

                $enrollment = CustomerEnrollment::where(
                    'customer_unique_id',
                    $customerUniqueId
                )
                    ->where(
                        'enrollment_number',
                        request()->enrollment_number
                    )
                    ->firstOrFail();
            } else {

                $enrollment = CustomerEnrollment::where(
                    'customer_unique_id',
                    $customerUniqueId
                )
                    ->latest('id')
                    ->first();
            }

            /*
        |--------------------------------------------------------------------------
        | Verification History
        |--------------------------------------------------------------------------
        */

            $historyQuery = LoanCustomerVerificationHistory::where(
                'customer_unique_id',
                $customerUniqueId
            );

            if ($enrollment) {

                $historyQuery->where(
                    'enrollment_number',
                    $enrollment->enrollment_number
                );
            }

            $verificationHistory = $historyQuery
                ->orderBy('created_at', 'desc')
                ->get();

            /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        */

            $responseData = $customer->toArray();

            $responseData['status'] =
                $enrollment?->status;

            $responseData['verification_status'] =
                $enrollment?->verification_status;

            $responseData['enrollment_number'] =
                $enrollment?->enrollment_number;

            $responseData['enrollment_date'] =
                $enrollment?->enrollment_date;

            $responseData['verified_by'] =
                $enrollment?->verified_by;

            $responseData['verified_at'] =
                $enrollment?->verified_at;

            $responseData['verification_notes'] =
                $enrollment?->verification_notes;
            $responseData['status_history'] =
                $enrollment?->status_history;
            $responseData['enrollment'] = $enrollment;

            $responseData['verification_history'] =
                $verificationHistory;

            return response()->json([
                'success' => true,
                'message' => 'User retrieved successfully',
                'data' => $responseData,
            ]);
        } catch (ModelNotFoundException $e) {

            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        } catch (\Exception $e) {

            Log::error(
                'Error fetching loan customer',
                [
                    'message' => $e->getMessage()
                ]
            );

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve user'
            ], 500);
        }
    }
    public function update(Request $request, string $id)
    {
        try {
            $user = LoanCustomer::where('customer_unique_id', $id)
                ->where('is_deleted', 0)
                ->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            $validatedData = $request->validate([
                'agent_unique_id' => 'nullable|string|exists:loan_agents,agent_unique_id',
                'sourcing_type' => 'nullable|in:self,referral',
                'referral_id' => 'nullable|string|required_if:sourcing_type,referral',
                'user_id' => 'nullable',
                'branch_id' => 'nullable',
                'cms_admin_id' => 'nullable',
                'firstName' => 'nullable|string|max:255',
                'middleName' => 'nullable|string|max:255',
                'lastName' => 'nullable|string|max:255',
                'gender' => 'nullable|in:male,female,other',
                'dob' => 'nullable|date',
                'fatherName' => 'nullable|string',
                'serviceAreaPin' => 'nullable|string|max:6',
                'religion' => 'nullable|string',
                'caste' => 'nullable|string',
                'enrollmentDate' => 'nullable',
                'aadhaarNumber' => 'nullable|string',
                'panNumber' => 'nullable|string',
                'voterIdNumber' => 'nullable|string',
                'drivingLicenseNumber' => 'nullable|string',
                'rationCardNumber' => 'nullable|string',
                'aadhaarImage' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
                'panImage' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
                'panCardImage' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
                'voterIdImage' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
                'drivingLicenseImage' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
                'rationCardImage' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
                'permanentAddress' => 'nullable|string',
                'correspondenceAddress' => 'nullable|string',
                'contactNumber1' => 'nullable|string|max:20',
                'contactNumber2' => 'nullable|string|max:20',
                'emailId' => 'nullable|email|unique:loan_customers,email,' . $user->id . ',id,is_deleted,0',
                'nomineeName' => 'nullable|string',
                'nomineeRelationship' => 'nullable|string',
                'nomineeAddress' => 'nullable|string',
                'occupation' => 'nullable|string',
                'salariedType' => 'nullable|string',
                'businessNature' => 'nullable|string',
                'spouseOccupation' => 'nullable|string',
                'spouseSalariedType' => 'nullable|string',
                'spouseBusinessNature' => 'nullable|string',
                'residenceType' => 'nullable|string',
                'yearsOfStaying' => 'nullable|string',
                'houseType' => 'nullable|string',
                'numberOfRooms' => 'nullable|string',
                'assets' => 'nullable|string',
                'customerPhoto' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:2048',
                // Also accept profileForm[key] nested format
                'profileForm.firstName' => 'nullable|string|max:255',
                'profileForm.middleName' => 'nullable|string|max:255',
                'profileForm.lastName' => 'nullable|string|max:255',
                'profileForm.gender' => 'nullable|in:male,female,other',
                'profileForm.dob' => 'nullable|date',
                'profileForm.fatherName' => 'nullable|string',
                'profileForm.serviceAreaPin' => 'nullable|string|max:6',
                'profileForm.religion' => 'nullable|string',
                'profileForm.caste' => 'nullable|string',
                'profileForm.enrollmentDate' => 'nullable',
                'profileForm.aadhaarNumber' => 'nullable|string',
                'profileForm.panNumber' => 'nullable|string',
                'profileForm.voterIdNumber' => 'nullable|string',
                'profileForm.drivingLicenseNumber' => 'nullable|string',
                'profileForm.rationCardNumber' => 'nullable|string',
                'profileForm.permanentAddress' => 'nullable|string',
                'profileForm.correspondenceAddress' => 'nullable|string',
                'profileForm.contactNumber1' => 'nullable|string|max:20',
                'profileForm.contactNumber2' => 'nullable|string|max:20',
                'profileForm.emailId' => 'nullable|email|unique:loan_customers,email,' . $user->id . ',id,is_deleted,0',
                'profileForm.nomineeName' => 'nullable|string',
                'profileForm.nomineeRelationship' => 'nullable|string',
                'profileForm.nomineeRelationshipOther' => 'nullable|string',
                'profileForm.nomineeAddress' => 'nullable|string',
                'profileForm.occupation' => 'nullable|string',
                'profileForm.salariedType' => 'nullable|string',
                'profileForm.businessNature' => 'nullable|string',
                'profileForm.spouseOccupation' => 'nullable|string',
                'profileForm.spouseSalariedType' => 'nullable|string',
                'profileForm.spouseBusinessNature' => 'nullable|string',
                'profileForm.residenceType' => 'nullable|string',
                'profileForm.yearsOfStaying' => 'nullable|string',
                'profileForm.houseType' => 'nullable|string',
                'profileForm.numberOfRooms' => 'nullable|string',
                'profileForm.assets' => 'nullable|string',
                'profileForm.isDisabled' => 'nullable|string',
                'profileForm.disabilityType' => 'nullable|string',
            ], [
                'aadhaarImage.max'        => 'The aadhaar image must not be greater than 2 MB.',
                'panImage.max'            => 'The PAN image must not be greater than 2 MB.',
                'voterIdImage.max'        => 'The voter ID image must not be greater than 2 MB.',
                'drivingLicenseImage.max' => 'The driving license image must not be greater than 2 MB.',
                'rationCardImage.max'     => 'The ration card image must not be greater than 2 MB.',
                'customerPhoto.max'       => 'The customer photo must not be greater than 2 MB.',
            ]);

            $updateData = [];

            // Parse kycNumbers JSON string from profileForm
            $kycNumbersRaw = $request->input('profileForm.kycNumbers');
            $kycNumbers = [];
            if ($kycNumbersRaw) {
                $decoded = is_string($kycNumbersRaw) ? json_decode($kycNumbersRaw, true) : $kycNumbersRaw;
                if (is_array($decoded)) $kycNumbers = $decoded;
            }

            // Support both flat keys and profileForm[key] nested keys
            $get = function ($key) use ($request, $validatedData) {
                return $validatedData[$key] ?? $request->input('profileForm.' . $key) ?? null;
            };

            if (!empty($get('firstName')) || !empty($get('lastName'))) {
                $updateData['name'] = trim(($get('firstName') ?? $user->first_name ?? '') . ' ' . ($get('middleName') ?? $user->middle_name ?? '') . ' ' . ($get('lastName') ?? $user->last_name ?? ''));
            }

            // if (!is_null($get('enrollmentDate'))) $updateData['enrollment_date'] = $get('enrollmentDate');
            if (!is_null($get('firstName'))) $updateData['first_name'] = $get('firstName');
            if (!is_null($get('middleName'))) $updateData['middle_name'] = $get('middleName');
            if (!is_null($get('lastName'))) $updateData['last_name'] = $get('lastName');
            if (!is_null($get('gender'))) $updateData['gender'] = $get('gender');
            if (!is_null($get('dob'))) $updateData['date_of_birth'] = $get('dob');
            if (!is_null($get('fatherName'))) $updateData['father_name'] = $get('fatherName');
            if (!is_null($get('serviceAreaPin'))) $updateData['service_area_pin'] = $get('serviceAreaPin');
            if (!is_null($get('religion'))) $updateData['religion'] = $get('religion');
            if (!is_null($get('caste'))) $updateData['caste'] = $get('caste');
            if (!is_null($get('emailId'))) $updateData['email'] = $get('emailId');
            if (!is_null($get('contactNumber1'))) {
                $updateData['phone_no'] = $get('contactNumber1');
                $updateData['contact_number_1'] = $get('contactNumber1');
            }
            if (!is_null($get('contactNumber2'))) $updateData['contact_number_2'] = $get('contactNumber2');
            if (!is_null($get('permanentAddress'))) {
                $updateData['address_1'] = $get('permanentAddress');
                $updateData['permanent_address'] = $get('permanentAddress');
            }
            if (!is_null($get('correspondenceAddress'))) {
                $updateData['address_2'] = $get('correspondenceAddress');
                $updateData['correspondence_address'] = $get('correspondenceAddress');
            }
            if (!is_null($get('nomineeName'))) $updateData['nominee_name'] = $get('nomineeName');
            if (!is_null($get('nomineeRelationship'))) {
                $updateData['nominee_relationship'] = $get('nomineeRelationship');
                $nomineeRelOther = $get('nomineeRelationshipOther');
                $updateData['nominee_relationship_other'] = ($get('nomineeRelationship') === 'Other' && !is_null($nomineeRelOther))
                    ? $nomineeRelOther
                    : null;
            }
            if (!is_null($get('nomineeAddress'))) $updateData['nominee_address'] = $get('nomineeAddress');
            if (!is_null($get('occupation'))) $updateData['occupation'] = $get('occupation');
            if (!is_null($get('salariedType'))) $updateData['salaried_type'] = $get('salariedType');
            if (!is_null($get('businessNature'))) $updateData['business_nature'] = $get('businessNature');
            if (!is_null($get('spouseOccupation'))) $updateData['spouse_occupation'] = $get('spouseOccupation');
            if (!is_null($get('spouseSalariedType'))) $updateData['spouse_salaried_type'] = $get('spouseSalariedType');
            if (!is_null($get('spouseBusinessNature'))) $updateData['spouse_business_nature'] = $get('spouseBusinessNature');
            if (!is_null($get('residenceType'))) $updateData['residence_type'] = $get('residenceType');
            if (!is_null($get('yearsOfStaying'))) $updateData['years_of_staying'] = $get('yearsOfStaying');
            if (!is_null($get('houseType'))) $updateData['house_type'] = $get('houseType');
            if (!is_null($get('numberOfRooms'))) $updateData['number_of_rooms'] = $get('numberOfRooms');
            if (!is_null($get('assets'))) $updateData['assets'] = $get('assets');

            $rawIsDisabled = $request->input('profileForm.isDisabled') ?? $request->input('isDisabled');
            if (!is_null($rawIsDisabled) && $rawIsDisabled !== '') {
                $normalized = strtolower((string) $rawIsDisabled);
                $isDisabledValue = in_array($normalized, ['yes', '1', 'true']) ? true
                    : (in_array($normalized, ['no', '0', 'false']) ? false : null);
                if (!is_null($isDisabledValue)) {
                    $updateData['is_disabled'] = $isDisabledValue;
                    $updateData['disability_type'] = $isDisabledValue
                        ? ($request->input('profileForm.disabilityType') ?? $request->input('disabilityType'))
                        : null;
                }
            }

            if (isset($validatedData['user_id'])) $updateData['user_id'] = $validatedData['user_id'];
            if (isset($validatedData['branch_id'])) $updateData['branch_id'] = $validatedData['branch_id'];
            if (isset($validatedData['cms_admin_id'])) $updateData['cms_admin_id'] = $validatedData['cms_admin_id'];
            if (isset($validatedData['agent_unique_id'])) $updateData['agent_unique_id'] = $validatedData['agent_unique_id'];
            if (isset($validatedData['sourcing_type'])) $updateData['sourcing_type'] = $validatedData['sourcing_type'];
            if (isset($validatedData['referral_id'])) $updateData['referral_id'] = $validatedData['referral_id'];

            // KYC numbers — support both flat keys and profileForm[kycNumbers] JSON
            if (!empty($kycNumbers['aadhaar'])) $updateData['adhaar_number'] = $kycNumbers['aadhaar'];
            elseif (!is_null($get('aadhaarNumber'))) $updateData['adhaar_number'] = $get('aadhaarNumber');

            if (!empty($kycNumbers['panCard'])) $updateData['pan_number'] = $kycNumbers['panCard'];
            elseif (!is_null($get('panNumber'))) $updateData['pan_number'] = $get('panNumber');

            if (!empty($kycNumbers['drivingLicense'])) $updateData['driving_license_number'] = $kycNumbers['drivingLicense'];
            elseif (!is_null($get('drivingLicenseNumber'))) $updateData['driving_license_number'] = $get('drivingLicenseNumber');

            if (!empty($kycNumbers['voterId'])) $updateData['voter_id_number'] = $kycNumbers['voterId'];
            elseif (!is_null($get('voterIdNumber'))) $updateData['voter_id_number'] = $get('voterIdNumber');

            if (!empty($kycNumbers['rationCard'])) $updateData['ration_card_number'] = $kycNumbers['rationCard'];
            elseif (!is_null($get('rationCardNumber'))) $updateData['ration_card_number'] = $get('rationCardNumber');

            if (!empty($kycNumbers['otherName'])) $updateData['other_name'] = $kycNumbers['otherName'];
            elseif (!is_null($get('otherName'))) $updateData['other_name'] = $get('otherName');

            $destinationPath = public_path('loan_customer_documents');
            if (!is_dir($destinationPath)) mkdir($destinationPath, 0755, true);

            // Map: [flat_key or kycImages[key]] => db_field
            // Supports both flat (aadhaarImage) and nested (kycImages[adhaarImageBack]) formats
            $imageFields = [
                'aadhaarImage'        => 'adhaar_image',
                'panImage'            => 'pan_image',
                'panCardImage'        => 'pan_image', // add this
                'voterIdImage'        => 'voter_id_image',
                'drivingLicenseImage' => 'driving_license_image',
                'rationCardImage'     => 'ration_card_image',
            ];

            // Nested kycImages[*] fields (note: frontend sends adhaarImageBack not aadhaarImageBack)
            $nestedImageFields = [
                'adhaarImageBack'   => 'adhaar_image_back',
                'aadhaarImageBack'  => 'adhaar_image_back',
                'voterIdImageBack'  => 'voter_id_image_back',
                'otherDocument'     => 'other_document',
            ];
            Log::info('UPDATE FILES', [
                'files' => array_keys($request->allFiles()),
                'has_panCardImage' => $request->hasFile('panCardImage'),
            ]);
            foreach ($imageFields as $requestField => $dbField) {
                if ($request->hasFile($requestField)) {
                    $file = $request->file($requestField);
                    $filename = time() . '_' . $requestField . '_' . $file->getClientOriginalName();
                    $file->move($destinationPath, $filename);
                    $updateData[$dbField] = 'loan_customer_documents/' . $filename;
                }
            }

            // Handle nested kycImages[*] files
            foreach ($nestedImageFields as $requestField => $dbField) {
                // Check flat key first, then nested under kycImages
                if ($request->hasFile($requestField)) {
                    $file = $request->file($requestField);
                } elseif ($request->hasFile('kycImages.' . $requestField)) {
                    $file = $request->file('kycImages.' . $requestField);
                } else {
                    continue;
                }
                $filename = time() . '_' . $requestField . '_' . $file->getClientOriginalName();
                $file->move($destinationPath, $filename);
                $updateData[$dbField] = 'loan_customer_documents/' . $filename;
            }

            if ($request->hasFile('customerPhoto')) {
                $file = $request->file('customerPhoto');
                $filename = time() . '_customer_photo_' . $file->getClientOriginalName();
                $file->move($destinationPath, $filename);
                $updateData['customer_photo'] = 'loan_customer_documents/' . $filename;
            }


            $enrollment = CustomerEnrollment::where(
                'customer_unique_id',
                $user->customer_unique_id
            );

            if ($request->filled('enrollment_number')) {

                $enrollment->where(
                    'enrollment_number',
                    $request->enrollment_number
                );
            } else {

                $enrollment->orderByDesc('id');
            }

            $enrollment = $enrollment->first();

            if ($enrollment && !is_null($get('enrollmentDate'))) {

                $enrollment->update([
                    'enrollment_date' => $get('enrollmentDate')
                ]);
            }
            $user->update($updateData);
            $user = $user->fresh()->load('roleData');

            $enrollment = CustomerEnrollment::where(
                'customer_unique_id',
                $user->customer_unique_id
            )
                ->when(
                    $request->filled('enrollment_number'),
                    fn($q) => $q->where(
                        'enrollment_number',
                        $request->enrollment_number
                    ),
                    fn($q) => $q->orderByDesc('id')
                )
                ->first();

            $data = $user->toArray();

            $data['status'] = $enrollment?->status;
            $data['verification_status'] = $enrollment?->verification_status;
            $data['enrollment_number'] = $enrollment?->enrollment_number;
            $data['enrollment_date'] = $enrollment?->enrollment_date;
            $data['enrollment'] = $enrollment;

            return response()->json([
                'success' => true,
                'message' => 'User updated successfully',
                'data' => $data
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating loan customer: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update user'
            ], 500);
        }
    }

    public function verifyCustomer(Request $request, string $customerUniqueId)
    {
        try {

            $validatedData = $request->validate([
                'enrollment_number' => 'required|string',
                'verification_status' => 'required|in:verified',
                'verification_notes' => 'nullable|string|max:500',
                'occupation_details_applicant' => 'nullable|boolean',
                'occupation_details_nominee' => 'nullable|boolean',
                'house_details' => 'nullable|boolean',
                'assets_details' => 'nullable|boolean',
            ]);

            $customer = LoanCustomer::where(
                'customer_unique_id',
                $customerUniqueId
            )->where('is_deleted', 0)
                ->firstOrFail();

            $enrollment = CustomerEnrollment::where(
                'customer_unique_id',
                $customerUniqueId
            )
                ->where(
                    'enrollment_number',
                    $validatedData['enrollment_number']
                )
                ->firstOrFail();

            if (!$enrollment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Enrollment not found'
                ], 404);
            }

            $user = auth()->user();

            $adminId = $user->user_id ?? $user->id ?? 'system';
            $adminName = $user->name ?? $user->first_name ?? 'Admin';

            /*
        |--------------------------------------------------------------------------
        | Update Enrollment
        |--------------------------------------------------------------------------
        */

            $history = is_array($enrollment->status_history)
                ? $enrollment->status_history
                : [];

            $history[] = [
                'status' => $validatedData['verification_status'],
                'timestamp' => now()->toDateTimeString(),
                'reason' => $validatedData['verification_notes']
                    ?? 'Customer verification updated',
                'performed_by' => $adminId,
                'enrollment_number' => $enrollment->enrollment_number,
            ];

            $enrollment->update([
                'verification_status' => $validatedData['verification_status'],
                'verified_by' => $adminId,
                'verified_at' => now(),
                'verification_notes' => $validatedData['verification_notes'] ?? null,
                'status_history' => $history,
            ]);

            /*
        |--------------------------------------------------------------------------
        | Save Verification History
        |--------------------------------------------------------------------------
        */

            LoanCustomerVerificationHistory::create([
                'customer_unique_id' => $customer->customer_unique_id,
                'enrollment_number' => $enrollment->enrollment_number,

                'status' => $validatedData['verification_status'],
                'reason' => $validatedData['verification_notes'] ?? null,

                'occupation_details_applicant' => $validatedData['occupation_details_applicant'] ?? false,
                'occupation_details_nominee' => $validatedData['occupation_details_nominee'] ?? false,
                'house_details' => $validatedData['house_details'] ?? false,
                'assets_details' => $validatedData['assets_details'] ?? false,

                'admin_id' => $adminId,
                'admin_name' => $adminName,
            ]);

            /*
        |--------------------------------------------------------------------------
        | Return Same Response Structure
        |--------------------------------------------------------------------------
        */

            $customerData = $customer->fresh()->toArray();

            $customerData['enrollment'] = $enrollment->fresh();

            return response()->json([
                'success' => true,
                'message' => 'Customer verification updated successfully',
                'data' => $customerData,
            ]);
        } catch (ModelNotFoundException $e) {

            return response()->json([
                'success' => false,
                'message' => 'Customer not found with ID: ' . $customerUniqueId
            ], 404);
        } catch (ValidationException $e) {

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {

            Log::error('Error verifying customer', [
                'customer_unique_id' => $customerUniqueId,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to verify customer',
                'error_details' => $e->getMessage(),
            ], 500);
        }
    }

    public function rejectCustomer(Request $request, string $customerUniqueId)
    {
        try {

            $validatedData = $request->validate([
                'reason' => 'required|string|max:500',
                'occupation_details_applicant' => 'nullable|boolean',
                'occupation_details_nominee' => 'nullable|boolean',
                'house_details' => 'nullable|boolean',
                'assets_details' => 'nullable|boolean',
                'enrollment_number' => 'required|string',
            ]);

            $customer = LoanCustomer::where(
                'customer_unique_id',
                $customerUniqueId
            )->where('is_deleted', 0)
                ->firstOrFail();

            $enrollment = CustomerEnrollment::where(
                'customer_unique_id',
                $customerUniqueId
            )
                ->where(
                    'enrollment_number',
                    $validatedData['enrollment_number']
                )
                ->firstOrFail();

            $user = auth()->user();

            $adminId = $user->user_id ?? $user->id ?? 'system';
            $adminName = $user->name ?? $user->first_name ?? 'Admin';

            /*
        |--------------------------------------------------------------------------
        | Update Enrollment
        |--------------------------------------------------------------------------
        */

            $history = is_array($enrollment->status_history)
                ? $enrollment->status_history
                : [];

            $history[] = [
                'status' => 'rejected',
                'timestamp' => now()->toDateTimeString(),
                'reason' => $validatedData['reason'],
                'performed_by' => $adminId,
                'enrollment_number' => $enrollment->enrollment_number,
                'flow_type' => 'verification',
            ];

            $enrollment->update([
                'verification_status' => 'rejected',
                'verified_by' => $adminId,
                'verified_at' => now(),
                'verification_notes' => $validatedData['reason'],
                'rejection_reason' => $validatedData['reason'],
                'status_history' => $history,
            ]);

            /*
        |--------------------------------------------------------------------------
        | Verification History
        |--------------------------------------------------------------------------
        */

            LoanCustomerVerificationHistory::create([
                'customer_unique_id' => $customer->customer_unique_id,
                'enrollment_number' => $enrollment->enrollment_number,

                'status' => 'rejected',
                'reason' => $validatedData['reason'],

                'occupation_details_applicant' =>
                $validatedData['occupation_details_applicant'] ?? false,

                'occupation_details_nominee' =>
                $validatedData['occupation_details_nominee'] ?? false,

                'house_details' =>
                $validatedData['house_details'] ?? false,

                'assets_details' =>
                $validatedData['assets_details'] ?? false,

                'admin_id' => $adminId,
                'admin_name' => $adminName,
            ]);

            $customerData = $customer->fresh()->toArray();
            $customerData['enrollment'] = $enrollment->fresh();

            return response()->json([
                'success' => true,
                'message' => 'Customer application rejected successfully',
                'data' => $customerData,
            ]);
        } catch (ModelNotFoundException $e) {

            return response()->json([
                'success' => false,
                'message' => 'Customer or Enrollment not found'
            ], 404);
        } catch (ValidationException $e) {

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {

            Log::error('Error rejecting customer', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to reject customer',
                'error_details' => $e->getMessage(),
            ], 500);
        }
    }

    public function getVerificationHistory(
        Request $request,
        string $customerUniqueId
    ) {
        try {

            $customer = LoanCustomer::where(
                'customer_unique_id',
                $customerUniqueId
            )->where('is_deleted', 0)
                ->firstOrFail();

            $historyQuery = LoanCustomerVerificationHistory::where(
                'customer_unique_id',
                $customerUniqueId
            );

            // Filter by enrollment if provided
            if ($request->filled('enrollment_number')) {

                $historyQuery->where(
                    'enrollment_number',
                    $request->enrollment_number
                );
            }

            $history = $historyQuery
                ->orderBy('created_at', 'desc')
                ->get();

            $enrollment = null;

            if ($request->filled('enrollment_number')) {

                $enrollment = CustomerEnrollment::where(
                    'customer_unique_id',
                    $customerUniqueId
                )
                    ->where(
                        'enrollment_number',
                        $request->enrollment_number
                    )
                    ->first();
            }

            return response()->json([
                'success' => true,
                'message' => 'Verification history retrieved successfully',
                'data' => [
                    'customer' => $customer,
                    'enrollment' => $enrollment,
                    'history' => $history
                ]
            ]);
        } catch (ModelNotFoundException $e) {

            return response()->json([
                'success' => false,
                'message' => 'Customer not found'
            ], 404);
        } catch (\Exception $e) {

            Log::error(
                'Error fetching verification history: ' .
                    $e->getMessage()
            );

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve verification history'
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        try {

            if (!is_numeric($id) || $id <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid user ID provided'
                ], 400);
            }

            $customer = LoanCustomer::findOrFail($id);

            // Soft delete customer
            $customer->softDelete();

            return response()->json([
                'success' => true,
                'message' => 'Customer deleted successfully'
            ]);
        } catch (ModelNotFoundException $e) {

            return response()->json([
                'success' => false,
                'message' => 'Customer not found'
            ], 404);
        } catch (\Exception $e) {

            Log::error(
                'Error deleting customer: ' .
                    $e->getMessage()
            );

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete customer'
            ], 500);
        }
    }

    /**
     * Cascade soft delete customer → CAF → PD → CAM → Disbursement → Loan → EMI Schedules
     */
    public function deleteCustomer(string $id)
    {
        try {
            $customer = LoanCustomer::withoutGlobalScope('notDeleted')
                ->where('id', $id)
                ->orWhere('customer_unique_id', $id)
                ->first();

            if (!$customer) {
                return response()->json(['success' => false, 'message' => 'Customer not found'], 404);
            }

            $customerId = $customer->customer_unique_id;
            $deleted = [];

            // CAFs
            $cafIds = \App\Models\Loan\CreditApplicationForm::withoutGlobalScope('notDeleted')
                ->where('customer_unique_id', $customerId)
                ->where('is_deleted', 0)
                ->pluck('loan_application_id');

            if ($cafIds->isNotEmpty()) {
                // PD
                $pdCount = \App\Models\Loan\PdInformation::withoutGlobalScope('not_deleted')
                    ->whereIn('loan_application_id', $cafIds)->where('is_deleted', 0)->count();
                if ($pdCount > 0) {
                    \App\Models\Loan\PdInformation::withoutGlobalScope('not_deleted')
                        ->whereIn('loan_application_id', $cafIds)->update(['is_deleted' => 1]);
                    $deleted['pd'] = ['table' => 'loan_pd_information', 'records_deleted' => $pdCount];
                }

                // CAM
                $camCount = \App\Models\Loan\CAM::withoutGlobalScope('not_deleted')
                    ->whereIn('loan_application_id', $cafIds)->where('is_deleted', 0)->count();
                if ($camCount > 0) {
                    \App\Models\Loan\CAM::withoutGlobalScope('not_deleted')
                        ->whereIn('loan_application_id', $cafIds)->update(['is_deleted' => 1]);
                    $deleted['cam'] = ['table' => 'loan_cam', 'records_deleted' => $camCount];
                }

                // Disbursement
                $disbCount = \App\Models\Loan\Disbursement::withoutGlobalScope('not_deleted')
                    ->whereIn('loan_application_id', $cafIds)->where('is_deleted', 0)->count();
                if ($disbCount > 0) {
                    \App\Models\Loan\Disbursement::withoutGlobalScope('not_deleted')
                        ->whereIn('loan_application_id', $cafIds)->update(['is_deleted' => 1]);
                    $deleted['disbursement'] = ['table' => 'loan_disbursements', 'records_deleted' => $disbCount];
                }

                // Loans
                $loanNumbers = \App\Models\Loan\Loan::withoutGlobalScope('not_deleted')
                    ->whereIn('loan_application_id', $cafIds)->pluck('loan_number');

                if ($loanNumbers->isNotEmpty()) {
                    // EMI Schedules
                    $emiCount = \App\Models\Loan\EmiSchedule::withoutGlobalScope('not_deleted')
                        ->whereIn('loan_id', $loanNumbers)->where('is_deleted', 0)->count();
                    if ($emiCount > 0) {
                        \App\Models\Loan\EmiSchedule::withoutGlobalScope('not_deleted')
                            ->whereIn('loan_id', $loanNumbers)->update(['is_deleted' => 1]);
                        $deleted['emi_schedules'] = ['table' => 'loan_emi_schedules', 'records_deleted' => $emiCount];
                    }

                    // EMI Payments
                    $emiPaymentCount = \App\Models\Loan\EmiPayment::whereIn('loan_id', $loanNumbers)
                        ->where('is_deleted', 0)->count();
                    if ($emiPaymentCount > 0) {
                        \App\Models\Loan\EmiPayment::whereIn('loan_id', $loanNumbers)
                            ->update(['is_deleted' => 1]);
                        $deleted['emi_payments'] = ['table' => 'loan_emi_payments', 'records_deleted' => $emiPaymentCount];
                    }

                    $loanCount = $loanNumbers->count();
                    \App\Models\Loan\Loan::withoutGlobalScope('not_deleted')
                        ->whereIn('loan_number', $loanNumbers)->update(['is_deleted' => 1]);
                    $deleted['loans'] = ['table' => 'loan_loans', 'records_deleted' => $loanCount, 'loan_numbers' => $loanNumbers->values()];
                }

                // CAFs
                $cafCount = $cafIds->count();
                \App\Models\Loan\CreditApplicationForm::withoutGlobalScope('notDeleted')
                    ->whereIn('loan_application_id', $cafIds)->update(['is_deleted' => 1]);
                $deleted['caf'] = ['table' => 'loan_credit_application_forms', 'records_deleted' => $cafCount, 'caf_ids' => $cafIds->values()];
            }

            // Enrollments
            $enrollmentCount = \App\Models\Loan\CustomerEnrollment::where('customer_unique_id', $customerId)
                ->count();
            if ($enrollmentCount > 0) {
                \App\Models\Loan\CustomerEnrollment::where('customer_unique_id', $customerId)
                    ->delete();
                $deleted['enrollments'] = ['table' => 'customer_enrollments', 'records_deleted' => $enrollmentCount];
            }

            LoanCustomerVerificationHistory::where(
                'customer_unique_id',
                $customerId
            )->delete();
            // Customer
            LoanCustomer::withoutGlobalScope('notDeleted')->where('customer_unique_id', $customerId)->update(['is_deleted' => 1]);
            $deleted['customer'] = ['table' => 'loan_customers', 'records_deleted' => 1, 'customer_unique_id' => $customerId];

            return response()->json([
                'success' => true,
                'message' => 'Customer and all related records soft deleted successfully',
                'customer_unique_id' => $customerId,
                'deleted_summary' => $deleted,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Customer not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error cascade deleting customer: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'message' => 'Failed to delete: ' . $e->getMessage()], 500);
        }
    }

    public function cancelDeletionRequest(Request $request, string $customerUniqueId)
    {
        try {
            $request->validate(['reason' => 'nullable|string']);

            $customer = LoanCustomer::where('customer_unique_id', $customerUniqueId)
                ->where('is_deleted', 0)
                ->firstOrFail();

            if (!$customer->is_delete_requested) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active deletion request found for this customer'
                ], 400);
            }

            $history = is_array($customer->status_history) ? $customer->status_history : [];
            $history[] = [
                'status' => $customer->status,
                'timestamp' => now()->toDateTimeString(),
                'reason' => $request->reason ?? 'Deletion request cancelled',
                'updated_by' => auth()->user()->user_id ?? auth()->user()->name,
            ];

            $customer->update([
                'is_delete_requested' => 0,
                'status_history' => $history
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Deletion request cancelled successfully',
                'data' => $customer->fresh()
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Customer not found'], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel deletion request: ' . $e->getMessage()
            ], 500);
        }
    }

    public function deletionRequest(Request $request, string $customerUniqueId)
    {
        try {
            $request->validate([
                'reason' => 'nullable|string'
            ]);

            $customer = LoanCustomer::where('customer_unique_id', $customerUniqueId)
                ->where('is_deleted', 0)
                ->firstOrFail();

            $history = is_array($customer->status_history) ? $customer->status_history : [];
            $history[] = [
                'status' => $customer->status,
                'timestamp' => now()->toDateTimeString(),
                'reason' => $request->reason ?? 'Deletion request raised',
                'updated_by' => auth()->user()->user_id ?? auth()->user()->name,
            ];

            $customer->update([
                'is_delete_requested' => 1,
                'status_history' => $history
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Deletion request submitted successfully',
                'data' => $customer->fresh()
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Customer not found'], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit deletion request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Change the status of a customer from field_executive to branch_support_executive.
     */
    public function promoteToBranchManager(string $customerUniqueId)
    {
        try {

            $customer = LoanCustomer::where(
                'customer_unique_id',
                $customerUniqueId
            )->where('is_deleted', 0)
                ->firstOrFail();

            $enrollment = CustomerEnrollment::where(
                'customer_unique_id',
                $customerUniqueId
            )
                ->latest('id')
                ->first();

            if (!$enrollment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Enrollment not found'
                ], 404);
            }

            if ($enrollment->status !== 'field_executive') {
                return response()->json([
                    'success' => false,
                    'message' =>
                    'Only field executives can be promoted to branch support executive. Current status: '
                        . $enrollment->status
                ], 400);
            }

            $history = is_array($enrollment->status_history)
                ? $enrollment->status_history
                : [];

            $history[] = [
                'status' => 'branch_support_executive',
                'timestamp' => now()->toISOString(),
                'reason' => 'Resubmitted to BSE after FE correction',
                'performed_by' => auth()->user()?->user_id ?? auth()->id(),
                'enrollment_number' => $enrollment->enrollment_number,
            ];

            $enrollment->update([
                'status' => 'branch_support_executive',
                'verification_status' => 'pending',
                'verification_notes' => null,
                'reverted_by' => null,
                'reverted_at' => null,
                'status_history' => $history,
            ]);

            $customerData = $customer->toArray();
            $enrollment = $enrollment->fresh();

            $customerData['status'] = $enrollment->status;
            $customerData['status_history'] = $enrollment->status_history;
            $customerData['enrollment'] = $enrollment;

            return response()->json([
                'success' => true,
                'message' => 'User promoted to Branch Support Executive successfully',
                'data' => $customerData
            ]);
        } catch (ModelNotFoundException $e) {

            return response()->json([
                'success' => false,
                'message' => 'User not found with ID: ' . $customerUniqueId
            ], 404);
        } catch (\Exception $e) {

            Log::error(
                'Error promoting customer to branch support executive: '
                    . $e->getMessage(),
                [
                    'customer_unique_id' => $customerUniqueId,
                    'trace' => $e->getTraceAsString()
                ]
            );

            return response()->json([
                'success' => false,
                'message' => 'Failed to promote user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Change the status of a customer from branch_support_executive back to field_executive.
     */
    public function revertToFieldExecutive(
        Request $request,
        string $customerUniqueId
    ) {
        try {

            $validatedData = $request->validate([
                'reason' => 'required|string|max:500'
            ]);

            $customer = LoanCustomer::where(
                'customer_unique_id',
                $customerUniqueId
            )->where('is_deleted', 0)
                ->firstOrFail();

            $enrollment = CustomerEnrollment::where(
                'customer_unique_id',
                $customerUniqueId
            )
                ->latest('id')
                ->first();

            if (!$enrollment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Enrollment not found'
                ], 404);
            }

            if ($enrollment->status !== 'branch_support_executive') {
                return response()->json([
                    'success' => false,
                    'message' =>
                    'Only branch support executives can be reverted to field executive. Current status: '
                        . $enrollment->status
                ], 400);
            }

            $history = is_array($enrollment->status_history)
                ? $enrollment->status_history
                : [];

            $history[] = [
                'status' => 'field_executive',
                'timestamp' => now()->toISOString(),
                'reason' => $validatedData['reason'],
                'changed_by' =>
                auth()->user()->user_id
                    ?? auth()->id()
                    ?? 'system',
                'enrollment_number' =>
                $enrollment->enrollment_number,
            ];

            $enrollment->update([
                'status' => 'field_executive',
                'verification_status' => 'reverted',
                'verification_notes' => $validatedData['reason'],
                'reverted_by' =>
                auth()->user()->user_id
                    ?? auth()->id()
                    ?? 'system',
                'reverted_at' => now(),
                'status_history' => $history,
            ]);

            $customerData = $customer->toArray();

            $customerData['status'] =
                $enrollment->fresh()->status;

            $customerData['verification_status'] =
                $enrollment->fresh()->verification_status;

            $customerData['enrollment'] =
                $enrollment->fresh();

            return response()->json([
                'success' => true,
                'message' =>
                'User reverted to Field Executive successfully',
                'data' => $customerData
            ]);
        } catch (ModelNotFoundException $e) {

            return response()->json([
                'success' => false,
                'message' =>
                'User not found with ID: ' .
                    $customerUniqueId
            ], 404);
        } catch (\Exception $e) {

            Log::error(
                'Error reverting customer to field executive: '
                    . $e->getMessage()
            );

            return response()->json([
                'success' => false,
                'message' => 'Failed to revert user'
            ], 500);
        }
    }

    /**
     * Get all customers that have been promoted to branch_support_executive or branch_manager.
     */
    public function getBranchManagers(Request $request)
    {
        try {
            Log::info('Fetching all branch support executives and branch managers');

            $query = CustomerEnrollment::with([
                'customer.roleData'
            ])->whereHas('customer', function ($q) {
                $q->where('is_deleted', 0);
            })->whereIn('status', [
                'branch_support_executive',
                'branch_manager'
            ]);

            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {

                    $q->where(
                        'customer_unique_id',
                        'like',
                        "%{$search}%"
                    )
                        ->orWhere(
                            'enrollment_number',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhereHas('customer', function ($customer) use ($search) {

                            $customer->where(
                                'first_name',
                                'like',
                                "%{$search}%"
                            )
                                ->orWhere(
                                    'last_name',
                                    'like',
                                    "%{$search}%"
                                )
                                ->orWhere(
                                    'email',
                                    'like',
                                    "%{$search}%"
                                )
                                ->orWhere(
                                    'contact_number_1',
                                    'like',
                                    "%{$search}%"
                                );
                        });
                });
            }

            // if ($request->has('user_id') && !empty($request->user_id)) {
            //     $query->where('user_id', $request->user_id);
            // }

            if ($request->has('branch_id') && !empty($request->branch_id)) {
                $query->where('branch_id', $request->branch_id);
            }

            if ($request->has('cms_admin_id') && !empty($request->cms_admin_id)) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            if ($request->has('verification_status') && !empty($request->verification_status)) {
                $query->where('verification_status', $request->verification_status);
            }

            $perPage = $request->get('per_page', 10);
            $users = $query->orderBy('created_at', 'desc')->paginate($perPage);

            $data = collect($users->items())->map(function ($enrollment) {

                return [

                    'id' => $enrollment->id,

                    'customer_unique_id' =>
                    $enrollment->customer_unique_id,

                    'enrollment_number' =>
                    $enrollment->enrollment_number,

                    'status' =>
                    $enrollment->status,

                    'verification_status' =>
                    $enrollment->verification_status,

                    'created_at' =>
                    $enrollment->created_at,

                    'updated_at' =>
                    $enrollment->updated_at,

                    'customer' => [

                        'first_name' =>
                        $enrollment->customer?->first_name,

                        'middle_name' =>
                        $enrollment->customer?->middle_name,

                        'last_name' =>
                        $enrollment->customer?->last_name,

                        'email' =>
                        $enrollment->customer?->email,

                        'contact_number_1' =>
                        $enrollment->customer?->contact_number_1,
                    ]
                ];
            });
            return response()->json([
                'success' => true,
                'message' => 'Branch support executives and branch managers retrieved successfully',
                'data' => $data,
                'pagination' => [
                    'current_page' => $users->currentPage(),
                    'per_page' => $users->perPage(),
                    'total' => $users->total(),
                    'last_page' => $users->lastPage(),
                    'from' => $users->firstItem(),
                    'to' => $users->lastItem()
                ],
                'filters' => [
                    'search' => $request->search,
                    'user_id' => $request->user_id,
                    'branch_id' => $request->branch_id,
                    'cms_admin_id' => $request->cms_admin_id,
                    'verification_status' => $request->verification_status
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching branch support executives and branch managers: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve branch support executives and branch managers'
            ], 500);
        }
    }

    /**
     * Get all soft deleted customers.
     */
    public function getTrashedCustomers(Request $request)
    {
        try {
            Log::info('Fetching all soft deleted loan customers');

            $query = LoanCustomer::onlyTrashed()
                ->with([
                    'roleData',
                    'enrollments' => function ($q) {
                        $q->latest('id');
                    }
                ]);

            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', '%' . $search . '%')
                        ->orWhere('middle_name', 'like', '%' . $search . '%')
                        ->orWhere('last_name', 'like', '%' . $search . '%')
                        ->orWhere('email', 'like', '%' . $search . '%')
                        ->orWhere('contact_number_1', 'like', '%' . $search . '%')
                        ->orWhere('customer_unique_id', 'like', '%' . $search . '%')
                        ->orWhereHas('enrollments', function ($enrollmentQuery) use ($search) {
                            $enrollmentQuery->where('enrollment_number', 'like', '%' . $search . '%');
                        });
                });
            }

            if ($request->has('branch_id') && !empty($request->branch_id)) {
                $query->where('branch_id', $request->branch_id);
            }

            if ($request->filled('cms_admin_id')) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            if ($request->filled('agent_unique_id')) {
                $query->where('agent_unique_id', $request->agent_unique_id);
            }

            if ($request->has('is_delete_requested') && $request->is_delete_requested !== '') {
                $isDeleteRequested = filter_var(
                    $request->is_delete_requested,
                    FILTER_VALIDATE_BOOLEAN,
                    FILTER_NULL_ON_FAILURE
                );

                $query->where('is_delete_requested', $isDeleteRequested ?? $request->boolean('is_delete_requested'));
            }

            if ($request->filled('status')) {
                $query->whereHas('enrollments', function ($q) use ($request) {
                    $q->where('status', $request->status);
                });
            }

            $perPage = min(max((int) $request->get('per_page', 10), 1), 100);
            $users = $query->orderBy('updated_at', 'desc')->paginate($perPage);


            $data = collect($users->items())->map(function ($customer) {

                $latestEnrollment = $customer->enrollments->first();

                return [

                    ...$customer->toArray(),

                    'status' => $latestEnrollment?->status,

                    'verification_status' =>
                    $latestEnrollment?->verification_status,

                    'enrollment_number' =>
                    $latestEnrollment?->enrollment_number,

                    'enrollment' => $latestEnrollment,
                ];
            });
            return response()->json([
                'success' => true,
                'message' => 'Deleted customers retrieved successfully',
                'data' => $data,
                'pagination' => [
                    'current_page' => $users->currentPage(),
                    'per_page' => $users->perPage(),
                    'total' => $users->total(),
                    'last_page' => $users->lastPage(),
                    'from' => $users->firstItem(),
                    'to' => $users->lastItem()
                ],
                'filters' => [
                    'search' => $request->search,
                    'branch_id' => $request->branch_id,
                    'cms_admin_id' => $request->cms_admin_id,
                    'agent_unique_id' => $request->agent_unique_id,
                    'status' => $request->status,
                    'is_delete_requested' => $request->is_delete_requested,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching deleted loan customers: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve deleted customers'
            ], 500);
        }
    }

    /**
     * Restore a soft deleted customer.
     */
    public function restoreCustomer(string $id)
    {
        try {
            if (!is_numeric($id) || $id <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid customer ID provided'
                ], 400);
            }

            $customer = LoanCustomer::onlyTrashed()->where('id', $id)->first();

            if (!$customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Deleted customer not found'
                ], 404);
            }

            $customer->update([
                'is_deleted' => 0,
                'is_delete_requested' => 0,
            ]);
            $customer = $customer->fresh()->load([
                'roleData',
                'enrollments' => function ($q) {
                    $q->latest('id');
                }
            ]);

            $latestEnrollment = $customer->enrollments->first();

            $data = $customer->toArray();

            $data['status'] = $latestEnrollment?->status;
            $data['verification_status'] = $latestEnrollment?->verification_status;
            $data['enrollment_number'] = $latestEnrollment?->enrollment_number;
            $data['enrollment'] = $latestEnrollment;
            return response()->json([
                'success' => true,
                'message' => 'Customer restored successfully',
                'data' => $data
            ]);
        } catch (\Exception $e) {
            Log::error('Error restoring loan customer: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to restore customer'
            ], 500);
        }
    }

    /**
     * Restore a customer and all records soft deleted by the customer cascade.
     */
    public function restoreDeletedCustomer(string $customerUniqueId)
    {
        try {
            $result = DB::transaction(function () use ($customerUniqueId) {
                $customer = LoanCustomer::onlyTrashed()
                    ->where('customer_unique_id', $customerUniqueId)
                    ->first();

                if (!$customer) {
                    return null;
                }

                $cafIds = CreditApplicationForm::withoutGlobalScope('notDeleted')
                    ->where('customer_unique_id', $customerUniqueId)
                    ->pluck('loan_application_id');

                $loanNumbers = Loan::withoutGlobalScope('not_deleted')
                    ->whereIn('loan_application_id', $cafIds)
                    ->pluck('loan_number');

                $restored = [
                    'pd' => PdInformation::withoutGlobalScope('not_deleted')
                        ->whereIn('loan_application_id', $cafIds)
                        ->update(['is_deleted' => 0]),
                    'cam' => CAM::withoutGlobalScope('not_deleted')
                        ->whereIn('loan_application_id', $cafIds)
                        ->update(['is_deleted' => 0]),
                    'disbursement' => Disbursement::withoutGlobalScope('not_deleted')
                        ->whereIn('loan_application_id', $cafIds)
                        ->update(['is_deleted' => 0]),
                    'emi_schedules' => EmiSchedule::withoutGlobalScope('not_deleted')
                        ->whereIn('loan_id', $loanNumbers)
                        ->update(['is_deleted' => 0]),
                    'emi_payments' => EmiPayment::whereIn('loan_id', $loanNumbers)
                        ->update(['is_deleted' => 0]),
                    'loans' => Loan::withoutGlobalScope('not_deleted')
                        ->whereIn('loan_number', $loanNumbers)
                        ->update(['is_deleted' => 0]),
                    'caf' => CreditApplicationForm::withoutGlobalScope('notDeleted')
                        ->whereIn('loan_application_id', $cafIds)
                        ->update(['is_deleted' => 0]),
                    'enrollments' => CustomerEnrollment::withoutGlobalScope('notDeleted')
                        ->where('customer_unique_id', $customerUniqueId)
                        ->update(['is_deleted' => 0]),
                ];

                $customer->update([
                    'is_deleted' => 0,
                    'is_delete_requested' => 0,
                ]);

                return [
                    'customer' => 1,
                    'customer_unique_id' => $customerUniqueId,
                    'restored' => $restored,
                ];
            });

            if (!$result) {
                return response()->json([
                    'success' => false,
                    'message' => 'Deleted customer not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Customer and all related records restored successfully',
                ...$result,
            ]);
        } catch (\Exception $e) {
            Log::error('Error restoring deleted loan customer: ' . $e->getMessage(), [
                'customer_unique_id' => $customerUniqueId,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to restore customer and related records'
            ], 500);
        }
    }

    /**
     * Permanently delete a soft deleted customer.
     */
    public function forceDeleteCustomer(string $id)
    {
        try {

            if (!is_numeric($id) || $id <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid customer ID provided'
                ], 400);
            }

            $customer = LoanCustomer::onlyTrashed()
                ->where('id', $id)
                ->first();

            if (!$customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Deleted customer not found'
                ], 404);
            }

            $customerUniqueId = $customer->customer_unique_id;

            DB::transaction(function () use (
                $customer,
                $customerUniqueId
            ) {

                /*
            |--------------------------------------------------------------------------
            | Delete Enrollment Records
            |--------------------------------------------------------------------------
            */
                CustomerEnrollment::where(
                    'customer_unique_id',
                    $customerUniqueId
                )->delete();

                /*
            |--------------------------------------------------------------------------
            | Delete Verification History
            |--------------------------------------------------------------------------
            */
                LoanCustomerVerificationHistory::where(
                    'customer_unique_id',
                    $customerUniqueId
                )->delete();

                /*
            |--------------------------------------------------------------------------
            | Permanently Delete Customer
            |--------------------------------------------------------------------------
            */
                $customer->forceDelete();
            });

            return response()->json([
                'success' => true,
                'message' => 'Customer permanently deleted successfully',
                'customer_unique_id' => $customerUniqueId
            ]);
        } catch (\Exception $e) {

            Log::error(
                'Error permanently deleting loan customer',
                [
                    'customer_id' => $id,
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]
            );

            return response()->json([
                'success' => false,
                'message' => 'Failed to permanently delete customer',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getCustomerHistory(string $customerUniqueId)
    {
        try {
            $customer = LoanCustomer::withoutGlobalScope('notDeleted')
                ->where('customer_unique_id', $customerUniqueId)
                ->firstOrFail();

            // All enrollments
            $enrollments = CustomerEnrollment::where('customer_unique_id', $customerUniqueId)
                ->orderBy('created_at', 'asc')
                ->get();

            // All CAFs
            $cafs = CreditApplicationForm::where('customer_unique_id', $customerUniqueId)
                ->orderBy('created_at', 'asc')
                ->get();

            $cafIds = $cafs->pluck('loan_application_id');

            // PDs
            $pds = \App\Models\Loan\PdInformation::whereIn('loan_application_id', $cafIds)
                ->orderBy('created_at', 'asc')
                ->get();

            // CAMs
            $cams = \App\Models\Loan\CAM::whereIn('loan_application_id', $cafIds)
                ->orderBy('created_at', 'asc')
                ->get();

            // Disbursements
            $disbursements = \App\Models\Loan\Disbursement::whereIn('loan_application_id', $cafIds)
                ->orderBy('created_at', 'asc')
                ->get();

            // Loans
            $loans = \App\Models\Loan\Loan::whereIn('loan_application_id', $cafIds)
                ->orderBy('created_at', 'asc')
                ->get();

            $loanNumbers = $loans->pluck('loan_number');

            // EMI Schedules
            $emiSchedules = \App\Models\Loan\EmiSchedule::whereIn('loan_id', $loanNumbers)
                ->orderBy('installment_date', 'asc')
                ->get()
                ->groupBy('loan_id');

            // EMI Payments
            $emiPayments = \App\Models\Loan\EmiPayment::whereIn('loan_id', $loanNumbers)
                ->where('is_deleted', 0)
                ->orderBy('payment_date', 'asc')
                ->get()
                ->groupBy('loan_id');

            // Verification history
            $verificationHistory = LoanCustomerVerificationHistory::where('customer_unique_id', $customerUniqueId)
                ->orderBy('created_at', 'asc')
                ->get();

            // Build CAF tree with nested PD > CAM > Disbursement > Loan > EMI
            $cafTree = $cafs->map(function ($caf) use ($pds, $cams, $disbursements, $loans, $emiSchedules, $emiPayments) {
                $cafData = $caf->toArray();

                $cafData['pd'] = $pds->where('loan_application_id', $caf->loan_application_id)->values();
                $cafData['cam'] = $cams->where('loan_application_id', $caf->loan_application_id)->values();
                $cafData['disbursements'] = $disbursements->where('loan_application_id', $caf->loan_application_id)->values();
                $cafData['loans'] = $loans->where('loan_application_id', $caf->loan_application_id)->map(function ($loan) use ($emiSchedules, $emiPayments) {
                    $loanData = $loan->toArray();
                    $loanData['emi_schedules'] = $emiSchedules->get($loan->loan_number, collect())->values();
                    $loanData['emi_payments'] = $emiPayments->get($loan->loan_number, collect())->values();
                    return $loanData;
                })->values();

                return $cafData;
            });

            return response()->json([
                'success' => true,
                'message' => 'Customer history retrieved successfully',
                'data' => [
                    'customer' => $customer,
                    'enrollments' => $enrollments,
                    'verification_history' => $verificationHistory,
                    'cafs' => $cafTree,
                    'summary' => [
                        'total_enrollments' => $enrollments->count(),
                        'total_cafs' => $cafs->count(),
                        'total_pds' => $pds->count(),
                        'total_cams' => $cams->count(),
                        'total_disbursements' => $disbursements->count(),
                        'total_loans' => $loans->count(),
                        'total_emi_schedules' => $emiSchedules->flatten()->count(),
                        'total_emi_payments' => $emiPayments->flatten()->count(),
                    ]
                ]
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Customer not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching customer history: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'message' => 'Failed to retrieve customer history: ' . $e->getMessage()], 500);
        }
    }

    public function exportCustomerHistory(string $customerUniqueId)
    {
        try {
            $customer = LoanCustomer::withoutGlobalScope('notDeleted')
                ->where('customer_unique_id', $customerUniqueId)
                ->firstOrFail();

            $enrollments = CustomerEnrollment::where('customer_unique_id', $customerUniqueId)
                ->orderBy('created_at', 'asc')->get();

            $cafs = CreditApplicationForm::withoutGlobalScope('notDeleted')
                ->where('customer_unique_id', $customerUniqueId)
                ->orderBy('created_at', 'asc')->get();

            $cafIds = $cafs->pluck('loan_application_id');

            $pds = \App\Models\Loan\PdInformation::withoutGlobalScope('not_deleted')
                ->whereIn('loan_application_id', $cafIds)->orderBy('created_at', 'asc')->get();
            $cams = \App\Models\Loan\CAM::withoutGlobalScope('not_deleted')
                ->whereIn('loan_application_id', $cafIds)->orderBy('created_at', 'asc')->get();
            $disbursements = \App\Models\Loan\Disbursement::withoutGlobalScope('not_deleted')
                ->whereIn('loan_application_id', $cafIds)->orderBy('created_at', 'asc')->get();
            $loans = \App\Models\Loan\Loan::withoutGlobalScope('not_deleted')
                ->whereIn('loan_application_id', $cafIds)->orderBy('created_at', 'asc')->get();
            $loanNumbers = $loans->pluck('loan_number');

            $emiSchedules = \App\Models\Loan\EmiSchedule::withoutGlobalScope('not_deleted')
                ->whereIn('loan_id', $loanNumbers)->orderBy('installment_date', 'asc')->get();
            $emiPayments = \App\Models\Loan\EmiPayment::whereIn('loan_id', $loanNumbers)
                ->where('is_deleted', 0)->orderBy('payment_date', 'asc')->get();

            $verificationHistory = LoanCustomerVerificationHistory::where('customer_unique_id', $customerUniqueId)
                ->orderBy('created_at', 'asc')->get();

            $filename = 'customer_history_' . $customerUniqueId . '_' . now()->format('Ymd_His') . '.csv';

            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ];

            $callback = function () use ($customer, $enrollments, $cafs, $pds, $cams, $disbursements, $loans, $emiSchedules, $emiPayments, $verificationHistory) {
                $handle = fopen('php://output', 'w');

                // Customer Info
                fputcsv($handle, ['=== CUSTOMER INFORMATION ===']);
                fputcsv($handle, ['Customer ID', 'Name', 'Email', 'Phone', 'Contact 2', 'Gender', 'DOB', 'Father Name', 'Permanent Address', 'Correspondence Address', 'Aadhaar', 'PAN', 'Voter ID', 'Driving License', 'Ration Card', 'Nominee Name', 'Nominee Relationship', 'Nominee Address', 'Occupation', 'Religion', 'Caste', 'Residence Type', 'House Type', 'Years of Staying', 'Number of Rooms', 'Sourcing Type', 'Agent ID', 'Branch ID', 'Created At']);
                fputcsv($handle, [
                    $customer->customer_unique_id,
                    trim($customer->first_name . ' ' . $customer->middle_name . ' ' . $customer->last_name),
                    $customer->email,
                    $customer->contact_number_1,
                    $customer->contact_number_2,
                    $customer->gender,
                    $customer->date_of_birth,
                    $customer->father_name,
                    $customer->permanent_address,
                    $customer->correspondence_address,
                    $customer->adhaar_number,
                    $customer->pan_number,
                    $customer->voter_id_number,
                    $customer->driving_license_number,
                    $customer->ration_card_number,
                    $customer->nominee_name,
                    $customer->nominee_relationship,
                    $customer->nominee_address,
                    $customer->occupation,
                    $customer->religion,
                    $customer->caste,
                    $customer->residence_type,
                    $customer->house_type,
                    $customer->years_of_staying,
                    $customer->number_of_rooms,
                    $customer->sourcing_type,
                    $customer->agent_unique_id,
                    $customer->branch_id,
                    $customer->created_at,
                ]);

                // Enrollments
                fputcsv($handle, []);
                fputcsv($handle, ['=== ENROLLMENTS ===']);
                fputcsv($handle, ['Enrollment Number', 'Status', 'Verification Status', 'Enrollment Date', 'Verified By', 'Verified At', 'Verification Notes', 'Branch ID', 'Created At']);
                foreach ($enrollments as $e) {
                    fputcsv($handle, [$e->enrollment_number, $e->status, $e->verification_status, $e->enrollment_date, $e->verified_by, $e->verified_at, $e->verification_notes, $e->branch_id, $e->created_at]);
                }

                // Verification History
                fputcsv($handle, []);
                fputcsv($handle, ['=== VERIFICATION HISTORY ===']);
                fputcsv($handle, ['ID', 'Enrollment Number', 'Status', 'Reason', 'Admin ID', 'Admin Name', 'Created At']);
                foreach ($verificationHistory as $vh) {
                    fputcsv($handle, [$vh->id, $vh->enrollment_number, $vh->status, $vh->reason, $vh->admin_id, $vh->admin_name, $vh->created_at]);
                }

                // CAFs
                fputcsv($handle, []);
                fputcsv($handle, ['=== CREDIT APPLICATION FORMS (CAF) ===']);
                fputcsv($handle, ['Loan Application ID', 'Enrollment Number', 'Status', 'Credit Mode', 'Credit Applied For', 'Frequency', 'Tenure Option', 'Applicant Income', 'Total Income Yearly', 'Net Surplus', 'Down Payment', 'Business Type', 'Business Nature', 'Created At']);
                foreach ($cafs as $caf) {
                    fputcsv($handle, [
                        $caf->loan_application_id,
                        $caf->enrollment_number,
                        $caf->status ?? '',
                        $caf->credit_mode ?? '',
                        $caf->credit_applied_for ?? '',
                        $caf->frequency ?? '',
                        $caf->tenure_option ?? '',
                        $caf->applicant_income ?? '',
                        $caf->total_income_yearly ?? '',
                        $caf->net_surplus ?? '',
                        $caf->down_payment ?? '',
                        $caf->business_type ?? '',
                        $caf->business_nature ?? '',
                        $caf->created_at,
                    ]);
                }

                // PDs
                fputcsv($handle, []);
                fputcsv($handle, ['=== PD INFORMATION ===']);
                fputcsv($handle, ['PD Application ID', 'Loan Application ID', 'Status', 'Verification Status', 'Verification Notes', 'Is Verified', 'Created At']);
                foreach ($pds as $pd) {
                    fputcsv($handle, [
                        $pd->pd_application_id,
                        $pd->loan_application_id,
                        $pd->status ?? '',
                        $pd->verification_status ?? '',
                        $pd->verification_notes ?? '',
                        $pd->is_verified ? 'Yes' : 'No',
                        $pd->created_at,
                    ]);
                }

                // CAMs
                fputcsv($handle, []);
                fputcsv($handle, ['=== CAM ===']);
                fputcsv($handle, ['CAM Unique ID', 'Loan Application ID', 'Status', 'Credit Decision', 'Remarks', 'Credit Sanction Status', 'Deviation If Any', 'Is Verified', 'Created At']);
                foreach ($cams as $cam) {
                    fputcsv($handle, [
                        $cam->cam_unique_id,
                        $cam->loan_application_id,
                        $cam->status ?? '',
                        $cam->credit_decision ?? '',
                        $cam->remarks ?? '',
                        $cam->credit_sanction_status ?? '',
                        $cam->deviation_if_any ?? '',
                        $cam->is_verified ? 'Yes' : 'No',
                        $cam->created_at,
                    ]);
                }

                // Disbursements
                fputcsv($handle, []);
                fputcsv($handle, ['=== DISBURSEMENTS ===']);
                fputcsv($handle, ['Disbursement ID', 'Loan Application ID', 'Date of Disbursement', 'Booking Date', 'Disbursement Status', 'Created At']);
                foreach ($disbursements as $d) {
                    fputcsv($handle, [
                        $d->disbursement_id,
                        $d->loan_application_id,
                        $d->date_of_disbursement ?? '',
                        $d->booking_date ?? '',
                        $d->disbursement_status ?? '',
                        $d->created_at,
                    ]);
                }

                // Loans
                fputcsv($handle, []);
                fputcsv($handle, ['=== LOANS ===']);
                fputcsv($handle, ['Loan Number', 'Loan Application ID', 'Loan Amount', 'Interest Rate', 'Tenure (Months)', 'Frequency', 'EMI Amount', 'Processing Fee', 'GST Amount', 'Insurance Amount', 'Disbursement Amount', 'Loan Start Date', 'Installment Start Date', 'Created At']);
                foreach ($loans as $loan) {
                    fputcsv($handle, [
                        $loan->loan_number,
                        $loan->loan_application_id,
                        $loan->loan_amount ?? '',
                        $loan->interest_rate ?? '',
                        $loan->tenure_months ?? '',
                        $loan->frequency ?? '',
                        $loan->emi_amount ?? '',
                        $loan->processing_fee ?? '',
                        $loan->gst_amount ?? '',
                        $loan->insurance_amount ?? '',
                        $loan->disbursement_amount ?? '',
                        $loan->loan_start_date ?? '',
                        $loan->installment_start_date ?? '',
                        $loan->created_at,
                    ]);
                }

                // EMI Schedules
                fputcsv($handle, []);
                fputcsv($handle, ['=== EMI SCHEDULES ===']);
                fputcsv($handle, ['EMI ID', 'Loan ID', 'Installment No', 'Installment Date', 'Installment Amount', 'Principal Due', 'Interest Due', 'Outstanding Balance', 'Status', 'Paid Date', 'Paid Amount', 'Created At']);
                foreach ($emiSchedules as $emi) {
                    fputcsv($handle, [
                        $emi->emi_id,
                        $emi->loan_id,
                        $emi->installment_no ?? '',
                        $emi->installment_date,
                        $emi->installment_amount ?? '',
                        $emi->principal_due ?? '',
                        $emi->interest_due ?? '',
                        $emi->outstanding_balance ?? '',
                        $emi->status ?? '',
                        $emi->paid_date ?? '',
                        $emi->paid_amount ?? '',
                        $emi->created_at,
                    ]);
                }

                // EMI Payments
                fputcsv($handle, []);
                fputcsv($handle, ['=== EMI PAYMENTS ===']);
                fputcsv($handle, ['ID', 'Loan ID', 'EMI Schedule ID', 'Payment Date', 'Payment Amount', 'Payment Method', 'Transaction ID', 'Payment Status', 'Approval Status', 'Receipt Number', 'Approved By', 'Approved At', 'Created At']);
                foreach ($emiPayments as $payment) {
                    fputcsv($handle, [
                        $payment->id,
                        $payment->loan_id,
                        $payment->emi_schedule_id,
                        $payment->payment_date,
                        $payment->payment_amount ?? '',
                        $payment->payment_method ?? '',
                        $payment->transaction_id ?? '',
                        $payment->payment_status ?? '',
                        $payment->approval_status ?? '',
                        $payment->receipt_number ?? '',
                        $payment->approved_by ?? '',
                        $payment->approved_at ?? '',
                        $payment->created_at,
                    ]);
                }

                fclose($handle);
            };

            return response()->stream($callback, 200, $headers);
        } catch (ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Customer not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error exporting customer history: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'message' => 'Failed to export customer history: ' . $e->getMessage()], 500);
        }
    }

    public function getEligibleCustomersForCAF(Request $request)
    {
        try {

            $query = CustomerEnrollment::with([
                'customer.roleData'
            ])
                ->where('verification_status', 'verified')
                ->whereNotExists(function ($subQuery) {
                    $subQuery->select(DB::raw(1))
                        ->from('loan_credit_application_forms')
                        ->whereRaw("
    loan_credit_application_forms.enrollment_number COLLATE utf8mb4_unicode_ci =
    customer_enrollments.enrollment_number COLLATE utf8mb4_unicode_ci
")
                        ->where('is_deleted', 0);
                });

            if ($request->filled('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }

            if ($request->filled('cms_admin_id')) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            if ($request->filled('enrolled_by')) {
                $query->where('enrolled_by', $request->enrolled_by);
            }

            if ($request->filled('search')) {

                $search = $request->search;

                $query->where(function ($q) use ($search) {

                    $q->where(
                        'customer_unique_id',
                        'like',
                        "%{$search}%"
                    )
                        ->orWhere(
                            'enrollment_number',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhereHas('customer', function ($customer) use ($search) {

                            $customer->where(
                                'first_name',
                                'like',
                                "%{$search}%"
                            )
                                ->orWhere(
                                    'last_name',
                                    'like',
                                    "%{$search}%"
                                )
                                ->orWhere(
                                    'contact_number_1',
                                    'like',
                                    "%{$search}%"
                                )
                                ->orWhere(
                                    'email',
                                    'like',
                                    "%{$search}%"
                                );
                        });
                });
            }

            $data = $query->get()
                ->map(function ($enrollment) {

                    if (!$enrollment->customer) {
                        return null;
                    }

                    $customer = $enrollment->customer->toArray();

                    $customer['enrollment'] = $enrollment;

                    $customer['status'] =
                        $enrollment->status;

                    $customer['verification_status'] =
                        $enrollment->verification_status;

                    $customer['enrollment_number'] =
                        $enrollment->enrollment_number;

                    $customer['enrollment_date'] =
                        $enrollment->enrollment_date;

                    $customer['source_type'] =
                        $enrollment->status_history &&
                        count($enrollment->status_history) > 1
                        ? 're_enrollment'
                        : 'new_customer';

                    return $customer;
                })
                ->filter()
                ->values();

            return response()->json([
                'success' => true,
                'message' => 'Eligible customers retrieved successfully',
                'data' => $data,
                'total_count' => $data->count(),
                'filters' => [
                    'search' => $request->search,
                    'branch_id' => $request->branch_id,
                    'cms_admin_id' => $request->cms_admin_id,
                    'enrolled_by' => $request->enrolled_by,
                ]
            ]);
        } catch (\Exception $e) {

            Log::error('CAF Eligible Customers Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
