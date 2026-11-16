<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Add missing columns from purchase_receipts to purchase_orders
        Schema::table('inventory_purchase_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_purchase_orders', 'invoice_no')) {
                $table->string('invoice_no', 100)->nullable()->after('unique_id');
            }
            if (!Schema::hasColumn('inventory_purchase_orders', 'vendor_name')) {
                $table->string('vendor_name', 255)->nullable()->after('vendor_id');
            }
            if (!Schema::hasColumn('inventory_purchase_orders', 'vendor_phone')) {
                $table->string('vendor_phone', 20)->nullable()->after('vendor_name');
            }
            if (!Schema::hasColumn('inventory_purchase_orders', 'vendor_address')) {
                $table->text('vendor_address')->nullable()->after('vendor_phone');
            }
        });

        // Step 2: Migrate latest receipt data to purchase_orders (invoice_no from latest receipt)
        DB::statement("
            UPDATE inventory_purchase_orders AS po
            INNER JOIN (
                SELECT 
                    purchase_id,
                    invoice_no,
                    vendor_name,
                    vendor_phone,
                    vendor_address,
                    ROW_NUMBER() OVER (PARTITION BY purchase_id ORDER BY id DESC) as rn
                FROM inventory_purchase_receipts
            ) AS latest_receipt
            ON po.unique_id = latest_receipt.purchase_id AND latest_receipt.rn = 1
            SET 
                po.invoice_no = latest_receipt.invoice_no,
                po.vendor_name = latest_receipt.vendor_name,
                po.vendor_phone = latest_receipt.vendor_phone,
                po.vendor_address = latest_receipt.vendor_address
        ");

        // Step 3: Drop duplicate tables (receipts and order_items are redundant)
        Schema::dropIfExists('inventory_purchase_order_items');
        Schema::dropIfExists('inventory_purchase_receipts');
    }

    public function down(): void
    {
        // Recreate dropped tables (structure only, data cannot be fully restored)
        Schema::create('inventory_purchase_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('purchase_id', 50);
            $table->string('invoice_no', 100);
            $table->date('invoice_date');
            $table->string('vendor_name', 255)->nullable();
            $table->string('vendor_phone', 20)->nullable();
            $table->text('vendor_address')->nullable();
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('grand_total', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('due_amount', 15, 2)->default(0);
            $table->string('payment_method', 50)->nullable();
            $table->string('upi_reference_no', 100)->nullable();
            $table->string('payment_screenshot', 255)->nullable();
            $table->string('payment_status', 50)->default('unpaid');
            $table->text('notes')->nullable();
            $table->integer('event_no')->default(1);
            $table->string('event_type', 50)->nullable();
            $table->string('branch', 50)->nullable();
            $table->string('cms_admin', 50)->nullable();
            $table->timestamps();
            $table->string('branch_id', 50)->nullable();
            $table->string('cms_admin_id', 50)->nullable();
        });

        Schema::create('inventory_purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->string('purchase_order_id', 50)->nullable();
            $table->string('purchase_invoice_id', 100)->nullable();
            $table->string('product_master_id', 50)->nullable();
            $table->string('product_name', 255)->nullable();
            $table->decimal('quantity', 15, 2)->default(0);
            $table->decimal('rate', 15, 2)->default(0);
            $table->decimal('amount', 15, 2)->default(0);
            $table->string('branch', 50)->nullable();
            $table->string('cms_admin', 50)->nullable();
            $table->timestamps();
            $table->string('branch_id', 50)->nullable();
            $table->string('cms_admin_id', 50)->nullable();
        });

        // Remove columns from purchase_orders
        Schema::table('inventory_purchase_orders', function (Blueprint $table) {
            $table->dropColumn(['invoice_no', 'vendor_name', 'vendor_phone', 'vendor_address']);
        });
    }
};
