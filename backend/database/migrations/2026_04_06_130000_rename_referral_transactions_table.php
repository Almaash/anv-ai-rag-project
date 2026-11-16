<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('referral_transactions', 'investor_referral_transactions');
    }

    public function down(): void
    {
        Schema::rename('investor_referral_transactions', 'referral_transactions');
    }
};