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
        Schema::table('loan_cam', function (Blueprint $table) {
            $table->string('pd_checked')->default('pending')->after('remarks');
            $table->string('cam_checked')->default('pending')->after('pd_checked');
            $table->string('tvr_applicant_contacts')->nullable()->after('cam_checked');
            $table->text('tvr_observation')->nullable()->after('tvr_applicant_contacts');
            $table->text('deviation_if_any')->nullable()->after('tvr_observation');
            $table->string('deviation_approved_by')->nullable()->after('deviation_if_any');
            $table->string('deviation_status')->nullable()->after('deviation_approved_by'); // Approved/Rejected
            $table->text('reason_for_rejected')->nullable()->after('deviation_status');
            $table->string('credit_sanction_status')->nullable()->after('reason_for_rejected'); // Approved/Rejected
            $table->text('sanction_remarks')->nullable()->after('credit_sanction_status');
        });
    }

    public function down(): void
    {
        Schema::table('loan_cam', function (Blueprint $table) {
            $table->dropColumn([
                'pd_checked',
                'cam_checked',
                'tvr_applicant_contacts',
                'tvr_observation',
                'deviation_if_any',
                'deviation_approved_by',
                'deviation_status',
                'reason_for_rejected',
                'credit_sanction_status',
                'sanction_remarks'
            ]);
        });
    }
};
