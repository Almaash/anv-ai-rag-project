<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class RecreateInventoryPaymentsIfMissing extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('inventory_payments')) {
            return;
        }

        Schema::create('inventory_payments', function (Blueprint $table) {
            $table->id();
            $table->string('branch')->nullable()->index();
            $table->string('invoice_id', 100)->nullable()->index();
            $table->decimal('amount', 15, 2);
            $table->date('payment_date');
            $table->string('payment_method')->default('Cash');
            $table->string('transaction_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Keep this non-destructive for repair migration.
    }
}
