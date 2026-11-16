<?php

namespace App\Http\Helpers;

use Illuminate\Support\Facades\Auth;

/**
 * Centralised auth context resolver.
 *
 * User table columns:
 *   user_id  → business unique ID (e.g. anv_3)  — used as cms_admin_id in child records
 *   branch   → branch code (e.g. BR0001)         — used as branch_id in child records
 *   role     → admin | cms_admin | branch | ...
 */
class AuthContext
{
    /** Returns the cms_admin_id to store in child records.
     *  Logic: use created_by (parent who created this user) if available,
     *  else if role is cms_admin use own user_id, else fallback user_id.
     */
    public static function cmsAdminId(): ?string
    {
        $user = Auth::user() ?? Auth::guard('sanctum')->user();
        if (!$user) return null;

        // created_by = the cms_admin who created this user (e.g. anv_2 created anv_7)
        if (!empty($user->created_by)) {
            return $user->created_by;
        }

        // If user IS a cms_admin themselves, use their own user_id
        return $user->user_id ?? (string) $user->id ?? null;
    }

    public static function branchId(): ?string
    {
        $user = Auth::user() ?? Auth::guard('sanctum')->user();
        if (!$user) return null;
        $branch = $user->branch
            ?? (isset($user->branch_id) ? $user->branch_id : null)
            ?? null;
        return ($branch && $branch !== 'default') ? $branch : null;
    }

    public static function role(): ?string
    {
        return Auth::user()?->role;
    }

    public static function isSuperAdmin(): bool
    {
        return in_array(self::role(), ['admin', 'super_admin'], true);
    }

    /**
     * Apply branch + cms_admin scoping to any Eloquent query builder.
     * Super-admin bypasses all filters.
     */
    public static function scopeQuery(
        $query,
        string $branchCol   = 'branch_id',
        string $cmsAdminCol = 'cms_admin_id'
    ) {
        if (self::isSuperAdmin()) {
            return $query;
        }

        $branch   = self::branchId();
        $cmsAdmin = self::cmsAdminId();

        if ($branch)   $query->where($branchCol,   $branch);
        if ($cmsAdmin) $query->where($cmsAdminCol, $cmsAdmin);

        return $query;
    }
}
