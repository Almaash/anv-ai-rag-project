<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\hrms\Employee;
use App\Models\hrms\Attendance;
use Carbon\Carbon;

class AttendanceSeeder extends Seeder
{  
    public function run(): void
    {
        $employees = Employee::all();
        $startDate = Carbon::now()->subMonths(3);
        $endDate = Carbon::now();

        foreach ($employees as $employee) {
            $currentDate = $startDate->copy();
            
            while ($currentDate->lte($endDate)) {
                // Skip Sundays only (6-day work week)
                if ($currentDate->dayOfWeek === Carbon::SUNDAY) {
                    $currentDate->addDay();
                    continue;
                }

                $rand = rand(1, 100);
                
                if ($rand <= 70) {
                    $status = 'present';
                } elseif ($rand <= 80) {
                    $status = 'late';
                } elseif ($rand <= 88) {
                    $status = 'half-day';
                } elseif ($rand <= 93) {
                    $status = 'absent';
                } elseif ($rand <= 98) {
                    $status = 'on-leave';
                } else {
                    $status = 'overtime';
                }

                Attendance::create([
                    'employee_id' => $employee->id,
                    'date' => $currentDate->format('Y-m-d'),
                    'status' => $status,
                ]);

                $currentDate->addDay();
            }
        }
    }
}
