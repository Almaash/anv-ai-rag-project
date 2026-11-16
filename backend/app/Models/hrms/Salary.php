<?php

namespace App\Models\hrms;

use Illuminate\Database\Eloquent\Model;
use App\Traits\GeneratesUniqueId;
use App\Traits\HasIsDeletedSoftDelete;

class Salary extends Model
{
    use GeneratesUniqueId, HasIsDeletedSoftDelete;

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            if (empty($model->payout_id)) {
                $prefix = 'PAY';
                $startFrom = 1001;
                
                $latest = static::withoutGlobalScopes()
                    ->where('payout_id', 'like', $prefix . '%')
                    ->orderBy('id', 'desc')
                    ->first();
                
                $number = $latest ? ((int) preg_replace('/[^0-9]/', '', (string) $latest->payout_id)) + 1 : $startFrom;
                
                while (static::withoutGlobalScopes()->where('payout_id', $prefix . $number)->exists()) {
                    $number++;
                }
                
                $model->payout_id = $prefix . $number;
            }
        });
    }

    public function getUniqueIdColumn(): string
    {
        return 'salary_id';
    }

    public function getUniqueIdPrefix(): string
    {
        return 'SLR';
    }

    protected $table = 'hrms_salaries';

    protected $fillable = [
        'payout_id',
        'salary_id',
        'cms_admin_id',
        'branch_id',
        'employee_id',
        'month',
        'payment_date',
        'total_working_days',
        'present_days',
        'absent_days',
        'leave_days',
        'basic_pay',
        'allowances',
        'deductions',
        'net_pay',
        'status',
        'payment_method',
        'note',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'employee_id');
    }

    public function creator()
    {
        return $this->belongsTo(\App\Models\User::class, 'cms_admin_id', 'cms_admin');
    }

    /**
     * Scope to filter by the authenticated admin's branch.
     */
    public function scopeForAdmin($query, $admin)
    {
        if (!$admin) return $query;

        // If employee, they only see their own salary
        if ($admin instanceof \App\Models\hrms\Employee) {
            return $query->where('employee_id', $admin->id);
        }

        // Superadmin sees everything
        if (strtolower((string) $admin->role) === 'superadmin') {
            return $query;
        }

        // Relationship-based scoping using cms_admin
        if (!empty($admin->cms_admin)) {
            $query->where('cms_admin_id', $admin->cms_admin);
        }

        // Branch-based scoping through employee
        return $query->whereHas('employee', function ($q) use ($admin) {
            $q->forAdmin($admin);
        });
    }
}
