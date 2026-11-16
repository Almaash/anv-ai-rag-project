<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class InvestorDisbursement extends Model
{
    protected $table = 'investor_disbursements';

    protected $fillable = [
        'disbursement_unique_id',
        'investor_unique_id',
        'investor_name',
        'pool_name',
        'pool_label',
        'investor_type',
        'loan_application_id',
        'branch',
        'branch_id',
        'branch_code',
        'cms_admin',
        'cms_admin_id',
        'financial_year',
        'running_number',
        'status',
    ];

    /**
     * Generate next running number safely using DB lock to prevent concurrency duplicates.
     * Scope: branch_code + financial_year + pool_label
     */
    public static function nextRunningNumber(string $branchCode, string $fy, string $poolLabel): int
    {
        return DB::transaction(function () use ($branchCode, $fy, $poolLabel) {
            $last = self::where('branch_code', $branchCode)
                ->where('financial_year', $fy)
                ->where('pool_label', $poolLabel)
                ->lockForUpdate()
                ->max('running_number');

            return ($last ?? 0) + 1;
        });
    }

    /**
     * Build the disbursement unique ID from parts.
     * Format: DIS/{BRANCH_CODE}/{FY}/P{POOL}/{RUNNING_NUMBER}
     * Example: DIS/HZB-4401/26-27/PB/00001
     */
    public static function buildUniqueId(string $branchCode, string $fy, string $poolLabel, int $runningNumber): string
    {
        return sprintf('DIS/%s/%s/%s/%05d', $branchCode, $fy, $poolLabel, $runningNumber);
    }

    /**
     * Derive financial year string from a date.
     * Before April 1 → previous FY, on/after April 1 → current FY
     * Returns format: "25-26"
     */
    public static function financialYear(\DateTime $date = null): string
    {
        $date = $date ?? new \DateTime();
        $year = (int) $date->format('Y');
        $month = (int) $date->format('n');

        if ($month < 4) {
            // Jan–Mar: FY is (year-1)–year
            return substr($year - 1, 2) . '-' . substr($year, 2);
        }
        // Apr–Dec: FY is year–(year+1)
        return substr($year, 2) . '-' . substr($year + 1, 2);
    }

    public function investor()
    {
        return $this->belongsTo(\App\Models\Investor\BasicInformation::class, 'investor_unique_id', 'unique_id');
    }
}
