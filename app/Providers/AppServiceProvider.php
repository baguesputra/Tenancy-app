<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\SSO\PerusahaanProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Socialite::extend('sso', function ($app) {
            $config = $app['config']['services.sso'];

            return Socialite::buildProvider(PerusahaanProvider::class, $config);
        });
    }
}
