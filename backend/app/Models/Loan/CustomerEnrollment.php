<?php

namespace App\Models\Loan;

use Illuminate\Database\Eloquent\Model;
use App\Models\Branch;

class CustomerEnrollment extends Model
{
    protected $table = 'customer_enrollments';

    protected $fillable = [
        'enrollment_number',
        'customer_unique_id',
        'branch_id',
        'cms_admin_id',
        'enrolled_by',
        'enrollment_date',

        'status',
        'status_history',

        'verification_status',
        'verified_by',
        'verified_at',
        'verification_notes',

        'rejection_reason',
        'reverted_by',
        'reverted_at',
        'is_deleted',
    ];

    protected $casts = [
        'enrollment_date' => 'date',
        'verified_at' => 'datetime',
        'reverted_at' => 'datetime',

        'status_history' => 'array',
        'is_deleted' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope('notDeleted', function ($builder) {
            $builder->where('is_deleted', 0);
        });

        static::creating(function ($enrollment) {
            if (!isset($enrollment->is_deleted)) {
                $enrollment->is_deleted = 0;
            }

            // If enrollment number already provided, don't generate
            if (!empty($enrollment->enrollment_number)) {
                return;
            }

            // Resolve branch digits
            $branchDigits = '0000';

            if ($enrollment->branch_id) {
                $branch = Branch::where('code', $enrollment->branch_id)->first()
                    ?? Branch::find($enrollment->branch_id);

                if (
                    $branch &&
                    $branch->code &&
                    preg_match('/(\d+)$/', $branch->code, $matches)
                ) {
                    $branchDigits = $matches[1];
                }
            }

            // Get last enrollment for this branch (including soft-deleted to avoid duplicate numbers)
            $lastEnrollment = self::withoutGlobalScope('notDeleted')
                ->where('branch_id', $enrollment->branch_id)
                ->whereNotNull('enrollment_number')
                ->orderByDesc('id')
                ->first();

            if ($lastEnrollment) {
                $lastSequence = (int) substr(
                    $lastEnrollment->enrollment_number,
                    -6
                );

                $nextSequence = $lastSequence + 1;
            } else {
                $nextSequence = 1;
            }

            $branchSequence = str_pad(
                $nextSequence,
                6,
                '0',
                STR_PAD_LEFT
            );

            $enrollment->enrollment_number =
                $branchDigits . $branchSequence;
        });
    }

    public function customer()
    {
        return $this->belongsTo(
            LoanCustomer::class,
            'customer_unique_id',
            'customer_unique_id'
        );
    }

    /**
     * Get only soft deleted records (is_deleted = 1)
     */
    public static function onlyTrashed()
    {
        return static::withoutGlobalScope('notDeleted')->where('is_deleted', 1);
    }

    /**
     * Get all records including soft deleted ones
     */
    public static function withTrashed()
    {
        return static::withoutGlobalScope('notDeleted');
    }

    /**
     * Soft delete the model by setting is_deleted = 1
     */
    public function softDelete()
    {
        return $this->update(['is_deleted' => 1]);
    }

    /**
     * Restore the soft deleted model by setting is_deleted = 0
     */
    public function restore()
    {
        return $this->update(['is_deleted' => 0]);
    }

    /**
     * Check if the model is soft deleted
     */
    public function isTrashed()
    {
        return $this->is_deleted == 1;
    }
}
