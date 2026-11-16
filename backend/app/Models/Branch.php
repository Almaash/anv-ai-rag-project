<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    protected $fillable = [
        'branch_city_id',
        'sequence',
        'name',
        'code',
        'address',
        'phone',
        'email',
        'is_active',
        'admin_user_id',
        'is_deleted'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_deleted' => 'integer'
    ];

    public function city()
    {
        return $this->belongsTo(BranchCity::class, 'branch_city_id');
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($branch) {
            if ($branch->branch_city_id) {
                // Get city context
                $city = BranchCity::find($branch->branch_city_id);
                if ($city) {
                    $cityNumPrefix = substr($city->city_number, 0, 2);
                    $nextSequence = self::query()
                        ->where('code', 'like', '%-' . $cityNumPrefix . '%')
                        ->get(['code'])
                        ->map(function (Branch $existingBranch) use ($cityNumPrefix) {
                            $suffix = substr((string) $existingBranch->code, -4);

                            if (str_starts_with($suffix, $cityNumPrefix) && ctype_digit($suffix)) {
                                return (int) substr($suffix, 2);
                            }

                            return 0;
                        })
                        ->max() + 1;

                    $branch->sequence = $nextSequence;
                    $branch->code = strtoupper($city->city_code)
                        . '-' . $cityNumPrefix
                        . str_pad($nextSequence, 2, '0', STR_PAD_LEFT);
                }
            }
        });
    }
}
