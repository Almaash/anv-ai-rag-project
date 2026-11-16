<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('fee_masters');
        Schema::dropIfExists('interest_masters');
    }

    public function down(): void
    {
        //
    }
};
