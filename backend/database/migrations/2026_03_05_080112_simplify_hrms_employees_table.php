<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('hrms_employees', function (Blueprint $table) {
            $columnsToDrop = [
                'father_name', 'mother_name', 'spouse_name', 'pan_number',
                'aadhar_number', 'bank_name', 'account_number', 'ifsc_code',
                'address', 'emergency_contact', 'date_of_birth',
                'employee_code', 'admin_id'
            ];

            foreach ($columnsToDrop as $column) {
                if (Schema::hasColumn('hrms_employees', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hrms_employees', function (Blueprint $table) {
            $table->string('father_name')->nullable();
            $table->string('mother_name')->nullable();
            $table->string('spouse_name')->nullable();
            $table->string('pan_number')->nullable();
            $table->string('aadhar_number')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('account_number')->nullable();
            $table->string('ifsc_code')->nullable();
            $table->text('address')->nullable();
            $table->string('emergency_contact')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('employee_code')->nullable();
            $table->unsignedBigInteger('admin_id')->nullable();
        });
    }
};
