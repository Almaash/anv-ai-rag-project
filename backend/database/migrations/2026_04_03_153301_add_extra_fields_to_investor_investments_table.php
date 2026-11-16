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
        Schema::table('investor_investments', function (Blueprint $table) {
            $table->string('investor_unique_id')->after('investor_id');
            $table->string('investor_type_unique_id')->nullable()->after('investor_unique_id');
            $table->string('pool_unique_id')->nullable()->after('investor_type_unique_id');
            
            $table->decimal('self_amount', 15, 2)->default(0)->after('amount');
            $table->decimal('referral_amount', 15, 2)->default(0)->after('self_amount');
            $table->decimal('total_amount', 15, 2)->after('referral_amount');
            
            $table->decimal('referral_commission', 5, 2)->default(1.2)->after('rate');
            
            $table->text('declaration_text')->nullable()->after('maturity');
            $table->boolean('declaration_accepted')->default(false)->after('declaration_text');
        });
    }

    public function down(): void
    {
        Schema::table('investor_investments', function (Blueprint $table) {
            $table->dropColumn([
                'investor_unique_id', 
                'investor_type_unique_id', 
                'pool_unique_id', 
                'self_amount', 
                'referral_amount', 
                'total_amount', 
                'referral_commission', 
                'declaration_text', 
                'declaration_accepted'
            ]);
        });
    }
};
