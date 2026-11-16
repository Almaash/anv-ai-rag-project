<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MoneyPoolRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $idParam = $this->route('id');
        $pool = null;

        if ($idParam) {
            $pool = \App\Models\MoneyPool::where('id', $idParam)
                ->orWhere('unique_id', $idParam)
                ->first();
        }

        $id = $pool ? $pool->id : 'NULL';

        $branchId = $this->input('branch_id');

        // Name unique per branch only
        $nameRule = \Illuminate\Validation\Rule::unique('money_pools', 'name')
            ->where('branch_id', $branchId)
            ->ignore($id);

        return [
            'unique_id'  => ['sometimes', 'string', 'max:255', 'unique:money_pools,unique_id,' . $id],
                'cms_admin_id' => ['nullable', 'string', 'max:255'],
            'name'       => ['required', 'string', 'max:255', $nameRule],
            'limit_from' => ['required', 'numeric', 'min:0'],
            'limit_to'   => ['required', 'numeric', 'gte:limit_from'],
            'notes'      => ['nullable', 'string'],
            'status'     => ['sometimes', 'boolean'],
        ];
    }
}
