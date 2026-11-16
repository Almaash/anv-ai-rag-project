<?php

namespace App\Http\Resources\Loan;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LoanCustomerResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'customer_unique_id' => $this->customer_unique_id,
            'agent_unique_id' => $this->agent_unique_id,
            'sourcing_type' => $this->sourcing_type,
            'referral_id' => $this->referral_id,
            'name' => $this->name,
            'email' => $this->email,
            'phone_no' => $this->phone_no,
        ];
    }
}
