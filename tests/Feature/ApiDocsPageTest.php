<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ApiDocsPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_redirected_from_api_docs(): void
    {
        config(['auth.mode' => 'local']);

        $this->get('/api-docs')->assertRedirect('/login');
    }

    public function test_authenticated_user_can_view_api_docs(): void
    {
        $user = User::create([
            'name' => 'Developer',
            'email' => 'dev@dutamall.com',
            'employee_number' => 'DEV-01',
            'password' => bcrypt('secret'),
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->get('/api-docs')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('ApiDocs/Index'));
    }
}
