<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Loan\LoanCustomer;
use App\Models\Loan\LoanAgent;
use Illuminate\Foundation\Testing\RefreshDatabase;

class LoanCustomerSourcingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create a test loan agent
        LoanAgent::create([
            'agent_unique_id' => 'TEST001',
            'name' => 'Test Agent',
            'email' => 'agent@test.com',
            'phone' => '1234567890',
            'status' => 'active'
        ]);
    }

    /** @test */
    public function it_can_create_loan_customer_with_self_sourcing()
    {
        $response = $this->postJson('/api/create-loan-customer', [
            'agent_unique_id' => 'TEST001',
            'sourcing_type' => 'self',
            'password' => 'password123',
            'profileForm' => [
                'firstName' => 'John',
                'lastName' => 'Doe',
                'emailId' => 'john@example.com',
                'contactNumber1' => '9876543210'
            ]
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'success',
            'message',
            'data' => [
                'sourcing_type',
                'referral_id'
            ]
        ]);

        $this->assertDatabaseHas('loan_customers', [
            'sourcing_type' => 'self',
            'referral_id' => null
        ]);
    }

    /** @test */
    public function it_can_create_loan_customer_with_referral_sourcing()
    {
        $response = $this->postJson('/api/create-loan-customer', [
            'agent_unique_id' => 'TEST001',
            'sourcing_type' => 'referral',
            'referral_id' => 'REF123',
            'password' => 'password123',
            'profileForm' => [
                'firstName' => 'Jane',
                'lastName' => 'Smith',
                'emailId' => 'jane@example.com',
                'contactNumber1' => '9876543211'
            ]
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('loan_customers', [
            'sourcing_type' => 'referral',
            'referral_id' => 'REF123'
        ]);
    }

    /** @test */
    public function it_requires_referral_id_when_sourcing_type_is_referral()
    {
        $response = $this->postJson('/api/create-loan-customer', [
            'agent_unique_id' => 'TEST001',
            'sourcing_type' => 'referral',
            // Missing referral_id
            'password' => 'password123',
            'profileForm' => [
                'firstName' => 'Test',
                'lastName' => 'User',
                'emailId' => 'test@example.com',
                'contactNumber1' => '9876543212'
            ]
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['referral_id']);
    }

    /** @test */
    public function it_validates_sourcing_type_values()
    {
        $response = $this->postJson('/api/create-loan-customer', [
            'agent_unique_id' => 'TEST001',
            'sourcing_type' => 'invalid_type',
            'password' => 'password123',
            'profileForm' => [
                'firstName' => 'Test',
                'lastName' => 'User',
                'emailId' => 'test2@example.com',
                'contactNumber1' => '9876543213'
            ]
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['sourcing_type']);
    }
}