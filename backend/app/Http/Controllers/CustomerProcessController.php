<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Loan\LoanCustomer;
use App\Models\Loan\CreditApplicationForm;
use App\Models\Loan\PdInformation;
use App\Models\Loan\CAM;
use App\Models\Loan\Disbursement;

class CustomerProcessController extends Controller
{
    public function getCustomerProcesses($customer_id)
    {
        try {
            // Get customer
            $customer = LoanCustomer::where('customer_unique_id', $customer_id)
                ->where('is_deleted', 0)
                ->first();
            
            if (!$customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Customer not found'
                ], 404);
            }

            // Get all CAF applications for this customer
            $cafApplications = CreditApplicationForm::where('customer_unique_id', $customer_id)
                ->with(['pd', 'cam', 'disbursements'])
                ->get();

            $processData = [];

            foreach ($cafApplications as $caf) {
                $cafData = [
                    'loan_application_id' => $caf->loan_application_id,
                    'caf_status' => $caf->status,
                    'is_verified' => $caf->is_verified,
                    'caf_created_at' => $caf->created_at,
                    'pd' => null,
                    'cam' => null,
                    'disbursements' => []
                ];

                // Get PD data
                if ($caf->pd) {
                    $cafData['pd'] = [
                        'pd_application_id' => $caf->pd->pd_application_id,
                        'pd_status' => $caf->pd->status,
                        'verification_status' => $caf->pd->verification_status,
                        'is_verified' => $caf->pd->is_verified,
                        'pd_created_at' => $caf->pd->created_at,
                        'pd_updated_at' => $caf->pd->updated_at
                    ];
                }

                // Get CAM data
                if ($caf->cam) {
                    $cafData['cam'] = [
                        'cam_unique_id' => $caf->cam->cam_unique_id,
                        'cam_status' => $caf->cam->status,
                        'credit_decision' => $caf->cam->credit_decision,
                        'credit_sanction_status' => $caf->cam->credit_sanction_status,
                        'is_verified' => $caf->cam->is_verified,
                        'cam_created_at' => $caf->cam->created_at,
                        'cam_updated_at' => $caf->cam->updated_at
                    ];
                }

                // Get disbursement data
                if ($caf->disbursements->count() > 0) {
                    foreach ($caf->disbursements as $disbursement) {
                        $cafData['disbursements'][] = [
                            'disbursement_id' => $disbursement->disbursement_id,
                            'is_disbursed' => $disbursement->is_disbursed,
                            'date_of_disbursement' => $disbursement->date_of_disbursement,
                            'booking_date' => $disbursement->booking_date,
                            'created_at' => $disbursement->created_at
                        ];
                    }
                }

                $processData[] = $cafData;
            }

            return response()->json([
                'success' => true,
                'customer' => [
                    'customer_unique_id' => $customer->customer_unique_id,
                    'name' => $customer->name,
                    'mobile' => $customer->mobile
                ],
                'applications' => $processData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching customer processes: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getCustomerCAF($customer_id, $caf_id)
    {
        try {
            $caf = CreditApplicationForm::where('customer_unique_id', $customer_id)
                ->where('loan_application_id', $caf_id)
                ->first();

            if (!$caf) {
                return response()->json([
                    'success' => false,
                    'message' => 'CAF not found for this customer'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $caf
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching CAF: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getCustomerPD($customer_id, $pd_id)
    {
        try {
            $pd = PdInformation::where('customer_unique_id', $customer_id)
                ->where('pd_application_id', $pd_id)
                ->first();

            if (!$pd) {
                return response()->json([
                    'success' => false,
                    'message' => 'PD not found for this customer'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $pd
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching PD: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getCustomerCAM($customer_id, $cam_id)
    {
        try {
            $cam = CAM::where('customer_unique_id', $customer_id)
                ->where('cam_unique_id', $cam_id)
                ->first();

            if (!$cam) {
                return response()->json([
                    'success' => false,
                    'message' => 'CAM not found for this customer'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $cam
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching CAM: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getCustomerDisbursement($customer_id, $disbursement_id)
    {
        try {
            $disbursement = Disbursement::where('customer_unique_id', $customer_id)
                ->where('disbursement_id', $disbursement_id)
                ->first();

            if (!$disbursement) {
                return response()->json([
                    'success' => false,
                    'message' => 'Disbursement not found for this customer'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $disbursement
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching disbursement: ' . $e->getMessage()
            ], 500);
        }
    }
}