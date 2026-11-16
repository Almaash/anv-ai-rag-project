<?php

namespace App\Models\Loan;

use App\Traits\HasIsDeletedSoftDelete;
use Illuminate\Database\Eloquent\Model;

class LoanAgent extends Model
{
    use HasIsDeletedSoftDelete;

    protected $table = 'loan_agents';

    protected $fillable = [
        'agent_unique_id', 'name', 'email', 'phone_no', 'gender', 'location',
        'address', 'photo', 'adhaar_image', 'aadhaar_image_back', 'pan_image', 'voter_id_image', 'voter_id_image_back',
        'driving_license_image', 'passbook_image', 'police_verification_image', 'status',
        'user_id', 'branch_id', 'cms_admin_id', 'is_deleted', 'password', 'unhashed_password',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($agent) {
            if (empty($agent->agent_unique_id)) {
                $agent->agent_unique_id = self::generateAgentId();
            }
        });
    }

    private static function generateAgentId()
    {
        $lastAgent = self::orderBy('id', 'desc')->first();
        $number = $lastAgent ? $lastAgent->id + 1 : 1;
        return 'AGT' . date('Y') . str_pad($number, 4, '0', STR_PAD_LEFT);
    }
}
