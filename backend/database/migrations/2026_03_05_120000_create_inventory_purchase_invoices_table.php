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
        if (Schema::hasTable('inventory_purchase_invoices')) {
            return;
        }
        Schema::create('inventory_purchase_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained('inventory_purchases')->onDelete('cascade');
            $table->string('invoice_no')->unique();
            $table->date('invoice_date')->nullable();
            $table->string('vendor_name')->nullable();
            $table->string('vendor_phone', 25)->nullable();
            $table->text('vendor_address')->nullable();
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('grand_total', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('due_amount', 15, 2)->default(0);
            $table->string('payment_method')->default('Cash');
            $table->enum('payment_status', ['unpaid', 'partial', 'paid'])->default('unpaid');
            $table->text('notes')->nullable();
            $table->unsignedInteger('event_no')->default(1);
            $table->string('event_type', 40)->default('purchase_create');
            $table->string('branch')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_purchase_invoices');
    }
};

