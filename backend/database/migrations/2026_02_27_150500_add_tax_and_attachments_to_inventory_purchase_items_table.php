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
        Schema::table('inventory_purchase_items', function (Blueprint $table) {
            $table->decimal('tax_percent', 5, 2)->nullable()->after('tax_id');
            $table->decimal('tax_amount', 15, 2)->nullable()->after('tax_percent');
            $table->json('attachments')->nullable()->after('attribute_summary');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_purchase_items', function (Blueprint $table) {
            $table->dropColumn(['tax_percent', 'tax_amount', 'attachments']);
        });
    }
};
