<?php

namespace Tests\Feature;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AiApiRoutesTest extends TestCase
{
    public function test_ai_routes_are_registered(): void
    {
        $this->assertTrue(Route::has('generated::') === false);

        $routes = collect(Route::getRoutes())->filter(function ($route) {
            return str_starts_with($route->uri(), 'api/ai/');
        });

        $this->assertGreaterThanOrEqual(13, $routes->count());
        $this->assertNotNull($routes->firstWhere('uri', 'api/ai/dashboard'));
        $this->assertNotNull($routes->firstWhere('uri', 'api/ai/investments'));
        $this->assertNotNull($routes->firstWhere('uri', 'api/ai/sales'));
        $this->assertNotNull($routes->firstWhere('uri', 'api/ai/purchases'));
        $this->assertNotNull($routes->firstWhere('uri', 'api/ai/bookings'));
        $this->assertNotNull($routes->firstWhere('uri', 'api/ai/customers'));
        $this->assertNotNull($routes->firstWhere('uri', 'api/ai/payments'));
    }

    public function test_ai_dashboard_requires_authentication(): void
    {
        $this->getJson('/api/ai/dashboard')
            ->assertUnauthorized();
    }

    public function test_ai_loan_routes_are_registered(): void
    {
        $expected = [
            'api/ai/loan/customers',
            'api/ai/loan/caf',
            'api/ai/loan/pd',
            'api/ai/loan/cam',
            'api/ai/loan/disbursements',
            'api/ai/loan/loans',
            'api/ai/loan/emis',
            'api/ai/loan/emi-collections',
            'api/ai/loan/agents',
        ];

        foreach ($expected as $uri) {
            $this->assertNotNull(Route::getRoutes()->match(
                Request::create('/' . $uri, 'GET')
            ));
        }
    }

    public function test_ai_loan_dashboard_requires_authentication(): void
    {
        $this->getJson('/api/ai/loan/customers')
            ->assertUnauthorized();
    }
}
