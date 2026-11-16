<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Traits\GeneratesUniqueId;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, GeneratesUniqueId;

    public function getUniqueIdColumn(): string
    {
        return 'user_id';
    }

    public function getUniqueIdPrefix(): string
    {
        return 'anv_';
    }

    public function getUniqueIdStart(): int
    {
        return 1;
    }

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'password',
        'unhashed_password',
        'phone',
        'role',
        'department',
        'branch',
        'created_by',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    public function branchDetails()
    {
        return $this->belongsTo(Branch::class, 'branch', 'code');
    }
}
