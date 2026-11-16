<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\Loan\LoanDisbursement;
use App\Models\Loan\CAM;
use App\Models\Loan\CreditApplicationForm;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class DisbursementController extends Controller
{
    /**
     * Get all disbursements that have been initialized (have dates) for the final panel.
     */
    public function getInitializedDisbursements(Request $request)
    {
        try {
            $branchId = $request->query('branch_id');

            // Format branch_id to BRxxxx format to match table
            if ($branchId && is_numeric($branchId)) {
                $branchId = 'BR' . str_pad($branchId, 4, '0', STR_PAD_LEFT);
            }

            $query = LoanDisbursement::whereNotNull('date_of_disbursement')
                ->whereNotNull('booking_date')
                ->where('is_deleted', 0);

            if ($branchId) {
                $query->where('branch_id', $branchId);
            }

            // Include full relation path similar to get-verified-cams
            // We want Disbursement -> LoanApplication -> Customer AND CAM AND Customer directly
            $disbursements = $query->with([
                'loanApplication:loan_application_id,credit_applied_for,product_name,product_code,tenure_option',
                'customer:customer_unique_id,first_name,last_name',
                'pdInformation:pd_application_id,created_at'
            ])
                ->select([
                    'id',
                    'disbursement_id',
                    'is_deleted',
                    'loan_application_id',
                    'pd_application_id',
                    'cam_unique_id',
                    'branch_id',
                    'cms_admin_id',
                    'customer_unique_id',
                    'date_of_disbursement',
                    'booking_date',
                    'disbursement_status'
                ])
                ->latest()
                ->get()
                ->map(function ($disbursement) {
                    return [
                        'id' => $disbursement->id,
                        'disbursement_id' => $disbursement->disbursement_id,
                        'is_deleted' => $disbursement->is_deleted,
                        'loan_application_id' => $disbursement->loan_application_id,
                        'pd_application_id' => $disbursement->pd_application_id,
                        'cam_unique_id' => $disbursement->cam_unique_id,
                        'branch_id' => $disbursement->branch_id,
                        'cms_admin_id' => $disbursement->cms_admin_id,
                        'customer_unique_id' => $disbursement->customer_unique_id,
                        'date_of_pd_done' => $disbursement->pdInformation ? $disbursement->pdInformation->created_at->format('d/m/Y') : null,
                        'member_name' => $disbursement->customer ? $disbursement->customer->first_name . ' ' . $disbursement->customer->last_name : null,
                        'cust_id' => $disbursement->customer_unique_id,
                        'loan_id' => $disbursement->loan_application_id,
                        'product' => $disbursement->loanApplication ? $disbursement->loanApplication->product_name : null,
                        'product_type' => 'Individual', // Default value based on image
                        'loan_amount' => $disbursement->loanApplication ? 'Rs ' . $disbursement->loanApplication->credit_applied_for : null,
                        'status' => $disbursement->disbursement_status,
                        'date_of_booking' => $disbursement->booking_date,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $disbursements
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching initialized disbursements: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch disbursements: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get specific disbursement details by ID (e.g., DIS004 or numeric id).
     */
    public function show($id)
    {
        try {
            // Find by primary ID or disbursement_id string
            $disbursement = LoanDisbursement::with([
                'loanApplication',
                'customer',
                'pdInformation'
            ])
                ->where('id', $id)
                ->orWhere('disbursement_id', $id)
                ->orWhere('loan_application_id', $id)
                ->first();

            if (!$disbursement) {
                return response()->json([
                    'success' => false,
                    'message' => 'Disbursement record not found'
                ], 404);
            }

            $fullName = $disbursement->customer
                ? trim($disbursement->customer->first_name . ' ' . $disbursement->customer->middle_name . ' ' . $disbursement->customer->last_name)
                : $disbursement->customer_unique_id;

            $data = [
                'dateOfPdDone' => $disbursement->pdInformation ? $disbursement->pdInformation->updated_at->format('Y-m-d') : ($disbursement->created_at ? $disbursement->created_at->format('Y-m-d') : null),
                'memberName' => $fullName,
                'custId' => $disbursement->customer_unique_id,
                'loanId' => $disbursement->loan_application_id,
                'product' => $disbursement->loanApplication ? $disbursement->loanApplication->product_name : 'N/A',
                'productType' => $disbursement->loanApplication ? $disbursement->loanApplication->credit_mode : 'N/A',
                'loanAmount' => $disbursement->loanApplication ? $disbursement->loanApplication->credit_applied_for : '0',
                'status' => $disbursement->disbursement_status ?: 'Pending',
                'dateOfBooking' => $disbursement->booking_date ?: date('Y-m-d'),
                // Raw relations for advanced usage
                'raw_data' => $disbursement
            ];

            return response()->json([
                'success' => true,
                'data' => $data
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching disbursement detail: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store or Update Disbursement information.
     */
    public function store(Request $request)
    {
        try {
            $rules = [
                'loan_application_id' => 'required|string',
                'pd_application_id' => 'nullable|string',
                'cam_unique_id' => 'nullable|string',
                'customer_unique_id' => 'required|string',
                'branch_id' => 'nullable|string',
                'cms_admin_id' => 'nullable|string',
                'date_of_disbursement' => 'nullable|date',
                'booking_date' => 'nullable|date',
                'disbursement_status' => 'required|string',
                // Investor linkage (optional)
                'investor_unique_id' => 'nullable|string',
                'investor_pool_label' => 'nullable|string',
                'investor_branch_code' => 'nullable|string',
                // Document rules
                'dfa_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
                'cfa_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
                'dpn_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
                'vernacular_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            ];

            $validatedData = $request->validate($rules);

            // Get user context if not provided
            $user = auth()->user();
            $cmsAdminId = $request->input('cms_admin_id') ?? $user->user_id ?? $user->id;

            // Format branch_id to BRxxxx format to match CAM table
            $branchId = $request->input('branch_id') ?? $user->branch_id ?? $user->branch;
            if ($branchId && is_numeric($branchId)) {
                $branchId = 'BR' . str_pad($branchId, 4, '0', STR_PAD_LEFT);
            }

            $updateData = [
                'pd_application_id'   => $validatedData['pd_application_id'] ?? null,
                'cam_unique_id'       => $validatedData['cam_unique_id'] ?? null,
                'customer_unique_id'  => $validatedData['customer_unique_id'],
                'branch_id'           => $branchId,
                'cms_admin_id'        => $cmsAdminId,
                'disbursement_status' => $validatedData['disbursement_status'],
            ];

            // Check if this is a product disbursement by looking at credit_mode
            $creditApplicationForm = CreditApplicationForm::where('loan_application_id', $validatedData['loan_application_id'])->first();
            $isProductDisbursement = $creditApplicationForm && strtolower($creditApplicationForm->credit_mode) === 'product';

            // If investor is linked, generate new-format disbursement_id
            if (!empty($validatedData['investor_unique_id']) && !empty($validatedData['investor_pool_label'])) {
                $branchCode = $validatedData['investor_branch_code'] ?? $branchId;
                $poolLabel  = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $validatedData['investor_pool_label']));
                $updateData['disbursement_id'] = DB::transaction(function () use ($branchCode, $poolLabel) {
                    return LoanDisbursement::generateInvestorDisbursementId($branchCode, $poolLabel);
                });
                $updateData['investor_unique_id'] = $validatedData['investor_unique_id'];
            }
            // If this is a product disbursement (credit_mode = 'product'), use investor format with PF
            elseif ($isProductDisbursement) {
                $branchCode = $branchId;
                $poolLabel = 'PF'; // Product Finance
                $updateData['disbursement_id'] = DB::transaction(function () use ($branchCode, $poolLabel) {
                    return LoanDisbursement::generateInvestorDisbursementId($branchCode, $poolLabel);
                });
                
                Log::info('Generated product disbursement ID', [
                    'loan_application_id' => $validatedData['loan_application_id'],
                    'credit_mode' => $creditApplicationForm->credit_mode,
                    'disbursement_id' => $updateData['disbursement_id'],
                    'branch_code' => $branchCode
                ]);
            }

            if ($request->has('date_of_disbursement')) {
                $updateData['date_of_disbursement'] = $validatedData['date_of_disbursement'];
            }
            if ($request->has('booking_date')) {
                $updateData['booking_date'] = $validatedData['booking_date'];
            }

            // Handle Document Uploads
            $documentFields = [
                'dfa_document' => 'loan_disbursement/dfa',
                'cfa_document' => 'loan_disbursement/cfa',
                'dpn_document' => 'loan_disbursement/dpn',
                'vernacular_document' => 'loan_disbursement/vernacular',
                // 'disbursement_video' => 'loan_disbursement/videos',
            ];

            foreach ($documentFields as $field => $path) {
                if ($request->hasFile($field)) {
                    $uploadPath = public_path($path);
                    if (!is_dir($uploadPath)) {
                        mkdir($uploadPath, 0755, true);
                    }
                    $file = $request->file($field);
                    $filename = time() . '_' . $validatedData['loan_application_id'] . '_' . $field . '.' . $file->getClientOriginalExtension();
                    $file->move($uploadPath, $filename);
                    $updateData[$field] = $path . '/' . $filename;
                }
            }

            $disbursement = LoanDisbursement::updateOrCreate(
                ['loan_application_id' => $validatedData['loan_application_id']],
                $updateData
            );

            // Update is_disbursement_created in CAF and CAM tables
            CreditApplicationForm::where('loan_application_id', $validatedData['loan_application_id'])
                ->update(['is_disbursement_created' => true]);

            CAM::where('loan_application_id', $validatedData['loan_application_id'])
                ->update(['is_disbursement_created' => true]);

            // Update is_disbursement_created in PD Information table if pd_application_id is provided
            if (!empty($validatedData['pd_application_id'])) {
                \App\Models\Loan\PdInformation::where('pd_application_id', $validatedData['pd_application_id'])
                    ->update(['is_disbursement_created' => true]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Disbursement details saved successfully',
                'data' => $disbursement
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error saving disbursement: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to save disbursement details: ' . $e->getMessage()
            ], 500);
        }
    }

    public function clearDocuments($id)
    {
        $disbursement = LoanDisbursement::where('loan_application_id', $id)
            ->orWhere('disbursement_id', $id)
            ->orWhere('id', is_numeric($id) ? $id : null)
            ->first();

        if (!$disbursement) {
            return response()->json(['success' => false, 'message' => 'Disbursement not found'], 404);
        }

        $disbursement->update([
            'dfa_document'        => null,
            'cfa_document'        => null,
            'dpn_document'        => null,
            'vernacular_document' => null,
            'disbursement_video'  => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Disbursement documents cleared successfully',
            'data'    => $disbursement->fresh()
        ]);
    }

    public function storeFinal(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'loan_application_id' => 'required|string',
                'dfa_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
                'cfa_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
                'dpn_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
                'vernacular_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
                'disbursement_video' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:10240',
                'booking_date' => 'nullable|date',
                'disbursement_status' => 'nullable|string',
            ]);

            $disbursement = LoanDisbursement::where('loan_application_id', $validatedData['loan_application_id'])->first();

            if (!$disbursement) {
                // If not found, create a basic record with what we have
                $disbursement = LoanDisbursement::create([
                    'loan_application_id' => $validatedData['loan_application_id'],
                    'customer_unique_id' => $request->input('customer_unique_id'),
                    'branch_id' => $request->input('branch_id'),
                    'cms_admin_id' => $request->input('cms_admin_id'),
                    'booking_date' => $validatedData['booking_date'] ?? null,
                    'disbursement_status' => $validatedData['disbursement_status'] ?? 'pending',
                ]);
            } else {
                if ($request->has('booking_date')) {
                    $disbursement->booking_date = $validatedData['booking_date'];
                }
                if ($request->has('disbursement_status')) {
                    $disbursement->disbursement_status = $validatedData['disbursement_status'];
                }
            }

            $updateData = [];
            $documentFields = [
                'dfa_document'       => 'loan_disbursement/dfa',
                'cfa_document'       => 'loan_disbursement/cfa',
                'dpn_document'       => 'loan_disbursement/dpn',
                'vernacular_document'=> 'loan_disbursement/vernacular',
                'disbursement_video' => 'loan_disbursement/images',
            ];

            foreach ($documentFields as $field => $path) {
                if ($request->hasFile($field)) {
                    $uploadPath = public_path($path);
                    if (!is_dir($uploadPath)) {
                        mkdir($uploadPath, 0755, true);
                    }
                    $file = $request->file($field);
                    $filename = time() . '_' . $validatedData['loan_application_id'] . '_' . $field . '.' . $file->getClientOriginalExtension();
                    $file->move($uploadPath, $filename);
                    $updateData[$field] = $path . '/' . $filename;
                }
            }

            if (!empty($updateData)) {
                $disbursement->update($updateData);
            }

            return response()->json([
                'success' => true,
                'message' => 'Final documents uploaded successfully',
                'data' => $disbursement
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error in final disbursement upload: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload final documents: ' . $e->getMessage(),
                'error_details' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }
}
