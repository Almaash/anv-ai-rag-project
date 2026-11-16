<?php

namespace App\Http\Resources\Loan;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LoanResource extends JsonResource
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
            'loan_id' => $this->loan_id,
            'loan_application_id' => $this->loan_application_id,
            'user_id' => $this->user_id,
            'customer_unique_id' => $this->user_id,
            'branch_id' => $this->branch_id,
            'cms_admin_id' => $this->cms_admin_id,
            'loan_amount' => $this->loan_amount,
            'loan_status' => $this->loan_status,
            'interest_rate' => $this->interest_rate,
            'tenure_months' => $this->tenure_months,
            'emi_amount' => $this->emi_amount,
            'application' => new LoanApplicationResource($this->whenLoaded('application')),
        ];
    }
}
