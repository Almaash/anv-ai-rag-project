<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use App\Services\EmiCalculatorService;

class LoanApplicationController extends Controller
{
    public function index(Request $request)
    {
        try {
            // base query used for both retrieval and counting
            $query = LoanApplication::with(['customer', 'user', 'reviewer']);

            // apply all filters *except* the application_status one, which affects
            // the result set but should not restrict the counts bucket.
            if ($request->filled('customer_unique_id')) {
                $query->where('customer_unique_id', $request->customer_unique_id);
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
            if ($request->filled('is_disbursed')) {
                $query->where('is_disbursed', $request->boolean('is_disbursed'));
            }
            if ($request->filled('loan_started')) {
                $query->where('loan_started', $request->boolean('loan_started'));
            }

            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('loan_application_id', 'like', '%' . $search . '%')
                      ->orWhere('loan_purpose', 'like', '%' . $search . '%')
                      ->orWhere('loan_amount', 'like', '%' . $search . '%')
                      ->orWhere('application_status', 'like', '%' . $search . '%');
                });
            }

            // calculate status counts from current filters (without application_status)
            $statusCounts = (clone $query)
                ->selectRaw('application_status, COUNT(*) as count')
                ->groupBy('application_status')
                ->pluck('count', 'application_status')
                ->toArray();

            $statusCounts = array_merge([
                'pending' => 0,
                'approved' => 0,
                'rejected' => 0,
                'under_review' => 0,
                'back_for_revision' => 0
            ], $statusCounts);

            // now restrict the actual data retrieval by status if requested
            if ($request->filled('application_status')) {
                $query->where('application_status', $request->application_status);
            }

