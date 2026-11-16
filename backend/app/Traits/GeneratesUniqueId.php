<?php

namespace App\Traits;

use Illuminate\Support\Str;

trait GeneratesUniqueId
{
    protected static function bootGeneratesUniqueId()
    {
        static::creating(function ($model) {
            $column = $model->getUniqueIdColumn();
            $prefix = $model->getUniqueIdPrefix();
            $startFrom = method_exists($model, 'getUniqueIdStart') ? (int) $model->getUniqueIdStart() : 1001;
            
            if (empty($model->{$column})) {
                $latest = static::withoutGlobalScopes()
                    ->where($column, 'like', $prefix . '%')
                    ->orderBy('id', 'desc')
                    ->first();
                $number = $latest ? ((int) preg_replace('/[^0-9]/', '', (string) $latest->{$column})) + 1 : $startFrom;
                
                // Ensure unique if there's a gap
                while (static::withoutGlobalScopes()->where($column, $prefix . $number)->exists()) {
                    $number++;
                }
                
                $model->{$column} = $prefix . $number;
            }
        });
    }

    abstract public function getUniqueIdColumn(): string;
    abstract public function getUniqueIdPrefix(): string;
}
