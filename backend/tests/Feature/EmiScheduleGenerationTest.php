<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\LoanApplication;
use App\Models\Loan;
use App\Models\EmiSchedule;
use Illuminate\Foundation\Testing\RefreshDatabase;

class EmiScheduleGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_emi_schedule_is_generated_when_loan_is_started()
    {
        // Create a user
        $user = User::factory()->create([
            'user_unique_id' => 'USER001',
            'role' => 'customer'
        ]);

        // Create an approved loan application
        $loanApplication = LoanApplication::create([
            'loan_application_id' => 'LA2025000001',
            'user_unique_id' => $user->user_unique_id,
            'loan_amount' => 100000,
            'loan_purpose' => 'Home renovation',
            'loan_tenure_months' => 12,
            'interest_rate' => 12.0,
            'monthly_income' => 50000,
            'employment_type' => 'salaried',
            'work_experience_years' => 5,
            'application_status' => 'approved'
        ]);

        // Authenticate as user
        $this->actingAs($user, 'sanctum');

        // Start the loan
        $response = $this->postJson("/api/start-loan/{$loanApplication->loan_application_id}", [
            'loan_amount' => 100000,
            'interest_rate' => 12.0,
            'tenure_months' => 12,
            'emi_amount' => 8884.88,
            'total_amount' => 106618.56,
            'loan_start_date' => '2025-01-01',
            'loan_end_date' => '2025-12-01',
            'loan_status' => 'active'
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Loan started successfully with EMI schedule generated'
        ]);

        // Verify loan was created
        $this->assertDatabaseHas('loans', [
            'loan_application_id' => $loanApplication->loan_application_id,
            'user_id' => $user->user_unique_id,
            'loan_amount' => 100000
        ]);

        // Verify EMI schedule was generated
        $loan = Loan::where('loan_application_id', $loanApplication->loan_application_id)->first();
        $emiSchedules = EmiSchedule::where('loan_id', $loan->id)->get();

        $this->assertCount(12, $emiSchedules);

        // Verify first EMI details
        $firstEmi = $emiSchedules->first();
        $this->assertEquals(1, $firstEmi->emi_number);
        $this->assertEquals('2025-01-01', $firstEmi->due_date->format('Y-m-d'));
        $this->assertEquals('pending', $firstEmi->status);
        $this->assertGreaterThan(0, $firstEmi->principal_amount);
        $this->assertGreaterThan(0, $firstEmi->interest_amount);

        // Verify last EMI details
        $lastEmi = $emiSchedules->last();
        $this->assertEquals(12, $lastEmi->emi_number);
        $this->assertEquals('2025-12-01', $lastEmi->due_date->format('Y-m-d'));
    }
}