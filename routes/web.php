<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Auth\LocalLoginController;
use App\Http\Controllers\Auth\SsoController;
use App\Http\Controllers\Auth\PasswordChangeController;
use App\Http\Controllers\InspectionSessionController;
use App\Http\Controllers\InspectionController;
use App\Http\Controllers\TenantController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\TenantCategoryController;
use App\Http\Controllers\ProductCategoryController;
use App\Http\Controllers\TenancyController;

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

    Route::get('/inspection-sessions', [InspectionSessionController::class, 'index'])->name('sessions.index');
    Route::get('/inspection-sessions/current', [InspectionSessionController::class, 'current'])->name('sessions.current');
    Route::get('/inspection-sessions/{session}', [InspectionSessionController::class, 'show'])->name('sessions.show');
    Route::post('/inspection-sessions/{session}/tenants', [InspectionSessionController::class, 'addTenant'])->name('sessions.addTenant');
    Route::post('/inspection-sessions/{session}/complete', [InspectionSessionController::class, 'complete'])->name('sessions.complete');

    Route::get('/inspections/{inspection}', [InspectionController::class, 'show'])->name('inspections.show');
    Route::post('/inspections/{inspection}/answers', [InspectionController::class, 'saveAnswer'])->name('inspections.saveAnswer');
    Route::post('/inspections/{inspection}/complete', [InspectionController::class, 'complete'])->name('inspections.complete');

    Route::resource('tenants', TenantController::class)->except(['show']);
    Route::resource('units', UnitController::class)->except(['show']);
    Route::resource('tenant-categories', TenantCategoryController::class)->except(['show']);
    Route::resource('product-categories', ProductCategoryController::class)->except(['show']);
    Route::resource('tenancies', TenancyController::class)->except(['show']);

    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');
});


