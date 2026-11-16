<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BranchCity extends Model
{
    protected $table = 'branch_cities';

    protected $fillable = [
        'city_name',
        'city_code',
        'city_number',
        'branch_code',
        'state',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // Auto-generate branch_code from city_code + city_number
    protected static function booted(): void
    {
        static::saving(function (BranchCity $city) {
            if ($city->city_code && $city->city_number) {
                $city->branch_code = strtoupper($city->city_code) . '-' . $city->city_number;
            }
        });
    }
}
