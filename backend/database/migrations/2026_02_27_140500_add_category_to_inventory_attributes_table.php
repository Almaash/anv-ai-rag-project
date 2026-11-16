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
        Schema::table('inventory_attributes', function (Blueprint $table) {
            if (! Schema::hasColumn('inventory_attributes', 'category_id')) {
                $table->foreignId('category_id')
                    ->nullable()
                    ->after('branch')
                    ->constrained('inventory_categories')
                    ->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_attributes', function (Blueprint $table) {
            if (Schema::hasColumn('inventory_attributes', 'category_id')) {
                $table->dropConstrainedForeignId('category_id');
            }
        });
    }
};
