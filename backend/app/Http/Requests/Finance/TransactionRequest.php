<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;

class TransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $transactionId = $this->route('id');
        $uniqueRule = 'unique:finance_transactions,transaction_id';
        $uniqueRefRule = 'unique:finance_transactions,payment_reference_id';

        if ($transactionId) {
            $uniqueRule    .= ',' . $transactionId;
            $uniqueRefRule .= ',' . $transactionId;
        }

        return [
            'transaction_id'       => ['sometimes', 'string', 'max:50', $uniqueRule],
            'payment_reference_id' => ['nullable', 'string', 'max:100', $uniqueRefRule],
            'payment_mode'         => ['nullable', 'in:cash,bank_transfer,upi,cheque,demand_draft,neft,rtgs,imps,other'],
            'amount'               => ['required', 'numeric', 'min:0.01'],
            'transaction_type'     => ['required', 'in:credit,debit'],
            'transaction_date'     => ['required', 'date'],
            'description'          => ['nullable', 'string'],
            'attachment'           => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,doc,docx'],
        ];
    }
}
