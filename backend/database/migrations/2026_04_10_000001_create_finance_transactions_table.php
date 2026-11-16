<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_id')->unique();
            $table->decimal('amount', 15, 2);
            $table->enum('transaction_type', ['credit', 'debit']);
            $table->date('transaction_date');
            $table->text('description')->nullable();
            $table->string('attachment')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->string('branch')->nullable();
            $table->string('cms_admin_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('transaction_id');
            $table->index('transaction_type');
            $table->index('transaction_date');
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_transactions');
    }
};
