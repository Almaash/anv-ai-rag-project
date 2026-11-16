<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Migrate existing single-product data into products JSON before dropping columns
        DB::table('loan_credit_application_forms')
            ->whereNull('products')
            ->orWhere('products', '[]')
            ->get()
            ->each(function ($row) {
                if ($row->product_name || $row->product_code) {
                    DB::table('loan_credit_application_forms')
                        ->where('id', $row->id)
                        ->update([
                            'products' => json_encode([[
                                'product_name'       => $row->product_name,
                                'product_code'       => $row->product_code,
                                'product_attributes' => $row->product_attributes,
                                'product_details'    => $row->product_details,
                                'product_quantity'   => $row->product_quantity ?? 1,
                                'credit_applied_for' => $row->credit_applied_for,
                            ]]),
                        ]);
                }
            });

        Schema::table('loan_credit_application_forms', function (Blueprint $table) {
            $table->dropColumn([
                'product_name',
                'product_code',
                'product_attributes',
                'product_details',
                'product_quantity',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('loan_credit_application_forms', function (Blueprint $table) {
            $table->string('product_name')->nullable();
            $table->string('product_code')->nullable();
            $table->json('product_attributes')->nullable();
            $table->json('product_details')->nullable();
            $table->integer('product_quantity')->nullable();
        });
    }
};