            $perPage = $request->get('per_page', 10);
            $applications = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'message' => 'Loan applications retrieved successfully',
                'data' => $applications->items(),
                'pagination' => [
                    'current_page' => $applications->currentPage(),
                    'per_page' => $applications->perPage(),
                    'total' => $applications->total(),
                    'last_page' => $applications->lastPage(),
                    'from' => $applications->firstItem(),
                    'to' => $applications->lastItem()
                ],
                'status_counts' => $statusCounts,
                'filters' => [
                    'search' => $request->search,
                    'application_status' => $request->application_status,
                    'customer_unique_id' => $request->customer_unique_id,
                    'user_id' => $request->user_id,
                    'branch_id' => $request->branch_id,
                    'cms_admin_id' => $request->cms_admin_id,
                    'is_disbursed' => $request->is_disbursed,
                    'loan_started' => $request->loan_started
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching loan applications: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve loan applications',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'customer_unique_id' => 'required|string',
                'user_id' => 'nullable|string',
                'branch_id' => 'nullable|string',
                'cms_admin_id' => 'nullable|string',
                'loan_amount' => 'required|numeric|min:10000|max:10000000',
                'loan_purpose' => 'required|string|max:255',
                'loan_tenure_months' => 'required|integer|min:6|max:360',
                'interest_rate' => 'required|numeric|min:0.1|max:50',
                'monthly_income' => 'required|numeric|min:10000',
                'employment_type' => 'required|in:salaried,self_employed,business',
                'company_name' => 'nullable|string|max:255',
                'work_experience_years' => 'required|integer|min:1|max:50',
                'existing_loans' => 'nullable|string',
                'collateral_details' => 'nullable|string',
                'salary_slip_document' => 'nullable|file|mimes:pdf,jpeg,jpg,png|max:5120',
                'bank_statement_document' => 'nullable|file|mimes:pdf,jpeg,jpg,png|max:5120',
                'identity_proof_document' => 'nullable|file|mimes:pdf,jpeg,jpg,png|max:2048',
                'address_proof_document' => 'nullable|file|mimes:pdf,jpeg,jpg,png|max:2048',
                'other_document_1' => 'nullable|file|mimes:pdf,jpeg,jpg,png|max:2048',
                'other_document_2' => 'nullable|file|mimes:pdf,jpeg,jpg,png|max:2048',
                'apply_processing_fee' => 'nullable|in:true,false,1,0',
                'apply_gst' => 'nullable|in:true,false,1,0',
                'processing_fee_type' => 'nullable|in:percentage,fixed',
                'processing_fee_percent' => 'nullable|numeric|min:0|max:100',
                'processing_fee_amount' => 'nullable|numeric|min:0',
                'gst_percentage' => 'nullable|numeric|min:0|max:100',
                'gst_amount' => 'nullable|numeric|min:0',
            ]);

            if (isset($validatedData['apply_processing_fee'])) {
                $validatedData['apply_processing_fee'] = filter_var($validatedData['apply_processing_fee'], FILTER_VALIDATE_BOOLEAN);
            }
            if (isset($validatedData['apply_gst'])) {
                $validatedData['apply_gst'] = filter_var($validatedData['apply_gst'], FILTER_VALIDATE_BOOLEAN);
            }

            $documentFields = ['salary_slip_document', 'bank_statement_document', 'identity_proof_document', 'address_proof_document', 'other_document_1', 'other_document_2'];
            
            foreach ($documentFields as $field) {
                if ($request->hasFile($field)) {
                    $file = $request->file($field);
                    $filename = time() . '_' . $field . '_' . $file->getClientOriginalName();
                    $file->move(public_path('loan_documents'), $filename);
                    $validatedData[$field] = 'loan_documents/' . $filename;
                }
            }

            $validatedData['loan_application_id'] = 'LA' . date('Y') . str_pad((LoanApplication::max('id') ?? 0) + 1, 6, '0', STR_PAD_LEFT);
            
            $validatedData['status_history'] = [[
                'status' => 'pending',
                'timestamp' => now()->toISOString(),
                'reason' => null,
                'changed_by' => 'system'
            ]];

            $application = LoanApplication::create($validatedData);

            return response()->json([
                'success' => true,
                'message' => 'Loan application submitted successfully',
                'data' => $application->load(['customer', 'user', 'reviewer'])
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating loan application: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit loan application',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($loanApplicationNo)
    {
        try {
            $application = LoanApplication::with(['customer', 'user', 'reviewer', 'loan'])
                ->where('loan_application_id', $loanApplicationNo)
                ->firstOrFail();

            return response()->json([
                'success' => true,
                'message' => 'Loan application retrieved successfully',
                'data' => $application
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Loan application not found',
                'error' => 'Application does not exist'
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $validatedData = $request->validate([
                'customer_unique_id' => 'required|string',
                'user_id' => 'nullable|string',
                'branch_id' => 'nullable|string',
                'cms_admin_id' => 'nullable|string',
                'loan_amount' => 'required|numeric|min:10000|max:10000000',
                'loan_purpose' => 'required|string|max:255',
                'loan_tenure_months' => 'required|integer|min:6|max:360',
                'interest_rate' => 'required|numeric|min:0.1|max:50',
                'monthly_income' => 'required|numeric|min:10000',
                'employment_type' => 'required|in:salaried,self_employed,business',
                'company_name' => 'nullable|string|max:255',
                'work_experience_years' => 'required|integer|min:1|max:50',
                'existing_loans' => 'nullable|string',
                'collateral_details' => 'nullable|string',
                'salary_slip_document' => 'nullable|file|mimes:pdf,jpeg,jpg,png|max:5120',
                'bank_statement_document' => 'nullable|file|mimes:pdf,jpeg,jpg,png|max:5120',
                'identity_proof_document' => 'nullable|file|mimes:pdf,jpeg,jpg,png|max:2048',
                'address_proof_document' => 'nullable|file|mimes:pdf,jpeg,jpg,png|max:2048',
                'other_document_1' => 'nullable|file|mimes:pdf,jpeg,jpg,png|max:2048',
                'other_document_2' => 'nullable|file|mimes:pdf,jpeg,jpg,png|max:2048',
            ]);

            $application = LoanApplication::where('loan_application_id', $id)->firstOrFail();

            $documentFields = ['salary_slip_document', 'bank_statement_document', 'identity_proof_document', 'address_proof_document', 'other_document_1', 'other_document_2'];
            
            foreach ($documentFields as $field) {
                if ($request->hasFile($field)) {
                    $file = $request->file($field);
                    $filename = time() . '_' . $field . '_' . $file->getClientOriginalName();
                    $file->move(public_path('loan_documents'), $filename);
                    $validatedData[$field] = 'loan_documents/' . $filename;
                }
            }

            $application->update($validatedData);

            return response()->json([
                'success' => true,
                'message' => 'Loan application updated successfully',
                'data' => $application->load(['customer', 'user', 'reviewer'])
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating loan application: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update loan application',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function updateStatus(Request $request, $id)
    {
        try {
            $validatedData = $request->validate([
                'status' => 'required|in:approved,pending,under_review,rejected,back_for_revision',
                'rejection_reason' => 'required_if:status,rejected|string|max:500',
                'revision_reason' => 'required_if:status,back_for_revision|string|max:500'
            ]);

            $application = LoanApplication::where('loan_application_id', $id)->first();
            
            if (!$application) {
                return response()->json([
                    'success' => false,
                    'message' => 'Loan application not found',
                    'error' => "Application with ID {$id} does not exist"
                ], 404);
            }
            
            $statusHistory = $application->status_history ?? [];
            
            $reason = null;
            if ($validatedData['status'] === 'rejected' && isset($validatedData['rejection_reason'])) {
                $reason = $validatedData['rejection_reason'];
            } elseif ($validatedData['status'] === 'back_for_revision' && isset($validatedData['revision_reason'])) {
                $reason = $validatedData['revision_reason'];
            }
            
            $statusHistory[] = [
                'status' => $validatedData['status'],
                'timestamp' => now()->toISOString(),
                'reason' => $reason,
                'changed_by' => $request->user()->user_unique_id
            ];
            
            $application->application_status = $validatedData['status'];
            $application->status_history = $statusHistory;
            if ($validatedData['status'] === 'rejected' && isset($validatedData['rejection_reason'])) {
                $application->rejection_reason = $validatedData['rejection_reason'];
            }
            if ($validatedData['status'] === 'back_for_revision' && isset($validatedData['revision_reason'])) {
                $application->revision_reason = $validatedData['revision_reason'];
            }
            $application->save();

            return response()->json([
                'success' => true,
                'message' => 'Application status updated successfully',
                'data' => $application->load(['customer', 'user'])
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Update status error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function startLoan(Request $request, $loanApplicationId)
    {
        try {
            $validatedData = $request->validate([
                'loan_amount' => 'required|numeric|min:1000',
                'interest_rate' => 'required|numeric|min:1|max:50',
                'tenure_months' => 'required|integer|min:1|max:360',
                'emi_amount' => 'required|numeric|min:100',
                'total_amount' => 'required|numeric|min:1000',
                'loan_start_date' => 'required|date',
                'loan_end_date' => 'required|date|after:loan_start_date',
                'loan_status' => 'required|in:active,completed,defaulted,closed',
                'user_id' => 'nullable|string',
                'branch_id' => 'nullable|string',
                'cms_admin_id' => 'nullable|string',
                'apply_processing_fee' => 'nullable|in:true,false,1,0',
                'apply_gst' => 'nullable|in:true,false,1,0',
                'processing_fee_type' => 'nullable|in:percentage,fixed',
                'processing_fee_percent' => 'nullable|numeric|min:0|max:100',
                'processing_fee_amount' => 'nullable|numeric|min:0',
                'gst_percentage' => 'nullable|numeric|min:0|max:100',
                'gst_amount' => 'nullable|numeric|min:0',
            ]);

            $application = LoanApplication::where('loan_application_id', $loanApplicationId)->first();
            
            if (!$application) {
                return response()->json([
                    'success' => false,
                    'message' => 'Application not found',
                    'error' => 'Loan application does not exist'
                ], 404);
            }
            
            if ($application->application_status !== 'approved') {
                return response()->json([
                    'success' => false,
                    'message' => 'Application not approved',
                    'error' => 'Loan application not approved!'
                ], 400);
            }

            $customer = $application->customer;

            if (isset($validatedData['apply_processing_fee'])) {
                $validatedData['apply_processing_fee'] = filter_var($validatedData['apply_processing_fee'], FILTER_VALIDATE_BOOLEAN);
            }
            if (isset($validatedData['apply_gst'])) {
                $validatedData['apply_gst'] = filter_var($validatedData['apply_gst'], FILTER_VALIDATE_BOOLEAN);
            }

            $loanUserId = $validatedData['user_id'] ?? $application->user_id ?? $customer->customer_unique_id;
            $loanBranchId = $validatedData['branch_id'] ?? $application->branch_id ?? null;
            $loanCmsAdminId = $validatedData['cms_admin_id'] ?? $application->cms_admin_id ?? null;

            $loan = \App\Models\Loan\Loan::create([
                'loan_id' => 'LOAN' . date('Y') . str_pad((\App\Models\Loan\Loan::max('id') ?? 0) + 1, 6, '0', STR_PAD_LEFT),
                'loan_application_id' => $loanApplicationId,
                'user_id' => $loanUserId,
                'branch_id' => $loanBranchId,
                'cms_admin_id' => $loanCmsAdminId,
                'loan_amount' => $validatedData['loan_amount'],
                'interest_rate' => $validatedData['interest_rate'],
                'tenure_months' => $validatedData['tenure_months'],
                'emi_amount' => $validatedData['emi_amount'],
                'total_amount' => $validatedData['total_amount'],
                'loan_start_date' => $validatedData['loan_start_date'],
                'loan_end_date' => $validatedData['loan_end_date'],
                'loan_status' => $validatedData['loan_status'],
                'remaining_amount' => $validatedData['total_amount'],
                'paid_amount' => 0,
                'apply_processing_fee' => $validatedData['apply_processing_fee'] ?? false,
                'apply_gst' => $validatedData['apply_gst'] ?? false,
                'processing_fee_type' => $validatedData['processing_fee_type'] ?? 'percentage',
                'processing_fee_percent' => $validatedData['processing_fee_percent'] ?? 0,
                'processing_fee_amount' => $validatedData['processing_fee_amount'] ?? 0,
                'gst_percentage' => $validatedData['gst_percentage'] ?? 0,
                'gst_amount' => $validatedData['gst_amount'] ?? 0,
            ]);

            EmiCalculatorService::generateEmiSchedule($loan);

            $application->update(['loan_started' => true]);

            return response()->json([
                'success' => true,
                'message' => 'Loan started successfully with EMI schedule generated',
                'data' => $loan->load('emiSchedules')
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Start loan error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to start loan',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $application = LoanApplication::where('loan_application_id', $id)->firstOrFail();
            
            if ($application->application_status === 'approved') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete approved loan application'
                ], 400);
            }
            
            $application->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Loan application deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Loan application not found'
            ], 404);
        }
    }
}
