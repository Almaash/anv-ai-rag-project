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
        Schema::table('inventory_purchases', function (Blueprint $table) {
            $table->enum('discount_type', ['percentage', 'fixed'])->default('percentage')->after('total_amount');
            $table->decimal('discount_value', 15, 2)->default(0)->after('discount_type');
            $table->decimal('discount_amount', 15, 2)->default(0)->after('discount_value');
            $table->decimal('paid_amount', 15, 2)->default(0)->after('discount_amount');
            $table->decimal('due_amount', 15, 2)->default(0)->after('paid_amount');
            $table->enum('payment_status', ['unpaid', 'partial', 'paid'])->default('unpaid')->after('due_amount');
            $table->string('payment_method')->default('Cash')->after('payment_status');
            $table->text('payment_note')->nullable()->after('payment_method');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_purchases', function (Blueprint $table) {
            $table->dropColumn([
                'discount_type',
                'discount_value',
                'discount_amount',
                'paid_amount',
                'due_amount',
                'payment_status',
                'payment_method',
                'payment_note',
            ]);
        });
    }
};

