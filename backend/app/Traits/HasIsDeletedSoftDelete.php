<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;

trait HasIsDeletedSoftDelete
{
    public static function bootHasIsDeletedSoftDelete(): void
    {
        static::addGlobalScope('not_deleted', function (Builder $builder) {
            $builder->where($builder->getModel()->getTable() . '.is_deleted', 0);
        });
    }

    public function delete(): bool|null
    {
        if (!$this->exists) {
            return false;
        }

        $this->is_deleted = 1;
        return $this->save();
    }

    public function scopeWithDeleted(Builder $query): Builder
    {
        return $query->withoutGlobalScope('not_deleted');
    }

    public function scopeOnlyDeleted(Builder $query): Builder
    {
        return $query->withoutGlobalScope('not_deleted')->where('is_deleted', 1);
    }
}

