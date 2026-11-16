<?php

namespace App\Models\Traits;

use App\Http\Helpers\AuthContext;
use App\Scopes\BranchScope;

trait BelongsToBranch
{
    public static function bootBelongsToBranch(): void
    {
        static::addGlobalScope(new BranchScope);

        static::creating(function ($model) {
            $branch   = AuthContext::branchId();
            $cmsAdmin = AuthContext::cmsAdminId();

            if (empty($model->branch)) {
                $model->branch = $branch;
            }
            if (empty($model->branch_id)) {
                $model->branch_id = $branch;
            }
            if (empty($model->cms_admin_id)) {
                $model->cms_admin_id = $cmsAdmin;
            }
            if (empty($model->cms_admin)) {
                $model->cms_admin = $cmsAdmin;
            }
        });
    }

    public static function withoutBranchScope()
    {
        return (new static)->newQueryWithoutScope(BranchScope::class);
    }
}
