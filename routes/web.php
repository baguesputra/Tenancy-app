<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Auth\LocalLoginController;
use App\Http\Controllers\Auth\SsoController;
use App\Http\Controllers\Auth\PasswordChangeController;

Route::middleware('guest')->group(function () {
    Route::get('/login', [LocalLoginController::class, 'create'])->name('login');
    Route::post('/login', [LocalLoginController::class, 'store']);
});

Route::get('/auth/sso/redirect', [SsoController::class, 'redirect'])->name('sso.redirect');
Route::get('/auth/sso/callback', [SsoController::class, 'callback']);

Route::middleware('auth')->group(function () {
    Route::post('/logout', [LocalLoginController::class, 'destroy'])->name('logout');

    Route::get('/password/change', [PasswordChangeController::class, 'edit'])->name('password.change.form');
    Route::put('/password/change', [PasswordChangeController::class, 'update'])->name('password.change.update');

    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');
});


