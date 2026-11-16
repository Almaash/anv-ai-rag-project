<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InvestorDisbursement;
use App\Models\Investor\BasicInformation;
use App\Models\MoneyPool;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InvestorDisbursementController extends Controller
{
    /**
     * GET /loan/investor-disbursements/preview-id
     * Returns the next disbursement ID that would be generated (without saving).
     * Query params: branch_code, pool_label, date (optional, defaults to today)
     */
    public function previewId(Request $request)
    {
        try {
            $branchCode = $request->query('branch_code');
            $poolLabel  = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $request->query('pool_label', '')));
            $date       = $request->query('date') ? new \DateTime($request->query('date')) : new \DateTime();

            if (!$branchCode || !$poolLabel) {
                return response()->json(['success' => false, 'message' => 'branch_code and pool_label are required'], 422);
            }

            $fy            = InvestorDisbursement::financialYear($date);
            $runningNumber = InvestorDisbursement::nextRunningNumber($branchCode, $fy, $poolLabel);
            $uniqueId      = InvestorDisbursement::buildUniqueId($branchCode, $fy, $poolLabel, $runningNumber);

            return response()->json([
                'success'        => true,
                'disbursement_id' => $uniqueId,
                'financial_year' => $fy,
                'running_number' => $runningNumber,
            ]);
        } catch (\Exception $e) {
            Log::error('preview-id error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /loan/investor-disbursements
     * Create a new investor disbursement record.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'investor_unique_id'  => 'required|string',
            'pool_label'          => 'required|string',
            'pool_name'           => 'nullable|string',
            'investor_type'       => 'nullable|string',
            'loan_application_id' => 'nullable|string',
            'branch_code'         => 'required|string',
            'branch_id'           => 'nullable|string',
            'cms_admin_id'        => 'nullable|string',
        ]);

        try {
            $date = new \DateTime();
            $fy   = InvestorDisbursement::financialYear($date);

            // Sanitize pool_label: strip quotes/spaces → e.g. PB
            $validated['pool_label'] = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $validated['pool_label']));

            // Fetch investor name for denormalization
            $investor     = BasicInformation::where('unique_id', $validated['investor_unique_id'])->first();
            $investorName = $investor ? trim($investor->first_name . ' ' . $investor->last_name) : null;

            $record = DB::transaction(function () use ($validated, $fy, $investorName) {
                $runningNumber = InvestorDisbursement::nextRunningNumber(
                    $validated['branch_code'],
                    $fy,
                    $validated['pool_label']
                );

                $uniqueId = InvestorDisbursement::buildUniqueId(
                    $validated['branch_code'],
                    $fy,
                    $validated['pool_label'],
                    $runningNumber
                );

                return InvestorDisbursement::create([
                    'disbursement_unique_id' => $uniqueId,
                    'investor_unique_id'     => $validated['investor_unique_id'],
                    'investor_name'          => $investorName,
                    'pool_name'              => $validated['pool_name'] ?? null,
                    'pool_label'             => $validated['pool_label'],
                    'investor_type'          => $validated['investor_type'] ?? null,
                    'loan_application_id'    => $validated['loan_application_id'] ?? null,
                    'branch_id'              => $validated['branch_id'] ?? null,
                    'branch_code'            => $validated['branch_code'],
                    'cms_admin_id'           => $validated['cms_admin_id'] ?? null,
                    'financial_year'         => $fy,
                    'running_number'         => $runningNumber,
                    'status'                 => 'pending',
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Investor disbursement created successfully',
                'data'    => $record,
            ], 201);
        } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
            return response()->json(['success' => false, 'message' => 'Duplicate disbursement ID. Please retry.'], 409);
        } catch (\Exception $e) {
            Log::error('investor-disbursement store error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /loan/investor-disbursements
     * List all investor disbursements.
     */
    public function index(Request $request)
    {
        try {
            $query = InvestorDisbursement::query();

            if ($request->query('branch_code')) {
                $query->where('branch_code', $request->query('branch_code'));
            }
            if ($request->query('investor_unique_id')) {
                $query->where('investor_unique_id', $request->query('investor_unique_id'));
            }

            $data = $query->latest()->paginate(15);

            return response()->json(['success' => true, 'data' => $data]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
