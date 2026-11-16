<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\Loan\CAM;
use App\Models\Loan\CreditApplicationForm;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CAMController extends Controller
{
    public function store(Request $request)
    {
        try {
            // Handle JSON string inputs from FormData
            if ($request->has('income_details') && is_string($request->income_details)) {
                $request->merge(['income_details' => json_decode($request->income_details, true)]);
            }
            if ($request->has('expenditure_details') && is_string($request->expenditure_details)) {
                $request->merge(['expenditure_details' => json_decode($request->expenditure_details, true)]);
            }
            if ($request->has('net_surplus') && is_string($request->net_surplus)) {
                $request->merge(['net_surplus' => json_decode($request->net_surplus, true)]);
            }

            $validatedData = $request->validate([
                'id' => 'nullable|integer',
                'loan_application_id' => 'required|string',
                'customer_unique_id' => 'required|string',
                'pd_id' => 'nullable|string',
                'income_details' => 'nullable|array',
                'expenditure_details' => 'nullable|array',
                'net_surplus' => 'nullable|array',
                'credit_decision' => 'required|string|in:approved,rejected',
                'remarks' => 'nullable|string',
                'cms_admin_id' => 'nullable|string',
                'branch_id' => 'nullable|string',
            ]);

            // If updating by ID
            if ($request->has('id') && !empty($request->id)) {
                $existingCam = CAM::find($request->id);
                // If not found in default scope, check deleted (reverted) ones
                if (!$existingCam) {
                    $existingCam = CAM::withDeleted()->find($request->id);
                }
            } else {
                $existingCam = CAM::withDeleted()->where('loan_application_id', $validatedData['loan_application_id'])->first();
            }
            
            if ($existingCam) {
                $camUniqueId = $existingCam->cam_unique_id;
            } else {
                $lastCam = CAM::withDeleted()->latest('id')->first();
                $nextId = $lastCam ? ((int) str_replace('CAM-', '', $lastCam->cam_unique_id)) + 1 : 1001;
                $camUniqueId = 'CAM-' . $nextId;
            }

            // Get user context from request or auth
            $user = auth()->user();
            $cmsAdminId = $request->input('cms_admin_id') ?? $user->user_id ?? $user->id;
            $branchId = $request->input('branch_id') ?? $user->branch_id ?? $user->branch;

            $cam = DB::transaction(function () use ($validatedData, $camUniqueId, $branchId, $cmsAdminId, $request, $existingCam) {
                // Prepare the status history
                $statusHistory = $existingCam ? ($existingCam->status_history ?? []) : [];
                
                // Add "updated" history ONLY if the existing record was soft-deleted (reverted)
                if ($existingCam && $existingCam->is_deleted) {
                    $statusHistory[] = [
                        'status' => 'updated',
                        'timestamp' => now()->toDateTimeString(),
                        'reason' => 'CAM memorandum updated after revert',
                        'performed_by' => auth()->user()->user_id ?? auth()->id() ?? 'system'
                    ];
                }

                if (!$existingCam) {
                    $statusHistory[] = [
                        'status' => 'created',
                        'timestamp' => now()->toDateTimeString(),
                        'reason' => 'CAM memorandum created/submitted',
                        'performed_by' => auth()->user()->user_id ?? auth()->id() ?? 'system'
                    ];

                    $statusHistory[] = [
                        'status' => 'credit_manager',
                        'timestamp' => now()->toDateTimeString(),
                        'reason' => 'CAM submitted for appraisal'
                    ];
                }

                // If existing record is soft-deleted, we manually update it to avoid duplicate entry error
                if ($existingCam && $existingCam->is_deleted) {
                    $existingCam->update([
                        'customer_unique_id' => $validatedData['customer_unique_id'],
                        'pd_id' => $request->input('pd_id') ?? $request->input('pd_application_id') ?? null,
                        'cam_unique_id' => $camUniqueId,
                        'status' => 'credit_manager',
                        'is_verified' => 0,
                        'branch_id' => $branchId,
                        'cms_admin_id' => $cmsAdminId,
                        'income_details' => $request->input('income_details'),
                        'expenditure_details' => $request->input('expenditure_details'),
                        'net_surplus' => $request->input('net_surplus'),
                        'credit_decision' => $validatedData['credit_decision'],
                        'remarks' => $validatedData['remarks'],
                        'status_history' => $statusHistory,
                        'is_deleted' => 0,
                    ]);
                    $createdCam = $existingCam;
                } else {
                    $createdCam = CAM::updateOrCreate(
                        ['loan_application_id' => $validatedData['loan_application_id']],
                        [
                            'customer_unique_id' => $validatedData['customer_unique_id'],
                            'pd_id' => $request->input('pd_id') ?? $request->input('pd_application_id') ?? null,
                            'cam_unique_id' => $camUniqueId,
                            'status' => 'credit_manager',
                            'is_verified' => $existingCam ? $existingCam->is_verified : 0,
                            'branch_id' => $branchId,
                            'cms_admin_id' => $cmsAdminId,
                            'income_details' => $request->input('income_details'),
                            'expenditure_details' => $request->input('expenditure_details'),
                            'net_surplus' => $request->input('net_surplus'),
                            'credit_decision' => $validatedData['credit_decision'],
                            'remarks' => $validatedData['remarks'],
                            'status_history' => $statusHistory,
                            'is_deleted' => 0,
                        ]
                    );
                }

                // Update the original CAF record
                CreditApplicationForm::where('loan_application_id', $validatedData['loan_application_id'])
                    ->update(['is_cam_created' => 1]);

                // Update the PD Information record if it exists
                \App\Models\Loan\PdInformation::where('loan_application_id', $validatedData['loan_application_id'])
                    ->where('is_deleted', false)
                    ->update(['is_cam_created' => true]);

                return $createdCam;
            });

            return response()->json([
                'success' => true,
                'message' => 'CAM details submitted successfully and application updated',
                'data' => $cam
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error storing CAM: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit CAM: ' . $e->getMessage()
            ], 500);
        }
    }

    public function index(Request $request)
    {
        try {
            $query = CAM::where('is_deleted', 0);

            // Apply status filter
            if ($request->filled('status')) {
                $status = $request->status;
                switch (strtolower($status)) {
                    case 'pending':
                    case 'credit_manager':
                        $query->where('status', 'credit_manager')
                              ->where('is_verified', 0);
                        break;
                    case 'verified':
                    case 'branch_manager':
                        $query->where('status', 'branch_manager')
                              ->where('is_verified', 1);
                        break;
                    case 'disbursement_pending':
                        $query->where('is_verified', 1)
                              ->where('is_disbursement_created', 0);
                        break;
                    case 'disbursement_created':
                        $query->where('is_disbursement_created', 1);
                        break;
                    case 'reverted_to_pd':
                        $query->where('status', 'reverted_to_pd');
                        break;
                    case 'all':
                        // No additional status filter
                        break;
                    default:
                        $query->where('status', $status);
                        break;
                }
            } else {
                // Default behavior: show pending CAMs
                $query->where('is_disbursement_created', 0)
                      ->where('status', 'credit_manager')
                      ->where('is_verified', 0);
            }

            // Apply verification status filter
            if ($request->filled('is_verified')) {
                $isVerified = $request->is_verified;
                if (in_array(strtolower($isVerified), ['true', '1', 'yes'])) {
                    $query->where('is_verified', 1);
                } elseif (in_array(strtolower($isVerified), ['false', '0', 'no'])) {
                    $query->where('is_verified', 0);
                }
            }

            // Apply disbursement status filter
            if ($request->filled('is_disbursement_created')) {
                $isDisbursementCreated = $request->is_disbursement_created;
                if (in_array(strtolower($isDisbursementCreated), ['true', '1', 'yes'])) {
                    $query->where('is_disbursement_created', 1);
                } elseif (in_array(strtolower($isDisbursementCreated), ['false', '0', 'no'])) {
                    $query->where('is_disbursement_created', 0);
                }
            }

            // Apply credit decision filter
            if ($request->filled('credit_decision')) {
                $query->where('credit_decision', $request->credit_decision);
            }

            // Apply branch filter
            if ($request->filled('branch_id')) {
                $branchId = $request->branch_id;
                $query->where(function($q) use ($branchId) {
                    $q->where('branch_id', $branchId)
                      ->orWhere('branch_id', 'BR' . str_pad($branchId, 4, '0', STR_PAD_LEFT));
                });
            }

            // Apply customer filter
            if ($request->filled('customer_unique_id')) {
                $query->where('customer_unique_id', $request->customer_unique_id);
            }

            // Apply CMS admin filter
            if ($request->filled('cms_admin_id')) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            // Apply date range filters
            if ($request->filled('created_from')) {
                $query->whereDate('created_at', '>=', $request->created_from);
            }
            if ($request->filled('created_to')) {
                $query->whereDate('created_at', '<=', $request->created_to);
            }

            // Apply search filter
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('cam_unique_id', 'like', '%' . $search . '%')
                        ->orWhere('loan_application_id', 'like', '%' . $search . '%')
                        ->orWhere('customer_unique_id', 'like', '%' . $search . '%');
                });
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            
            $allowedSortFields = ['created_at', 'updated_at', 'cam_unique_id', 'status', 'credit_decision'];
            if (in_array($sortBy, $allowedSortFields)) {
                $query->orderBy($sortBy, $sortOrder === 'asc' ? 'asc' : 'desc');
            } else {
                $query->latest();
            }

            // Pagination
            $perPage = $request->get('per_page', 10);
            $perPage = min($perPage, 100); // Limit max per page to 100
            
            if ($request->get('paginate', 'true') === 'false') {
                $cams = $query->get();
                $paginationData = null;
            } else {
                $paginatedResult = $query->paginate($perPage);
                $cams = $paginatedResult->getCollection();
                $paginationData = [
                    'current_page' => $paginatedResult->currentPage(),
                    'per_page' => $paginatedResult->perPage(),
                    'total' => $paginatedResult->total(),
                    'last_page' => $paginatedResult->lastPage(),
                    'from' => $paginatedResult->firstItem(),
                    'to' => $paginatedResult->lastItem(),
                ];
            }

            // Transform data for better response
            $transformedData = $cams->map(function ($cam) {
                $data = $cam->toArray();
                $data['status_display'] = $this->getStatusDisplay($cam);
                $data['verification_status'] = $cam->is_verified ? 'Verified' : 'Pending';
                $data['disbursement_status'] = $cam->is_disbursement_created ? 'Created' : 'Pending';
                return $data;
            });

            // Calculate summary statistics
            $totalCams = CAM::where('is_deleted', 0)->count();
            $pendingCams = CAM::where('is_deleted', 0)->where('status', 'credit_manager')->where('is_verified', 0)->count();
            $verifiedCams = CAM::where('is_deleted', 0)->where('is_verified', 1)->count();
            $disbursementCreatedCams = CAM::where('is_deleted', 0)->where('is_disbursement_created', 1)->count();

            $response = [
                'success' => true,
                'message' => 'CAMs retrieved successfully',
                'data' => $transformedData,
                'summary' => [
                    'total_cams' => $totalCams,
                    'pending_cams' => $pendingCams,
                    'verified_cams' => $verifiedCams,
                    'disbursement_created_cams' => $disbursementCreatedCams,
                    'disbursement_pending_cams' => $verifiedCams - $disbursementCreatedCams,
                ],
                'filters_applied' => [
                    'status' => $request->status,
                    'is_verified' => $request->is_verified,
                    'is_disbursement_created' => $request->is_disbursement_created,
                    'credit_decision' => $request->credit_decision,
                    'branch_id' => $request->branch_id,
                    'cms_admin_id' => $request->cms_admin_id,
                    'customer_unique_id' => $request->customer_unique_id,
                    'search' => $request->search,
                    'sort_by' => $sortBy,
                    'sort_order' => $sortOrder,
                ]
            ];

            if ($paginationData) {
                $response['pagination'] = $paginationData;
            }

            return response()->json($response);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch CAMs: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get display-friendly status text
     */
    private function getStatusDisplay($cam)
    {
        if ($cam->is_disbursement_created) {
            return 'Disbursement Created';
        }
        
        if ($cam->is_verified) {
            return 'Verified (Branch Manager)';
        }
        
        switch ($cam->status) {
            case 'credit_manager':
                return 'Pending (Credit Manager)';
            case 'branch_manager':
                return 'With Branch Manager';
            case 'reverted_to_pd':
                return 'Reverted to PD';
            default:
                return ucfirst(str_replace('_', ' ', $cam->status));
        }
    }

    public function show($id)
    {
        try {
            $cam = CAM::with([
                'loanApplication.customer', 
                'pdInformation.customer', 
                'customer'
            ])
            ->where('id', $id)
            ->orWhere('cam_unique_id', $id)
            ->firstOrFail();

            return response()->json([
                'success' => true,
                'data' => $cam
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'CAM not found'
            ], 404);
        }
    }

    /**
     * Update Credit Sanction details (Credit Manager Role)
     */
    public function updateSanction(Request $request, $id)
    {
        try {
            $validatedData = $request->validate([
                'pd_checked' => 'nullable|string|in:pending,checked,back_to_pd',
                'cam_checked' => 'nullable|string|in:pending,checked,back_to_pd',
                'tvr_applicant_contacts' => 'nullable|string',
                'tvr_observation' => 'nullable|string',
                'deviation_if_any' => 'nullable|string',
                'deviation_approved_by' => 'nullable|string',
                'deviation_status' => 'nullable|string|in:approved,rejected',
                'reason_for_rejected' => 'nullable|string',
                'credit_sanction_status' => 'nullable|string|in:approved,rejected',
                'sanction_remarks' => 'nullable|string',
            ]);

            $cam = CAM::where('id', $id)->orWhere('cam_unique_id', $id)->firstOrFail();

            $cam->update($validatedData);

            return response()->json([
                'success' => true,
                'message' => 'Sanction details updated successfully',
                'data' => $cam->fresh()
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update sanction: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify CAM status by Branch Manager.
     */
    public function verify(Request $request, string $id)
    {
        try {
            $validatedData = $request->validate([
                'reason' => 'nullable|string|max:500',
                'cam_checked' => 'nullable|in:true,false,1,0',
                'credit_sanction_status' => 'nullable|string',
                'deviation_approved_by' => 'nullable|string',
                'deviation_if_any' => 'nullable|string',
                'deviation_status' => 'nullable|string',
                'pd_checked' => 'nullable|in:true,false,1,0,pending,checked',
                'reason_for_rejected' => 'nullable|string',
                'remarks' => 'nullable|string',
                'tvr_observation' => 'nullable|string',
                'is_verified' => 'nullable|in:true,false,1,0',
                // Document upload fields
                'cam_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120', // 5MB max
                'verification_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
                'additional_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            ]);

            // Find by ID or cam_unique_id
            $cam = CAM::where('id', $id)->orWhere('cam_unique_id', $id)->firstOrFail();

            if ($cam->is_verified) {
                return response()->json([
                    'success' => false,
                    'message' => 'CAM is already verified.'
                ], 400);
            }

            $user = auth()->user();
            $adminId = $user->user_id ?? $user->id ?? 'system';

            // Handle document uploads
            $documentPaths = [];
            $uploadPath = 'cam_verification_documents';
            
            // Ensure upload directory exists
            if (!file_exists(public_path($uploadPath))) {
                mkdir(public_path($uploadPath), 0755, true);
            }

            // Upload CAM document
            if ($request->hasFile('cam_document')) {
                $file = $request->file('cam_document');
                $fileName = $cam->cam_unique_id . '_cam_document_' . time() . '.' . $file->getClientOriginalExtension();
                $file->move(public_path($uploadPath), $fileName);
                $documentPaths['cam_document'] = $uploadPath . '/' . $fileName;
            }

            // Upload verification document
            if ($request->hasFile('verification_document')) {
                $file = $request->file('verification_document');
                $fileName = $cam->cam_unique_id . '_verification_document_' . time() . '.' . $file->getClientOriginalExtension();
                $file->move(public_path($uploadPath), $fileName);
                $documentPaths['verification_document'] = $uploadPath . '/' . $fileName;
            }

            // Upload additional document
            if ($request->hasFile('additional_document')) {
                $file = $request->file('additional_document');
                $fileName = $cam->cam_unique_id . '_additional_document_' . time() . '.' . $file->getClientOriginalExtension();
                $file->move(public_path($uploadPath), $fileName);
                $documentPaths['additional_document'] = $uploadPath . '/' . $fileName;
            }

            $history = $cam->status_history ?? [];
            $history[] = [
                'status' => 'branch_manager',
                'timestamp' => now()->toDateTimeString(),
                'reason' => $validatedData['reason'] ?? 'CAM verified and approved by Credit Manager, forwarded to Branch Manager',
                'performed_by' => $adminId,
                'documents_uploaded' => !empty($documentPaths) ? array_keys($documentPaths) : null
            ];

            // Prepare update data
            $updateData = [
                'status' => 'branch_manager',
                'is_verified' => 1,
                'status_history' => $history,
                'cam_checked' => in_array($request->input('cam_checked'), ['true', '1', 1, true]) ? 1 : 0,
                'credit_sanction_status' => $request->input('credit_sanction') ?? $request->input('credit_sanction_status'),
                'deviation_approved_by' => $request->input('deviation_approved_by'),
                'deviation_if_any' => $request->input('deviation_if_any'),
                'deviation_status' => $request->input('deviation_status'),
                'pd_checked' => $this->processPdCheckedValue($request->input('pd_checked')),
                'reason_for_rejected' => $request->input('reason_for_rejected'),
                'remarks' => $request->input('remarks'),
                'tvr_observation' => $request->input('tvr_observation'),
            ];

            // Add document paths to update data
            if (!empty($documentPaths)) {
                $existingDocuments = $cam->verification_documents ?? [];
                $updateData['verification_documents'] = array_merge($existingDocuments, $documentPaths);
            }

            $cam->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'CAM verified successfully' . (!empty($documentPaths) ? ' with documents uploaded' : ''),
                'data' => $cam->fresh(),
                'uploaded_documents' => $documentPaths
            ]);
        } catch (\Exception $e) {
            Log::error('Error verifying CAM: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to verify CAM: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Revert CAM back to PD stage.
     * Soft-deletes the CAM and resets is_cam_created on CAF and PD.
     */
    public function revertToPD(Request $request, string $id)
    {
        try {
            $validated = $request->validate([
                'reason' => 'nullable|string|max:500'
            ]);

            $cam = CAM::where('id', $id)->orWhere('cam_unique_id', $id)->firstOrFail();

            if ($cam->is_disbursement_created) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot revert: disbursement has already been created for this CAM.'
                ], 400);
            }

            $user = auth()->user();
            $performedBy = $user->user_id ?? $user->id ?? 'system';
            $reason = $validated['reason'] ?? 'Reverted back to PD stage';

            DB::transaction(function () use ($cam, $reason, $performedBy) {
                $history = $cam->status_history ?? [];
                $history[] = [
                    'status' => 'reverted_to_pd',
                    'timestamp' => now()->toDateTimeString(),
                    'reason' => $reason,
                    'performed_by' => $performedBy
                ];

                // Soft-delete the CAM
                $cam->update([
                    'is_deleted' => 1,
                    'status' => 'reverted_to_pd',
                    'status_history' => $history,
                ]);

                // Reset is_cam_created on the CAF
                CreditApplicationForm::where('loan_application_id', $cam->loan_application_id)
                    ->update(['is_cam_created' => 0]);

                // Reset is_cam_created on the PD
                \App\Models\Loan\PdInformation::where('loan_application_id', $cam->loan_application_id)
                    ->where('is_deleted', false)
                    ->update(['is_cam_created' => false]);
            });

            return response()->json([
                'success' => true,
                'message' => 'CAM reverted to PD stage successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'CAM not found.'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error reverting CAM to PD: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to revert CAM: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Revert CAM and PD back to unverified status.
     * Soft-deletes the CAM and resets is_cam_created on CAF, and sets is_verified to 0 on PD.
     */
    public function revertToUnverifiedPD(Request $request, string $id)
    {
        try {
            $validated = $request->validate([
                'reason' => 'nullable|string|max:500'
            ]);

            $cam = CAM::where('id', $id)->orWhere('cam_unique_id', $id)->firstOrFail();

            if ($cam->is_disbursement_created) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot revert: disbursement has already been created for this CAM.'
                ], 400);
            }

            $user = auth()->user();
            $performedBy = $user->user_id ?? $user->id ?? 'system';
            $reason = $validated['reason'] ?? 'Reverted back to unverified PD stage';

            DB::transaction(function () use ($cam, $reason, $performedBy) {
                $history = $cam->status_history ?? [];
                $history[] = [
                    'status' => 'reverted_to_pd_unverified',
                    'timestamp' => now()->toDateTimeString(),
                    'reason' => $reason,
                    'performed_by' => $performedBy
                ];

                // Soft-delete the CAM
                $cam->update([
                    'is_deleted' => 1,
                    'status' => 'reverted_to_pd',
                    'status_history' => $history,
                ]);

                // Reset is_cam_created on the CAF
                CreditApplicationForm::where('loan_application_id', $cam->loan_application_id)
                    ->update(['is_cam_created' => 0]);

                // Soft-delete the PD record and reset its status
                \App\Models\Loan\PdInformation::where('loan_application_id', $cam->loan_application_id)
                    ->where('is_deleted', 0)
                    ->update([
                        'is_deleted' => 1,
                        'is_cam_created' => false,
                        'is_verified' => false,
                        'status' => 'pending'
                    ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'CAM reverted and PD reset to unverified successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'CAM not found.'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error reverting CAM to unverified PD: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to revert CAM: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all verified CAMs for disbursement.
     */
    public function getVerifiedCams(Request $request)
    {
        try {
            $query = CAM::where('is_verified', 1)
                ->where('is_disbursement_created', 0)
                ->where('is_deleted', 0)
                ->with(['loanApplication.customer']);

            if ($request->has('branch_id') && !empty($request->branch_id)) {
                $branchId = $request->branch_id;
                $query->where(function($q) use ($branchId) {
                    $q->where('branch_id', $branchId)
                      ->orWhere('branch_id', 'BR' . str_pad($branchId, 4, '0', STR_PAD_LEFT));
                });
            }

            if ($request->has('customer_unique_id')) {
                $query->where('customer_unique_id', $request->customer_unique_id);
            }

            $cams = $query->latest()->get();

            return response()->json([
                'success' => true,
                'message' => 'Verified CAMs retrieved successfully',
                'data' => $cams
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching verified CAMs: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve verified CAMs: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get verified CAMs for the authenticated Credit Manager (creator).
     */
    public function getMyVerifiedCams(Request $request)
    {
        try {
            $user = auth()->user();
            $cmsAdminId = $user->user_id ?? $user->id;

            if (!$cmsAdminId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized: User ID not found.'
                ], 401);
            }

            // Log the user ID and query for debugging
            Log::info('Fetching verified CAMs fully for user: ' . $cmsAdminId);

            $query = CAM::where('is_verified', 1)
                ->where('is_deleted', 0)
                ->with(['loanApplication.customer']);

            // If the user is NOT a branch_manager or super_admin, only show their own CAMs
            $allowedRoles = ['branch_manager', 'super_admin', 'admin'];
            if (!in_array($user->role, $allowedRoles)) {
                $query->where('cms_admin_id', $cmsAdminId);
            }

            if ($request->has('branch_id')) {
                $branchId = $request->branch_id;
                $query->where(function($q) use ($branchId) {
                    $q->where('branch_id', $branchId)
                      ->orWhere('branch_id', 'BR' . str_pad($branchId, 4, '0', STR_PAD_LEFT));
                });
            }

            if ($request->has('cms_admin_id')) {
                $query->where('cms_admin_id', $request->cms_admin_id);
            }

            if ($request->has('user_id')) {
                $query->whereHas('loanApplication', function($q) use ($request) {
                    $q->where('loan_credit_application_forms.cms_admin_id', $request->user_id);
                });
            }

            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('cam_unique_id', 'like', '%' . $search . '%')
                        ->orWhere('loan_application_id', 'like', '%' . $search . '%')
                        ->orWhere('customer_unique_id', 'like', '%' . $search . '%');
                });
            }

            $perPage = $request->get('per_page', 10);
            $cams = $query->latest()->paginate($perPage);

            return response()->json([
                'success' => true,
                'message' => 'Your verified CAMs retrieved successfully',
                'data' => $cams
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching my verified CAMs: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve your verified CAMs: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get CAM verification documents
     */
    public function getVerificationDocuments($id)
    {
        try {
            $cam = CAM::where('id', $id)->orWhere('cam_unique_id', $id)->firstOrFail();
            
            $documents = $cam->verification_documents ?? [];
            
            // Add full URLs to documents
            $documentsWithUrls = [];
            foreach ($documents as $type => $path) {
                $documentsWithUrls[$type] = [
                    'path' => $path,
                    'url' => url($path),
                    'exists' => file_exists(public_path($path))
                ];
            }
            
            return response()->json([
                'success' => true,
                'message' => 'CAM verification documents retrieved successfully',
                'data' => [
                    'cam_unique_id' => $cam->cam_unique_id,
                    'documents' => $documentsWithUrls
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'CAM not found or error retrieving documents: ' . $e->getMessage()
            ], 404);
        }
    }

    /**
     * Process pd_checked value from form data
     */
    private function processPdCheckedValue($value)
    {
        if (in_array($value, ['true', '1', 1, true])) {
            return 'checked';
        } elseif (in_array($value, ['false', '0', 0, false])) {
            return 'pending';
        } else {
            return $value; // Return as-is if it's already a valid string like 'pending', 'checked'
        }
    }
}
