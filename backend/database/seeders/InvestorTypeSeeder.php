<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Loan\InvestorType;

class InvestorTypeSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            'Individual',
            'HNI (High Net Worth Individual)',
            'Company / Firm',
            'Angel Investor',
            'Venture Capitalist',
            'NRI / Foreign Investor',
        ];

        $counter = InvestorType::count();

        foreach ($defaults as $index => $name) {
            $exists = InvestorType::where('name', $name)->first();
            if ($exists) {
                continue;
            }

            $counter++;
            InvestorType::create([
                'unique_id' => 'INV-TYPE-' . str_pad((string) $counter, 4, '0', STR_PAD_LEFT),
                'name' => $name,
                'status' => 'active',
            ]);
        }
    }
}
