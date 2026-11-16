<?php

namespace App\Models\Loan;

use App\Models\Role;
use App\Models\Loan\Loan;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class LoanCustomer extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $table = 'loan_customers';

    protected $fillable = [
        'email',
        'password',
        'role',
        'status',
        'verification_status',
        'verified_by',
        'verified_at',
        'verification_notes',
        'customer_unique_id',
        'agent_unique_id',
        'sourcing_type',
        'referral_id',
        'user_id',
        'branch_id',
        'cms_admin_id',
        'date_of_birth',
        'adhaar_number',
        'adhaar_image',
        'adhaar_image_back',
        'pan_number',
        'pan_image',
        'driving_license_number',
        'driving_license_image',
        'voter_id_number',
        'voter_id_image',
        'voter_id_image_back',
        'ration_card_number',
        'ration_card_image',
        // 'enrollment_number',
        // 'enrollment_date',
        'first_name',
        'middle_name',
        'last_name',
        'gender',
        'father_name',
        'service_area_pin',
        'religion',
        'caste',
        'permanent_address',
        'correspondence_address',
        'contact_number_1',
        'contact_number_2',
        'nominee_name',
        'nominee_relationship',
        'nominee_relationship_other',
        'nominee_address',
        'occupation',
        'salaried_type',
        'business_nature',
        'spouse_occupation',
        'spouse_salaried_type',
        'spouse_business_nature',
        'residence_type',
        'years_of_staying',
        'house_type',
        'number_of_rooms',
        'assets',
        'is_disabled',
        'disability_type',
        'customer_photo',
        'passbook_image',
        'other_name',
        'other_document',
        'status_history',
        'customer_consent',
        'is_deleted',
        'is_delete_requested',
        'unhashed_password',
    ];

    protected static function booted()
    {
        static::addGlobalScope('notDeleted', function ($builder) {
            $builder->where('is_deleted', 0);
        });

        static::creating(function ($customer) {

            if (!isset($customer->is_deleted)) {
                $customer->is_deleted = 0;
            }

            if (empty($customer->customer_unique_id)) {
                $branchCode = null;

                if (!empty($customer->branch_id)) {
                    // branch_id is stored as the branch code string e.g. 'CHI-4402'
                    $parts = explode('-', $customer->branch_id);
                    $numeric = (int) end($parts);
                    if ($numeric > 0) {
                        $branchCode = $numeric;
                    }
                }

                // Default base: 4401 -> prefix 024
                $baseCode   = 4401;
                $basePrefix = 24;
                $prefix = str_pad($basePrefix + (($branchCode ?? $baseCode) - $baseCode), 3, '0', STR_PAD_LEFT);

                // Per-branch sequence based on max existing ID for that prefix
                $last = self::withoutGlobalScope('notDeleted')
                    ->where('customer_unique_id', 'like', $prefix . '%')
                    ->orderByDesc('customer_unique_id')
                    ->value('customer_unique_id');

                $nextSeq = $last ? ((int) substr($last, strlen($prefix)) + 1) : 1;
                $sequence = str_pad($nextSeq, 7, '0', STR_PAD_LEFT);

                $customer->customer_unique_id = $prefix . $sequence;
            }
        });
    }

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'status_history' => 'array',
            'is_disabled' => 'boolean',
            'is_delete_requested' => 'boolean',
        ];
    }

    public function roleData()
    {
        return $this->belongsTo(Role::class, 'role', 'name');
    }

    public function agent()
    {
        return $this->belongsTo(LoanAgent::class, 'agent_unique_id', 'agent_unique_id');
    }

    public function cafs()
    {
        return $this->hasMany(CreditApplicationForm::class, 'customer_unique_id', 'customer_unique_id');
    }

    public function verificationHistory()
    {
        return $this->hasMany(LoanCustomerVerificationHistory::class, 'customer_id');
    }

    public function branchDetails()
    {
        return $this->belongsTo(\App\Models\Branch::class, 'branch_id', 'id');
    }

    public static function generateUniqueId()
    {
        $yearMonth = date('Ym');
        $prefix = 'LN' . $yearMonth;

        $lastUser = self::where('customer_unique_id', 'like', $prefix . '%')
            ->orderBy('customer_unique_id', 'desc')
            ->first();

        if ($lastUser) {
            $lastNumber = (int) substr($lastUser->customer_unique_id, -3);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . str_pad($newNumber, 3, '0', STR_PAD_LEFT);
    }


    // public static function generateEnrollmentNumber()
    // {
    //     $yearMonth = date('Ym');
    //     $prefix = 'ENR' . $yearMonth;

    //     $lastUser = self::withoutGlobalScope('notDeleted')->where('enrollment_number', 'like', $prefix . '%')
    //         ->orderBy('enrollment_number', 'desc')
    //         ->first();

    //     if ($lastUser) {
    //         $lastNumber = (int) substr($lastUser->enrollment_number, -3);
    //         $newNumber = $lastNumber + 1;
    //     } else {
    //         $newNumber = 1;
    //     }

    //     return $prefix . str_pad($newNumber, 3, '0', STR_PAD_LEFT);
    // }

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

    public function latestEnrollment()
    {
        return $this->hasOne(
            CustomerEnrollment::class,
            'customer_unique_id',
            'customer_unique_id'
        )->withoutGlobalScope('notDeleted')->latestOfMany();
    }

    public function enrollments()
    {
        return $this->hasMany(
            CustomerEnrollment::class,
            'customer_unique_id',
            'customer_unique_id'
        )->withoutGlobalScope('notDeleted');
    }

    public function activeLoans()
    {
        return $this->hasMany(Loan::class, 'customer_unique_id', 'customer_unique_id')
            ->where('is_deleted', 0);
    }
}
