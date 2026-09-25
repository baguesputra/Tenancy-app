<?php

namespace App\Providers;

use App\Services\SSO\PerusahaanProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use SocialiteProviders\Manager\SocialiteWasCalled;

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
        Gate::before(function ($user, $ability) {
            return $user->hasRole('super_admin') ? true : null;
        });

        Event::listen(SocialiteWasCalled::class, function (SocialiteWasCalled $event) {
            $event->extendSocialite('perusahaan', PerusahaanProvider::class);
        });

        RateLimiter::for('sso-callback', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip())->response(function () {
                return redirect()->route('login')->with('error', 'Terlalu banyak percobaan. Coba lagi nanti.');
            });
        });

        PreventRequestForgery::except([
            '/auth/sso/callback',
            '/auth/sso/slo',
        ]);
    }
}
