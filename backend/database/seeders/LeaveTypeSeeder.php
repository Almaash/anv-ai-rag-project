<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LeaveTypeSeeder extends Seeder
{
    public function run(): void
    {
        $leaveTypes = [
            [
                'name' => 'Sick Leave',
                'description' => 'Leave for medical reasons or illness',
                'limit_days' => 12,
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Casual Leave',
                'description' => 'Leave for personal reasons',
                'limit_days' => 15,
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Maternity Leave',
                'description' => 'Leave for maternity purposes',
                'limit_days' => 90,
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Paid Leave',
                'description' => 'Additional paid leave when regular leaves are exhausted',
                'limit_days' => 0,
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('hrms_leave_types')->insert($leaveTypes);
    }
}
