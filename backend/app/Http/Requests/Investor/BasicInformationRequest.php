<?php

namespace App\Http\Requests\Investor;

use Illuminate\Foundation\Http\FormRequest;

class BasicInformationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $uniqueId = $this->route('id');
        $id = null;

        if ($uniqueId) {
            $record = \App\Models\Investor\BasicInformation::where('unique_id', $uniqueId)->first();
            $id = $record ? $record->id : null;
        }

        return [
            'investor_id' => ['nullable', 'integer'],
            'branch_id'   => ['nullable', 'string'],
            'cms_admin_id'=> ['nullable', 'string'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:investor_basic_information,email,' . ($id ?? 'NULL')],
            'mobile' => ['required', 'digits:10'],
            'date_of_birth' => ['required', 'date', 'before_or_equal:' . now()->subYears(18)->format('Y-m-d')],
            'gender' => ['required', 'in:male,female,other'],
            'pan_number' => ['required', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/', 'unique:investor_basic_information,pan_number,' . ($id ?? 'NULL')],
            'aadhaar_number' => ['nullable', 'digits:12'],
            'current_address' => ['required', 'string'],
            'permanent_address' => ['required', 'string'],
            'referral_type' => ['required', 'in:Self,Referral'],
            'referral_id' => ['required_if:referral_type,Referral', 'nullable', 'string'],
            'enrollment_date' => ['required', 'date'],
            'emergency_contact' => ['required', 'digits:10'],
            'nominee_details' => ['nullable', 'string'], // Recevied as JSON string from frontend
            'profile_photo' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png', 'max:2048'],
            'pan_card_doc' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:2048'],
            'aadhaar_card_doc' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:2048'],
            'passbook_doc' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:2048'],
            'voter_id_doc' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:2048'],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['nullable', 'string'],
        ];
    }
}