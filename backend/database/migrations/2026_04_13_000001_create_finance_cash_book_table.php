<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance_cash_book', function (Blueprint $table) {
            $table->id();
            $table->string('cash_book_id')->unique();
            $table->date('date')->unique();
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->decimal('cash_in', 15, 2)->default(0);
            $table->decimal('cash_out', 15, 2)->default(0);
            $table->decimal('closing_balance', 15, 2)->default(0);
            $table->text('note')->nullable();
            $table->string('branch')->nullable();
            $table->string('cms_admin_id')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_cash_book');
    }
};
