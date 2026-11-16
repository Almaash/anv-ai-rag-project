<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DebugController extends Controller
{
    public function checkTables(Request $request)
    {
        try {
            $tables = [
                'branches',
                'loan_applications', 
                'loan_loans',
                'loan_emi_schedules',
                'loan_emi_payments',
                'inventory_invoices',
                'inventory_purchase_orders',
                'hrms_employees',
                'hrms_salaries'
            ];

            $result = [];
            
            foreach ($tables as $table) {
                if (Schema::hasTable($table)) {
                    $columns = Schema::getColumnListing($table);
                    $result[$table] = [
                        'exists' => true,
                        'columns' => $columns,
                        'sample_count' => DB::table($table)->count()
                    ];
                } else {
                    $result[$table] = ['exists' => false];
                }
            }

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function checkBranches(Request $request)
    {
        try {
            $branches = DB::table('branches')->select('id', 'code', 'name')->get();
            return response()->json($branches);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}