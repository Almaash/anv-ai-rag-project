<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = [
        'users',
        'subscriptions',
        'roles',
        'departments',
        'branches',
        'inventory_units',
        'inventory_vendors',
        'inventory_categories',
        'inventory_taxes',
        'inventory_attributes',
        'inventory_brands',
        'inventory_products',
        'loan_interest_masters',
        'loan_fee_masters',
        'loan_customers',
        'loan_applications',
        'loan_emi_schedules',
        'loan_loans',
        'loan_disbursements',
        'loan_emi_payments',
    ];

    private array $skip = [
        'migrations',
        'personal_access_tokens',
        'password_reset_tokens',
        'failed_jobs',
        'cache',
        'cache_locks',
        'jobs',
        'job_batches',
        'sessions',
    ];

    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            if (in_array($tableName, $this->skip, true) || !Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (!Schema::hasColumn($tableName, 'admin_user_id')) {
                    $table->string('admin_user_id')->nullable()->after('id');
                    $table->index('admin_user_id');
                }

                if (!Schema::hasColumn($tableName, 'branch_id')) {
                    $table->unsignedBigInteger('branch_id')->nullable()->after('admin_user_id');
                    $table->index('branch_id');
                }

                if (!Schema::hasColumn($tableName, 'is_deleted')) {
                    $table->unsignedTinyInteger('is_deleted')->default(0)->after('id');
                    $table->index('is_deleted');
                }
            });
        }

        // Users own their own records in business key format.
        if (Schema::hasTable('users')) {
            DB::statement("
                UPDATE users u
                LEFT JOIN branches b ON b.code = u.branch
                SET u.admin_user_id = u.user_id,
                    u.branch_id = COALESCE(b.id, u.branch_id)
                WHERE u.admin_user_id IS NULL OR u.branch_id IS NULL
            ");
        }

        // Generic backfill for tables that carry user_id in business-key format.
        foreach ($this->tables as $tableName) {
            if (!Schema::hasTable($tableName) || !Schema::hasColumn($tableName, 'user_id')) {
                continue;
            }
            DB::statement("
                UPDATE {$tableName} t
                LEFT JOIN users u ON u.user_id = t.user_id
                LEFT JOIN branches b ON b.code = u.branch
                SET t.admin_user_id = COALESCE(t.admin_user_id, t.user_id),
                    t.branch_id = COALESCE(t.branch_id, b.id)
                WHERE t.admin_user_id IS NULL OR t.branch_id IS NULL
            ");
        }

        // Loan applications reference customer_unique_id business key.
        if (Schema::hasTable('loan_applications') && Schema::hasColumn('loan_applications', 'customer_unique_id')) {
            DB::statement("
                UPDATE loan_applications la
                LEFT JOIN users u ON u.user_id = la.customer_unique_id
                LEFT JOIN branches b ON b.code = u.branch
                SET la.admin_user_id = COALESCE(la.admin_user_id, la.customer_unique_id),
                    la.branch_id = COALESCE(la.branch_id, b.id)
                WHERE la.admin_user_id IS NULL OR la.branch_id IS NULL
            ");
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $tableName) {
            if (in_array($tableName, $this->skip, true) || !Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (Schema::hasColumn($tableName, 'branch_id')) {
                    $table->dropIndex(['branch_id']);
                    $table->dropColumn('branch_id');
                }
                if (Schema::hasColumn($tableName, 'admin_user_id')) {
                    $table->dropIndex(['admin_user_id']);
                    $table->dropColumn('admin_user_id');
                }
                if (Schema::hasColumn($tableName, 'is_deleted')) {
                    $table->dropIndex(['is_deleted']);
                    $table->dropColumn('is_deleted');
                }
            });
        }
    }
};

