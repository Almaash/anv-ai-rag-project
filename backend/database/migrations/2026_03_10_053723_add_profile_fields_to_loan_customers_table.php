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
        Schema::table('loan_customers', function (Blueprint $table) {
            $table->string('enrollment_number')->nullable()->after('customer_unique_id');
            $table->date('enrollment_date')->nullable()->after('enrollment_number');
            $table->string('customer_id')->nullable()->after('enrollment_date');
            $table->string('first_name')->nullable()->after('name');
            $table->string('middle_name')->nullable()->after('first_name');
            $table->string('last_name')->nullable()->after('middle_name');
            $table->enum('gender', ['male', 'female', 'other'])->nullable()->after('last_name');
            $table->string('father_name')->nullable()->after('date_of_birth');
            $table->string('service_area_pin', 6)->nullable()->after('father_name');
            $table->string('religion')->nullable()->after('service_area_pin');
            $table->string('caste')->nullable()->after('religion');
            $table->string('ration_card_number')->nullable()->after('voter_id_number');
            $table->string('ration_card_image')->nullable()->after('voter_id_image');
            $table->text('permanent_address')->nullable()->after('address_2');
            $table->text('correspondence_address')->nullable()->after('permanent_address');
            $table->string('contact_number_1', 20)->nullable()->after('phone_no');
            $table->string('contact_number_2', 20)->nullable()->after('contact_number_1');
            $table->string('nominee_name')->nullable()->after('correspondence_address');
            $table->string('nominee_relationship')->nullable()->after('nominee_name');
            $table->text('nominee_address')->nullable()->after('nominee_relationship');
            $table->string('occupation')->nullable()->after('nominee_address');
            $table->string('salaried_type')->nullable()->after('occupation');
            $table->string('business_nature')->nullable()->after('salaried_type');
            $table->string('spouse_occupation')->nullable()->after('business_nature');
            $table->string('spouse_salaried_type')->nullable()->after('spouse_occupation');
            $table->string('spouse_business_nature')->nullable()->after('spouse_salaried_type');
            $table->string('residence_type')->nullable()->after('spouse_business_nature');
            $table->string('years_of_staying')->nullable()->after('residence_type');
            $table->string('house_type')->nullable()->after('years_of_staying');
            $table->string('number_of_rooms')->nullable()->after('house_type');
            $table->json('assets')->nullable()->after('number_of_rooms');
            $table->string('customer_photo')->nullable()->after('assets');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_customers', function (Blueprint $table) {
            $table->dropColumn([
                'enrollment_number',
                'enrollment_date',
                'customer_id',
                'first_name',
                'middle_name',
                'last_name',
                'gender',
                'father_name',
                'service_area_pin',
                'religion',
                'caste',
                'ration_card_number',
                'ration_card_image',
                'permanent_address',
                'correspondence_address',
                'contact_number_1',
                'contact_number_2',
                'nominee_name',
                'nominee_relationship',
                'nominee_address',
                'occupation',
                'salaried_type',
                'business_nature',
                'spouse_occupation',
                'spouse_salaried_type',
                'spouse_business_nature',
                'residence_type',
                'years_of_staying',
                'house_type',
                'number_of_rooms',
                'assets',
                'customer_photo',
            ]);
        });
    }
};
