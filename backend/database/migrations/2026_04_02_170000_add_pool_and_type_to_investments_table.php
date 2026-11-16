<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investor_investments', function (Blueprint $table) {
            $table->unsignedBigInteger('pool_id')->after('investor_id')->nullable();
            $table->unsignedBigInteger('investor_type_id')->after('pool_id')->nullable();
            
            // Optional: If you want foreign key constraints
            // $table->foreign('pool_id')->references('id')->on('money_pools')->onDelete('set null');
            // $table->foreign('investor_type_id')->references('id')->on('investor_types')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('investor_investments', function (Blueprint $table) {
            $table->dropColumn(['pool_id', 'investor_type_id']);
        });
    }
};