<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;

class BranchScope implements Scope
{
    private static array $columnCache = [];

    public function apply(Builder $builder, Model $model): void
    {
        if (!Auth::check()) return;

        $user   = Auth::user();
        $branch = $user->branch ?? $user->branch_id ?? null;
        if (empty($branch)) return;

        $table = $model->getTable();

        // Cache Schema::hasColumn results to avoid repeated DB calls per request
        $cacheKey = $table . '.branch_id';
        if (!isset(self::$columnCache[$cacheKey])) {
            self::$columnCache[$cacheKey] = Schema::hasColumn($table, 'branch_id');
        }

        if (self::$columnCache[$cacheKey]) {
            $builder->where("{$table}.branch_id", $branch);
        } elseif (Schema::hasColumn($table, 'branch')) {
            $builder->where("{$table}.branch", $branch);
        }
    }
}
