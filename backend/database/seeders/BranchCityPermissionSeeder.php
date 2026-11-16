<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class BranchCityPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $role = Role::where('name', 'super_admin')->orWhere('name', 'Super Admin')->first();
        if ($role) {
            $permissions = $role->permissions ?? [];
            if (!in_array('read_admin_branch_cities', $permissions)) {
                $permissions[] = 'read_admin_branch_cities';
                $role->permissions = $permissions;
                $role->save();
                $this->command->info('Permission read_admin_branch_cities added to ' . $role->name);
            } else {
                $this->command->comment('Permission read_admin_branch_cities already exists for ' . $role->name);
            }
        } else {
            $this->command->error('Super Admin role not found');
        }
    }
}
