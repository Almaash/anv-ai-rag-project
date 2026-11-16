<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investor_investments', function (Blueprint $table) {
            $table->id();
            $table->string('unique_id')->unique();
            $table->unsignedBigInteger('investor_id');
            $table->decimal('amount', 15, 2);
            $table->date('date');
            $table->decimal('rate', 5, 2);
            $table->decimal('yearly', 15, 2);
            $table->decimal('maturity', 15, 2);
            $table->date('lockin');
            $table->timestamps();
            $table->foreign('investor_id')->references('id')->on('investor_basic_information')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investor_investments');
    }
};
