<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Auth\LocalLoginController;

Route::get('/login', [LocalLoginController::class, 'create'])->name('login');
Route::post('/login', [LocalLoginController::class, 'store']);
Route::post('/logout', [LocalLoginController::class, 'destroy'])->name('logout');

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');
});

Route::get('/', function () {
    return Inertia::render('Welcome');
});
