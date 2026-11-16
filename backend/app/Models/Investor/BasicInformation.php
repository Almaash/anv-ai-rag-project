<?php

namespace App\Models\Investor;

use App\Models\Role;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;

class BasicInformation extends Model
{
    use HasFactory, SoftDeletes, HasApiTokens;

    protected $table = 'investor_basic_information';

    protected $fillable = [
        'unique_id',
        'branch',
        'branch_id',
        'cms_admin',
        'cms_admin_id',
        'investor_id',
        'first_name',
        'last_name',
        'email',
        'mobile',
        'date_of_birth',
        'gender',
        'pan_number',
        'aadhaar_number',
        'current_address',
        'permanent_address',
        'referral_type',
        'referral_id',
        'enrollment_date',
        'emergency_contact',
        'nominee_details',
        'profile_photo',
        'pan_card_doc',
        'aadhaar_card_doc',
        'passbook_doc',
        'voter_id_doc',
        'total_referral_bonus',
        'password',
        'unhashed_password',
        'role',
    ];

    protected $hidden = [
        'password',
        'unhashed_password',
    ];

    public function roleData()
    {
        return $this->belongsTo(Role::class, 'role', 'name');
    }
}