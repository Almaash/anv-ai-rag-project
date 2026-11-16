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
        // Disable FK checks to allow changing types of columns involved in constraints
        Schema::disableForeignKeyConstraints();

        // 1. Drop existing FKs
        Schema::table('hrms_employee_personal_details', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
        });
        Schema::table('hrms_employee_addresses', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
        });
        Schema::table('hrms_employee_bank_details', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
        });

        // 2. Clear existing relationship data
        DB::table('hrms_employee_personal_details')->truncate();
        DB::table('hrms_employee_addresses')->truncate();
        DB::table('hrms_employee_bank_details')->truncate();

        // 3. Change column to string
        Schema::table('hrms_employee_personal_details', function (Blueprint $table) {
            $table->string('employee_id')->change();
        });
        Schema::table('hrms_employee_addresses', function (Blueprint $table) {
            $table->string('employee_id')->change();
        });
        Schema::table('hrms_employee_bank_details', function (Blueprint $table) {
            $table->string('employee_id')->change();
        });
        
        // 4. Re-add FKs referencing the new unique string identifier 'employee_id'
        Schema::table('hrms_employee_personal_details', function (Blueprint $table) {
            $table->foreign('employee_id')->references('employee_id')->on('hrms_employees')->onDelete('cascade');
        });
        Schema::table('hrms_employee_addresses', function (Blueprint $table) {
            $table->foreign('employee_id')->references('employee_id')->on('hrms_employees')->onDelete('cascade');
        });
        Schema::table('hrms_employee_bank_details', function (Blueprint $table) {
            $table->foreign('employee_id')->references('employee_id')->on('hrms_employees')->onDelete('cascade');
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No easy rollback for string employee_id
    }
};
