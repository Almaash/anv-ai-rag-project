<?php

namespace App\Models\Loan;

use Illuminate\Database\Eloquent\Model;
use App\Models\LoanApplication;
use App\Models\User;
use App\Traits\HasIsDeletedSoftDelete;

class LoanDisbursement extends Model
{
    use HasIsDeletedSoftDelete;

    protected $table = 'loan_disbursements';

    protected $fillable = [
        'disbursement_id',
        'payment_id',
        'loan_application_id',
        'pd_application_id',
        'cam_unique_id',
        'user_id',
        'customer_unique_id',
        'branch_id',
        'cms_admin_id',
        'disbursed_amount',
        'disbursement_method',
        'bank_account_number',
        'bank_name',
        'ifsc_code',
        'transaction_reference',
        'cheque_number',
        'disbursement_date',
        'date_of_disbursement',
        'booking_date',
        'payment_date',
        'payment_status',
        'is_disbursed',
        'is_loan_started',
        'disbursement_status',
        'disbursed_by',
        'disbursement_notes',
        'receipt_document',
        'dfa_document',
        'cfa_document',
        'dpn_document',
        'vernacular_document',
        'disbursement_video',
        'investor_unique_id',
        'payment_method',
        'upi_reference_no',
        'payment_screenshot',
        'is_deleted',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($disbursement) {
            if (empty($disbursement->disbursement_id)) {
                $disbursement->disbursement_id = self::generateDisbursementId();
            }
        });
    }

    public static function generatePaymentId(): string
    {
        $maxNumber = self::withoutGlobalScope('not_deleted')
            ->whereNotNull('payment_id')
            ->get()
            ->map(function ($row) {

                if (
                    preg_match(
                        '/DIS\/(\d+)/',
                        $row->payment_id,
                        $matches
                    )
                ) {
                    return (int) $matches[1];
                }

                return 0;
            })
            ->max();

        $nextNumber = ($maxNumber ?? 0) + 1;

        return 'DIS/' . str_pad(
            $nextNumber,
            4,
            '0',
            STR_PAD_LEFT
        );
    }

    private static function generateDisbursementId(): string
    {
        $maxNumber = self::withoutGlobalScope('not_deleted')
            ->whereNotNull('disbursement_id')
            ->get()
            ->map(function ($row) {

                if (
                    preg_match(
                        '/DIS(\d+)/',
                        $row->disbursement_id,
                        $matches
                    )
                ) {
                    return (int) $matches[1];
                }

                return 0;
            })
            ->max();

        $nextNumber = ($maxNumber ?? 0) + 1;

        return 'DIS' . str_pad(
            $nextNumber,
            3,
            '0',
            STR_PAD_LEFT
        );
    }

    public static function generateInvestorDisbursementId(
        string $branchCode,
        string $poolLabel
    ): string {

        $fy = self::currentFinancialYear();

        $prefix = "DIS/{$branchCode}/{$fy}/{$poolLabel}/";

        $maxNumber = self::withoutGlobalScope('not_deleted')
            ->where('disbursement_id', 'like', $prefix . '%')
            ->get()
            ->map(function ($row) {

                $parts = explode('/', $row->disbursement_id);

                $lastPart = end($parts);

                return is_numeric($lastPart)
                    ? (int) $lastPart
                    : 0;
            })
            ->max();

        $nextNumber = ($maxNumber ?? 0) + 1;

        return $prefix .
            str_pad(
                $nextNumber,
                5,
                '0',
                STR_PAD_LEFT
            );
    }

    private static function currentFinancialYear(): string
    {
        $month = (int) date('n');
        $year  = (int) date('Y');
        if ($month < 4) {
            return substr($year - 1, 2) . '-' . substr($year, 2);
        }
        return substr($year, 2) . '-' . substr($year + 1, 2);
    }

    public function loanApplication()
    {
        return $this->belongsTo(\App\Models\Loan\CreditApplicationForm::class, 'loan_application_id', 'loan_application_id');
    }

    public function user()
    {
        return $this->belongsTo(LoanCustomer::class, 'customer_unique_id', 'customer_unique_id');
    }

    public function customer()
    {
        return $this->belongsTo(LoanCustomer::class, 'customer_unique_id', 'customer_unique_id');
    }

    public function pdInformation()
    {
        return $this->belongsTo(PdInformation::class, 'pd_application_id', 'pd_application_id');
    }

    public function cam()
    {
        return $this->belongsTo(CAM::class, 'cam_unique_id', 'cam_unique_id');
    }

    public function disbursedBy()
    {
        return $this->belongsTo(\App\Models\User::class, 'disbursed_by', 'user_id');
    }
}
