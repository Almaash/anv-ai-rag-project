<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loan_fee_masters', function (Blueprint $table) {
            $table->id();
            $table->decimal('processing_fee', 10, 2);
            $table->decimal('gst_percentage', 5, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_fee_masters');
    }
};
