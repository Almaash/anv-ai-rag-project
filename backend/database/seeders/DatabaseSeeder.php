<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create admin user
        User::create([
            'user_id' => 'anv_1',
            'name' => 'Super Admin',
            'email' => 'superadmin@gmail.com',
            'password' => 'admin123',
            'phone' => '1234567890',
            'role' => 'admin',
        ]);

        $this->call([
            InvestorTypeSeeder::class,
        ]);
    }
}
