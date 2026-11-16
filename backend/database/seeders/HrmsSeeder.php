<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;

class HrmsSeeder extends Seeder
{
    public function run(): void
    {
        [$owner, $branch] = $this->ensureHrmsOwnerAndBranch();

        $this->clearHrmsDataOnly();

            $now = now();
            $tenant = [
                'admin_user_id' => $owner->user_id,
                'branch_id' => $branch->id,
                'is_deleted' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            // HRMS Masters
            $designationIds = [];
            foreach ([
                ['name' => 'HR Manager', 'description' => 'HR operations lead', 'status' => 1],
                ['name' => 'Software Engineer', 'description' => 'Application developer', 'status' => 1],
                ['name' => 'Accountant', 'description' => 'Finance operations', 'status' => 1],
            ] as $row) {
                $id = DB::table('hrms_designations')->insertGetId(array_merge($tenant, $row));
                $designationIds[$row['name']] = $id;
            }

            $departmentIds = [];
            foreach ([
                ['name' => 'Human Resources', 'description' => 'People operations', 'status' => 1],
                ['name' => 'Information Technology', 'description' => 'Technology department', 'status' => 1],
                ['name' => 'Finance & Accounts', 'description' => 'Accounts and payroll', 'status' => 1],
            ] as $row) {
                $id = DB::table('hrms_departments')->insertGetId(array_merge($tenant, $row));
                $departmentIds[$row['name']] = $id;
            }

            $leaveTypeIds = [];
            foreach ([
                ['name' => 'Sick Leave', 'description' => 'Medical leave', 'limit_days' => 12, 'status' => 1],
                ['name' => 'Casual Leave', 'description' => 'Personal short leave', 'limit_days' => 12, 'status' => 1],
                ['name' => 'Earned Leave', 'description' => 'Accrued annual leave', 'limit_days' => 15, 'status' => 1],
            ] as $row) {
                $id = DB::table('hrms_leave_types')->insertGetId(array_merge($tenant, $row));
                $leaveTypeIds[$row['name']] = $id;
            }

            foreach ([
                ['name' => 'Republic Day', 'date' => '2026-01-26', 'description' => 'National Holiday', 'recurring' => 1],
                ['name' => 'Holi', 'date' => '2026-03-14', 'description' => 'Festival Holiday', 'recurring' => 1],
                ['name' => 'Independence Day', 'date' => '2026-08-15', 'description' => 'National Holiday', 'recurring' => 1],
                ['name' => 'Gandhi Jayanti', 'date' => '2026-10-02', 'description' => 'National Holiday', 'recurring' => 1],
                ['name' => 'Diwali', 'date' => '2026-11-01', 'description' => 'Festival Holiday', 'recurring' => 1],
            ] as $row) {
                DB::table('hrms_holidays')->insert(array_merge($tenant, $row));
            }

            // Employees
            $employees = [
                [
                    'employee_id' => 'EMP1001',
                    'first_name' => 'Aarav',
                    'last_name' => 'Mehta',
                    'email' => 'aarav.mehta@hrms.local',
                    'phone' => '9000000001',
                    'password' => 'user@1234',
                    'gender' => 'Male',
                    'designation_id' => $designationIds['HR Manager'],
                    'department_id' => $departmentIds['Human Resources'],
                    'joining_date' => '2025-01-10',
                    'employment_type' => 'Full-time',
                    'basic_salary' => 78000,
                    'sick_leave_days' => 10,
                    'casual_leave_days' => 11,
                    'maternity_leave_days' => 0,
                ],
                [
                    'employee_id' => 'EMP1002',
                    'first_name' => 'Nisha',
                    'last_name' => 'Patel',
                    'email' => 'nisha.patel@hrms.local',
                    'phone' => '9000000002',
                    'password' => 'user@1234',
                    'gender' => 'Female',
                    'designation_id' => $designationIds['Software Engineer'],
                    'department_id' => $departmentIds['Information Technology'],
                    'joining_date' => '2025-03-03',
                    'employment_type' => 'Full-time',
                    'basic_salary' => 62000,
                    'sick_leave_days' => 12,
                    'casual_leave_days' => 10,
                    'maternity_leave_days' => 90,
                ],
                [
                    'employee_id' => 'EMP1003',
                    'first_name' => 'Rohan',
                    'last_name' => 'Shah',
                    'email' => 'rohan.shah@hrms.local',
                    'phone' => '9000000003',
                    'password' => 'user@1234',
                    'gender' => 'Male',
                    'designation_id' => $designationIds['Accountant'],
                    'department_id' => $departmentIds['Finance & Accounts'],
                    'joining_date' => '2025-06-01',
                    'employment_type' => 'Contractual',
                    'basic_salary' => 52000,
                    'sick_leave_days' => 11,
                    'casual_leave_days' => 12,
                    'maternity_leave_days' => 0,
                ],
                [
                    'employee_id' => 'EMP1004',
                    'first_name' => 'Priya',
                    'last_name' => 'Sharma',
                    'email' => 'priya.sharma@hrms.local',
                    'phone' => '9000000004',
                    'password' => 'user@1234',
                    'gender' => 'Female',
                    'designation_id' => $designationIds['Software Engineer'],
                    'department_id' => $departmentIds['Information Technology'],
                    'joining_date' => '2025-01-15',
                    'employment_type' => 'Full-time',
                    'basic_salary' => 65000,
                    'sick_leave_days' => 12,
                    'casual_leave_days' => 12,
                    'maternity_leave_days' => 90,
                ],
                [
                    'employee_id' => 'EMP1005',
                    'first_name' => 'Vikram',
                    'last_name' => 'Singh',
                    'email' => 'vikram.singh@hrms.local',
                    'phone' => '9000000005',
                    'password' => 'user@1234',
                    'gender' => 'Male',
                    'designation_id' => $designationIds['Software Engineer'],
                    'department_id' => $departmentIds['Information Technology'],
                    'joining_date' => '2025-02-20',
                    'employment_type' => 'Full-time',
                    'basic_salary' => 60000,
                    'sick_leave_days' => 12,
                    'casual_leave_days' => 12,
                    'maternity_leave_days' => 0,
                ],
                [
                    'employee_id' => 'EMP1006',
                    'first_name' => 'Anjali',
                    'last_name' => 'Verma',
                    'email' => 'anjali.verma@hrms.local',
                    'phone' => '9000000006',
                    'password' => 'user@1234',
                    'gender' => 'Female',
                    'designation_id' => $designationIds['HR Manager'],
                    'department_id' => $departmentIds['Human Resources'],
                    'joining_date' => '2025-04-10',
                    'employment_type' => 'Full-time',
                    'basic_salary' => 72000,
                    'sick_leave_days' => 12,
                    'casual_leave_days' => 12,
                    'maternity_leave_days' => 90,
                ],
                [
                    'employee_id' => 'EMP1007',
                    'first_name' => 'Rahul',
                    'last_name' => 'Gupta',
                    'email' => 'rahul.gupta@hrms.local',
                    'phone' => '9000000007',
                    'password' => 'user@1234',
                    'gender' => 'Male',
                    'designation_id' => $designationIds['Accountant'],
                    'department_id' => $departmentIds['Finance & Accounts'],
                    'joining_date' => '2025-05-15',
                    'employment_type' => 'Full-time',
                    'basic_salary' => 55000,
                    'sick_leave_days' => 12,
                    'casual_leave_days' => 12,
                    'maternity_leave_days' => 0,
                ],
                [
                    'employee_id' => 'EMP1008',
                    'first_name' => 'Suresh',
                    'last_name' => 'Raina',
                    'email' => 'suresh.raina@hrms.local',
                    'phone' => '9000000008',
                    'password' => 'user@1234',
                    'gender' => 'Male',
                    'designation_id' => $designationIds['Software Engineer'],
                    'department_id' => $departmentIds['Information Technology'],
                    'joining_date' => '2025-07-01',
                    'employment_type' => 'Full-time',
                    'basic_salary' => 68000,
                    'sick_leave_days' => 12,
                    'casual_leave_days' => 12,
                    'maternity_leave_days' => 0,
                ],
                [
                    'employee_id' => 'EMP1009',
                    'first_name' => 'Kavita',
                    'last_name' => 'Reddy',
                    'email' => 'kavita.reddy@hrms.local',
                    'phone' => '9000000009',
                    'password' => 'user@1234',
                    'gender' => 'Female',
                    'designation_id' => $designationIds['HR Manager'],
                    'department_id' => $departmentIds['Human Resources'],
                    'joining_date' => '2025-08-20',
                    'employment_type' => 'Full-time',
                    'basic_salary' => 70000,
                    'sick_leave_days' => 12,
                    'casual_leave_days' => 12,
                    'maternity_leave_days' => 90,
                ],
                [
                    'employee_id' => 'EMP1010',
                    'first_name' => 'Amit',
                    'last_name' => 'Kumar',
                    'email' => 'amit.kumar@hrms.local',
                    'phone' => '9000000010',
                    'password' => 'user@1234',
                    'gender' => 'Male',
                    'designation_id' => $designationIds['Accountant'],
                    'department_id' => $departmentIds['Finance & Accounts'],
                    'joining_date' => '2025-10-01',
                    'employment_type' => 'Full-time',
                    'basic_salary' => 58000,
                    'sick_leave_days' => 12,
                    'casual_leave_days' => 12,
                    'maternity_leave_days' => 0,
                ],
            ];

            $employeeIds = [];
            foreach ($employees as $idx => $row) {
                $used = $idx + 1;
                $employee = array_merge($tenant, [
                    'user_id' => null,
                    'employee_id' => $row['employee_id'],
                    'first_name' => $row['first_name'],
                    'last_name' => $row['last_name'],
                    'email' => $row['email'],
                    'password' => Hash::make($row['password']),
                    'phone' => $row['phone'],
                    'dob' => '1995-01-01',
                    'designation_id' => $row['designation_id'],
                    'reporting_manager_id' => null,
                    'department_id' => $row['department_id'],
                    'branch_id' => $branch->id,
                    'joining_date' => $row['joining_date'],
                    'probation_end_date' => date('Y-m-d', strtotime($row['joining_date'] . ' +6 months')),
                    'gender' => $row['gender'],
                    'marital_status' => 'single',
                    'employment_type' => $row['employment_type'],
                    'basic_salary' => $row['basic_salary'],
                    'status' => 'active',
                    'role' => 'employee',
                    'requires_password_change' => true,
                    'annual_leave_quota' => 15,
                    'annual_leave_used' => $used,
                    'annual_leave_balance' => 15 - $used,
                    'leave_cycle_year' => (int) date('Y'),
                    'sick_leave_days' => $row['sick_leave_days'],
                    'casual_leave_days' => $row['casual_leave_days'],
                    'maternity_leave_days' => $row['maternity_leave_days'],
                    'is_deleted' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $employeeId = DB::table('hrms_employees')->insertGetId($employee);
                $employeeIds[$row['employee_id']] = $employeeId;
            }

            // Reporting manager
            DB::table('hrms_employees')
                ->where('id', $employeeIds['EMP1002'])
                ->update(['reporting_manager_id' => $employeeIds['EMP1001']]);
            DB::table('hrms_employees')
                ->where('id', $employeeIds['EMP1003'])
                ->update(['reporting_manager_id' => $employeeIds['EMP1001']]);

            // Employee child tables
            foreach ($employeeIds as $code => $empId) {
                DB::table('hrms_employee_personal_details')->insert(array_merge($tenant, [
                    'employee_id' => $empId,
                    'father_name' => 'Father ' . $code,
                    'mother_name' => 'Mother ' . $code,
                    'nationality' => 'Indian',
                    'aadhaar_number' => Crypt::encryptString('99990000' . substr($code, -4)),
                    'pan_number' => Crypt::encryptString('PAN' . substr($code, -4) . 'X'),
                    'emergency_contact_name' => 'Emergency ' . $code,
                    'emergency_contact_phone' => '91111111' . substr($code, -1),
                    'emergency_contact_relation' => 'Father',
                ]));

                DB::table('hrms_employee_addresses')->insert(array_merge($tenant, [
                    'employee_id' => $empId,
                    'type' => 'current',
                    'address_line_1' => 'Street ' . $code,
                    'city' => 'Ranchi',
                    'state' => 'Jharkhand',
                    'country' => 'India',
                    'pincode' => '834001',
                ]));

                DB::table('hrms_employee_bank_details')->insert(array_merge($tenant, [
                    'employee_id' => $empId,
                    'bank_name' => 'SBI',
                    'account_holder_name' => 'Employee ' . $code,
                    'account_number' => Crypt::encryptString('00011122' . substr($code, -4)),
                    'ifsc_code' => 'SBIN0000123',
                    'branch_name' => 'Main Branch',
                    'is_primary' => 1,
                ]));

                DB::table('hrms_employee_documents')->insert(array_merge($tenant, [
                    'employee_id' => $empId,
                    'document_type' => 'profile_photo',
                    'file_path' => 'seed/hrms/' . strtolower($code) . '/profile.jpg',
                    'uploaded_at' => $now,
                    'verified' => 1,
                ]));
            }

            foreach ($employeeIds as $code => $empId) {
                // Get the employee's joining date to start attendance from
                $employeeData = collect($employees)->firstWhere('employee_id', $code);
                $joiningDate = \Carbon\Carbon::parse($employeeData['joining_date'] ?? '2026-01-01');
                
                // Attendance logic: Start from joining date, end at current date (March 5, 2026)
                $startDate = $joiningDate->copy();
                $endDate = \Carbon\Carbon::create(2026, 3, 5); // Current date in context

                while ($startDate->lte($endDate)) {
                    // Skip future dates (redundant but safe)
                    if ($startDate->isFuture()) break;

                    $isSunday = $startDate->isSunday();
                    
                    // Randomly decide if present (90% chance) or absent/leave
                    $status = 'present';
                    $clockIn = '09:00:00';
                    $clockOut = '18:00:00';
                    $totalHours = 9.00;

                    if ($isSunday) {
                        $status = 'present'; // Sundays are paid/present in our logic
                        $clockIn = null;
                        $clockOut = null;
                        $totalHours = 0;
                    } else {
                        $rand = rand(1, 100);
                        if ($rand > 95) {
                            $status = 'absent';
                            $clockIn = null;
                            $clockOut = null;
                            $totalHours = 0;
                        } elseif ($rand > 90) {
                            $status = 'on-leave';
                            $clockIn = null;
                            $clockOut = null;
                            $totalHours = 0;
                        } else {
                            // Variance in time
                            $checkInMin = rand(0, 15);
                            $clockIn = "09:" . str_pad($checkInMin, 2, '0', STR_PAD_LEFT) . ":00";
                            $clockOut = "18:00:00";
                        }
                    }

                    DB::table('hrms_attendance')->insert(array_merge($tenant, [
                        'employee_id' => $empId,
                        'date' => $startDate->toDateString(),
                        'clock_in' => $clockIn,
                        'clock_out' => $clockOut,
                        'status' => $status,
                        'note' => $isSunday ? 'Weekly Off (Paid)' : 'Regular Shift',
                        'remarks' => null,
                        'total_hours' => $totalHours,
                    ]));

                    $startDate->addDay();
                }

                DB::table('hrms_salary_structures')->insert(array_merge($tenant, [
                    'employee_id' => $empId,
                    'basic_salary' => $employeeData['basic_salary'] ?? 50000,
                    'house_rent_allowance' => 10000,
                    'medical_allowance' => 1500,
                    'transport_allowance' => 1500,
                    'other_allowance' => 2000,
                    'provident_fund' => 1800,
                    'tax_deduction' => 2000,
                    'other_deduction' => 200,
                    'net_salary' => ($employeeData['basic_salary'] ?? 50000) + 11000,
                    'status' => 1,
                ]));

                // Salary logic: Insert salary records for all months before current month (March)
                // Since current date is March 5, we seed January/February
                foreach (['January 2026', 'February 2026'] as $monthName) {
                    $monthStartDate = \Carbon\Carbon::parse($monthName);
                    
                    // Only seed if employee had already joined or joined during this month
                    if ($joiningDate->lte($monthStartDate->endOfMonth())) {
                        $payoutId = 'PAY' . date('Ymd', strtotime($monthStartDate->endOfMonth())) . $empId . rand(10, 99);
                        
                        // Randomly decide status: 70% paid, 30% pending
                        $status = (rand(1, 10) <= 7) ? 'paid' : 'pending';
                        $paymentDate = ($status === 'paid') ? $monthStartDate->endOfMonth()->toDateString() : null;
                        $paymentMethod = ($status === 'paid') ? 'Bank Transfer' : null;

                        DB::table('hrms_salaries')->insert(array_merge($tenant, [
                            'employee_id' => $empId,
                            'payout_id' => ($status === 'paid') ? $payoutId : null,
                            'month' => $monthName,
                            'payment_date' => $paymentDate,
                            'total_working_days' => $monthStartDate->daysInMonth,
                            'present_days' => $monthStartDate->daysInMonth - 1,
                            'absent_days' => 1.0,
                            'leave_days' => 0.0,
                            'basic_pay' => $employeeData['basic_salary'] ?? 50000,
                            'allowances' => 15000,
                            'deductions' => 4000,
                            'net_pay' => ($employeeData['basic_salary'] ?? 50000) + 11000,
                            'status' => $status,
                            'payment_method' => $paymentMethod,
                            'note' => 'Seeded payroll for ' . $monthName,
                        ]));
                    }
                }

                foreach ([
                    ['name' => 'Sick Leave', 'allocated' => 12, 'used' => 1],
                    ['name' => 'Casual Leave', 'allocated' => 12, 'used' => 1],
                    ['name' => 'Earned Leave', 'allocated' => 15, 'used' => 0],
                ] as $lb) {
                    $used = $lb['used'];
                    $allocated = $lb['allocated'];
                    DB::table('hrms_employee_leave_balances')->insert(array_merge($tenant, [
                        'employee_id' => $empId,
                        'leave_type_id' => $leaveTypeIds[$lb['name']],
                        'total_allocated' => $allocated,
                        'used' => $used,
                        'remaining' => $allocated - $used,
                    ]));
                }
            }

            DB::table('hrms_leave_requests')->insert(array_merge($tenant, [
                'employee_id' => $employeeIds['EMP1002'],
                'leave_type_id' => $leaveTypeIds['Casual Leave'],
                'leave_category' => 'casual',
                'start_date' => '2026-03-12',
                'end_date' => '2026-03-12',
                'total_days' => 1,
                'is_paid_leave' => 0,
                'reason' => 'Personal work',
                'status' => 'pending',
                'approved_by' => null,
                'remarks' => null,
            ]));

            DB::table('hrms_leave_requests')->insert(array_merge($tenant, [
                'employee_id' => $employeeIds['EMP1001'],
                'leave_type_id' => $leaveTypeIds['Sick Leave'],
                'leave_category' => 'sick',
                'start_date' => '2026-03-02',
                'end_date' => '2026-03-03',
                'total_days' => 2,
                'is_paid_leave' => 0,
                'reason' => 'Medical leave',
                'status' => 'approved',
                'approved_by' => $owner->id,
                'remarks' => 'Approved by HR admin',
            ]));

        $this->command?->info('HRMS fresh seed completed successfully.');
        $this->command?->info('Owner user: ' . $owner->email . ' | user_id: ' . $owner->user_id . ' | branch: ' . $branch->code);
    }

    private function ensureHrmsOwnerAndBranch(): array
    {
        $branch = Branch::query()->where('code', 'BR0001')->first();
        if (!$branch) {
            $branch = Branch::query()->create([
                'name' => 'HRMS Main Branch',
                'code' => 'BR0001',
                'address' => 'Main Office',
                'phone' => '9000000000',
                'email' => 'branch.hrms@anavaran.local',
                'is_active' => true,
            ]);
        }

        $owner = User::query()
            ->where(function ($q) {
                $q->where('role', 'hrms_admin')->orWhere('department', 'hrms');
            })
            ->where('branch', $branch->code)
            ->orderBy('id')
            ->first();

        if (!$owner) {
            $owner = User::query()->create([
                'name' => 'HRMS Admin',
                'email' => 'hrms.admin@anavaran.local',
                'password' => Hash::make('hrms@1234'),
                'phone' => '9000000010',
                'role' => 'hrms_admin',
                'department' => 'hrms',
                'branch' => $branch->code,
            ]);
        }

        return [$owner, $branch];
    }

    private function clearHrmsDataOnly(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        foreach ([
            'hrms_attendance',
            'hrms_leave_requests',
            'hrms_salaries',
            'hrms_salary_structures',
            'hrms_employee_documents',
            'hrms_employee_leave_balances',
            'hrms_employee_bank_details',
            'hrms_employee_addresses',
            'hrms_employee_personal_details',
            'hrms_employees',
            'hrms_holidays',
            'hrms_leave_types',
            'hrms_designations',
            'hrms_departments',
        ] as $table) {
            DB::table($table)->truncate();
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }
}
