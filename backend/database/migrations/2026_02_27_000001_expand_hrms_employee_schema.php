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
        // 1. Update Core Employee Table
        Schema::table('hrms_employees', function (Blueprint $table) {
            if (!Schema::hasColumn('hrms_employees', 'employee_code')) {
                $table->string('employee_code', 50)->unique()->after('id')->nullable();
            }
            if (!Schema::hasColumn('hrms_employees', 'dob')) {
                $table->date('dob')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('hrms_employees', 'marital_status')) {
                $table->enum('marital_status', ['single', 'married', 'divorced', 'widowed', 'other'])->nullable()->after('gender');
            }
            if (!Schema::hasColumn('hrms_employees', 'profile_photo')) {
                $table->string('profile_photo')->nullable()->after('blood_group');
            }
            if (!Schema::hasColumn('hrms_employees', 'probation_end_date')) {
                $table->date('probation_end_date')->nullable()->after('joining_date');
            }
            if (!Schema::hasColumn('hrms_employees', 'reporting_manager_id')) {
                $table->unsignedBigInteger('reporting_manager_id')->nullable()->after('designation_id');
                $table->foreign('reporting_manager_id')->references('id')->on('hrms_employees')->onDelete('set null');
            }
            
            // Adjust gender and employment_type to match exact user request if needed
            // Actually, existing enums are fine, but I'll add 'terminated' if not exists
        });

        // 2. Personal Details
        Schema::create('hrms_employee_personal_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hrms_employees')->onDelete('cascade');
            $table->string('father_name')->nullable();
            $table->string('mother_name')->nullable();
            $table->string('spouse_name')->nullable();
            $table->string('nationality')->nullable();
            $table->text('aadhaar_number')->nullable(); // encrypted
            $table->text('pan_number')->nullable(); // encrypted
            $table->string('passport_number')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();
            $table->string('emergency_contact_relation')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('religion')->nullable();
            $table->string('caste')->nullable();
            $table->string('identification_mark')->nullable();
            $table->string('physically_challenged')->nullable();
            $table->timestamps();
        });

        // 3. Address Details
        Schema::create('hrms_employee_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hrms_employees')->onDelete('cascade');
            $table->enum('type', ['permanent', 'current']);
            $table->string('address_line_1');
            $table->string('address_line_2')->nullable();
            $table->string('city');
            $table->string('state');
            $table->string('country');
            $table->string('pincode');
            $table->timestamps();
        });

        // 4. Bank & Salary Details
        Schema::create('hrms_employee_bank_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hrms_employees')->onDelete('cascade');
            $table->string('bank_name');
            $table->string('account_holder_name');
            $table->text('account_number'); // encrypted
            $table->string('ifsc_code');
            $table->string('branch_name');
            $table->boolean('is_primary')->default(true);
            $table->timestamps();
        });

        // Update Salary Structure Table to match new requirements
        if (Schema::hasTable('hrms_salary_structures')) {
            Schema::table('hrms_salary_structures', function (Blueprint $table) {
                // Drop old columns if needed or just add missing ones
                if (!Schema::hasColumn('hrms_salary_structures', 'esi_deduction')) {
                    $table->decimal('esi_deduction', 10, 2)->default(0)->after('provident_fund');
                }
                if (!Schema::hasColumn('hrms_salary_structures', 'effective_from')) {
                    $table->date('effective_from')->nullable()->after('net_salary');
                }
                
                // Rename columns to match user request (optional but good for consistency)
                // pf_deduction is provident_fund
                // tax_deduction is tax_deduction
                // allowances is others
            });
        }

        // 5. Leave Balances
        Schema::create('hrms_employee_leave_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hrms_employees')->onDelete('cascade');
            $table->foreignId('leave_type_id')->constrained('hrms_leave_types')->onDelete('cascade');
            $table->integer('total_allocated')->default(0);
            $table->integer('used')->default(0);
            $table->integer('remaining')->default(0);
            $table->timestamps();
        });

        // 6. Documents
        Schema::create('hrms_employee_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hrms_employees')->onDelete('cascade');
            $table->string('document_type'); // Aadhaar, PAN, Resume, etc.
            $table->string('file_path');
            $table->boolean('verified')->default(false);
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hrms_employee_documents');
        Schema::dropIfExists('hrms_employee_leave_balances');
        Schema::dropIfExists('hrms_employee_bank_details');
        Schema::dropIfExists('hrms_employee_addresses');
        Schema::dropIfExists('hrms_employee_personal_details');
        
        Schema::table('hrms_employees', function (Blueprint $table) {
            $table->dropForeign(['reporting_manager_id']);
            $table->dropColumn(['employee_code', 'dob', 'marital_status', 'profile_photo', 'probation_end_date', 'reporting_manager_id']);
        });
    }
};
