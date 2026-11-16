<?php

namespace App\Http\Resources\Loan;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LoanApplicationResource extends JsonResource
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
            'loan_application_id' => $this->loan_application_id,
            'customer_unique_id' => $this->customer_unique_id,
            'user_id' => $this->user_id,
            'customer' => new LoanCustomerResource($this->whenLoaded('customer')),
        ];
    }
}
