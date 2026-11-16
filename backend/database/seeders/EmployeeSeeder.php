<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\hrms\Employee;
use App\Models\hrms\EmployeePersonalDetail;
use App\Models\hrms\EmployeeAddress;
use App\Models\hrms\EmployeeBankDetail;
use App\Models\hrms\Designation;
use App\Models\hrms\Department;
use Illuminate\Support\Facades\Hash;

class EmployeeSeeder extends Seeder
{
    public function run(): void
    {
        $designation = Designation::first() ?? Designation::create(['name' => 'Software Engineer', 'description' => 'Developer']);
        $department = Department::first() ?? Department::create(['name' => 'IT', 'description' => 'Information Technology']);

        $employees = [
            [
                'first_name' => 'Rahul',
                'last_name' => 'Sharma',
                'email' => 'rahul.sharma@company.com',
                'phone' => '9876543210',
                'gender' => 'male',
                'dob' => '1995-03-15',
                'blood_group' => 'O+',
                'father_name' => 'Rajesh Sharma',
                'city' => 'Ranchi',
                'state' => 'Jharkhand',
            ],
            [
                'first_name' => 'Priya',
                'last_name' => 'Kumari',
                'email' => 'priya.kumari@company.com',
                'phone' => '9876543211',
                'gender' => 'female',
                'dob' => '1996-07-22',
                'blood_group' => 'A+',
                'father_name' => 'Ramesh Kumar',
                'city' => 'Jamshedpur',
                'state' => 'Jharkhand',
            ],
            [
                'first_name' => 'Amit',
                'last_name' => 'Kumar',
                'email' => 'amit.kumar@company.com',
                'phone' => '9876543212',
                'gender' => 'male',
                'dob' => '1994-11-08',
                'blood_group' => 'B+',
                'father_name' => 'Suresh Kumar',
                'city' => 'Dhanbad',
                'state' => 'Jharkhand',
            ],
            [
                'first_name' => 'Sneha',
                'last_name' => 'Singh',
                'email' => 'sneha.singh@company.com',
                'phone' => '9876543213',
                'gender' => 'female',
                'dob' => '1997-05-18',
                'blood_group' => 'AB+',
                'father_name' => 'Venkat Singh',
                'city' => 'Bokaro',
                'state' => 'Jharkhand',
            ],
            [
                'first_name' => 'Vikram',
                'last_name' => 'Mahto',
                'email' => 'vikram.mahto@company.com',
                'phone' => '9876543214',
                'gender' => 'male',
                'dob' => '1993-09-25',
                'blood_group' => 'O-',
                'father_name' => 'Rajveer Mahto',
                'city' => 'Deoghar',
                'state' => 'Jharkhand',
            ],
            [
                'first_name' => 'Anjali',
                'last_name' => 'Devi',
                'email' => 'anjali.devi@company.com',
                'phone' => '9876543215',
                'gender' => 'female',
                'dob' => '1998-01-30',
                'blood_group' => 'A-',
                'father_name' => 'Prakash Devi',
                'city' => 'Hazaribagh',
                'state' => 'Jharkhand',
            ],
            [
                'first_name' => 'Arjun',
                'last_name' => 'Oraon',
                'email' => 'arjun.oraon@company.com',
                'phone' => '9876543216',
                'gender' => 'male',
                'dob' => '1995-12-12',
                'blood_group' => 'B-',
                'father_name' => 'Krishnan Oraon',
                'city' => 'Giridih',
                'state' => 'Jharkhand',
            ],
            [
                'first_name' => 'Divya',
                'last_name' => 'Soren',
                'email' => 'divya.soren@company.com',
                'phone' => '9876543217',
                'gender' => 'female',
                'dob' => '1996-04-20',
                'blood_group' => 'O+',
                'father_name' => 'Ravi Soren',
                'city' => 'Ramgarh',
                'state' => 'Jharkhand',
            ],
        ];

        foreach ($employees as $empData) {
            $user = User::create([
                'name' => $empData['first_name'] . ' ' . $empData['last_name'],
                'email' => $empData['email'],
                'password' => Hash::make('user@1234'),
                'phone' => $empData['phone'],
                'role' => 'employee',
                'department' => 'HRMS',
            ]);

            $employee = Employee::create([
                'user_id' => $user->id,
                'first_name' => $empData['first_name'],
                'last_name' => $empData['last_name'],
                'email' => $empData['email'],
                'phone' => $empData['phone'],
                'password' => Hash::make('user@1234'),
                'gender' => $empData['gender'],
                'dob' => $empData['dob'],
                'designation_id' => $designation->id,
                'department_id' => $department->id,
                'branch_id' => null,
                'joining_date' => now()->subMonths(rand(6, 24))->format('Y-m-d'),
                'employment_type' => 'full-time',
                'status' => 'active',
                'blood_group' => $empData['blood_group'],
                'sick_leave_days' => 12,
                'casual_leave_days' => 15,
                'maternity_leave_days' => $empData['gender'] === 'female' ? 90 : 0,
            ]);

            EmployeePersonalDetail::create([
                'employee_id' => $employee->id,
                'father_name' => $empData['father_name'],
                'nationality' => 'Indian',
            ]);

            EmployeeAddress::create([
                'employee_id' => $employee->id,
                'type' => 'current',
                'city' => $empData['city'],
                'state' => $empData['state'],
                'country' => 'India',
                'pincode' => rand(100000, 999999),
            ]);

            EmployeeBankDetail::create([
                'employee_id' => $employee->id,
                'bank_name' => ['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank'][rand(0, 3)],
                'account_holder_name' => $empData['first_name'] . ' ' . $empData['last_name'],
                'account_number' => rand(10000000000, 99999999999),
                'ifsc_code' => 'HDFC' . rand(1000, 9999),
                'is_primary' => true,
            ]);
        }
    }
}
