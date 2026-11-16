<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_advance_bookings', function (Blueprint $table) {
            $table->id();
            $table->string('booking_no')->unique();
            $table->string('customer_name');
            $table->string('customer_phone', 20);
            $table->string('customer_address', 1000)->nullable();
            $table->date('booking_date');
            $table->date('expected_delivery_date')->nullable();
            $table->decimal('subtotal', 15, 4)->default(0);
            $table->string('tax_type', 20)->default('percentage');
            $table->decimal('tax_value', 10, 4)->default(0);
            $table->decimal('tax_amount', 15, 4)->default(0);
            $table->string('discount_type', 20)->default('percentage');
            $table->decimal('discount_value', 10, 4)->default(0);
            $table->decimal('discount_amount', 15, 4)->default(0);
            $table->decimal('grand_total', 15, 4)->default(0);
            $table->decimal('advance_paid', 15, 4)->default(0);
            $table->decimal('balance_amount', 15, 4)->default(0);
            $table->string('payment_method', 50)->nullable();
            $table->string('upi_reference_no', 100)->nullable();
            $table->string('payment_screenshot')->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 30)->default('pending'); // pending, confirmed, cancelled, converted
            $table->tinyInteger('is_deleted')->default(0);
            $table->string('branch', 50)->nullable();
            $table->string('branch_id', 50)->nullable();
            $table->string('cms_admin_id', 50)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('inventory_advance_booking_items', function (Blueprint $table) {
            $table->id();
            $table->string('unique_id', 50)->nullable();
            $table->string('booking_id'); // references booking_no
            $table->string('product_id', 100)->nullable();
            $table->string('product_unique_id', 100)->nullable();
            $table->string('purchase_item_id', 100)->nullable();
            $table->string('purchase_item_unique_id', 100)->nullable();
            $table->string('product_name');
            $table->string('attribute_summary', 500)->nullable();
            $table->decimal('quantity', 15, 4)->default(1);
            $table->decimal('price', 15, 4)->default(0);
            $table->string('discount_type', 20)->default('percentage');
            $table->decimal('discount_value', 10, 4)->default(0);
            $table->decimal('discount_amount', 15, 4)->default(0);
            $table->string('tax_type', 20)->default('percentage');
            $table->decimal('tax_value', 10, 4)->default(0);
            $table->decimal('tax_amount', 15, 4)->default(0);
            $table->decimal('total', 15, 4)->default(0);
            $table->string('branch_id', 50)->nullable();
            $table->string('cms_admin_id', 50)->nullable();
            $table->tinyInteger('is_deleted')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_advance_booking_items');
        Schema::dropIfExists('inventory_advance_bookings');
    }
};
