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
use App\Http\Controllers\Auth\TenantLoginController;
use App\Http\Controllers\ApprovalController;
use App\Http\Controllers\PermitCheckController;
use App\Http\Controllers\PermitRequestController;
use App\Http\Controllers\TenantPortal\PermitRequestController as PortalPermitRequestController;

Route::prefix('portal')->name('tenant-portal.')->group(function () {
    Route::middleware('guest:tenant')->group(function () {
        Route::get('/login', [TenantLoginController::class, 'create'])->name('login');
        Route::post('/login', [TenantLoginController::class, 'store']);
    });

    Route::middleware('auth:tenant')->group(function () {
        Route::post('/logout', [TenantLoginController::class, 'destroy'])->name('logout');

        Route::get('/dashboard', function () {
            return Inertia::render('TenantPortal/Dashboard');
        })->name('dashboard');
    });
});

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

    Route::resource('permit-requests', PermitRequestController::class)->except(['edit', 'update', 'destroy']);
    Route::post('/approvals/{approval}/approve', [ApprovalController::class, 'approve'])->name('approvals.approve');
    Route::post('/approvals/{approval}/reject', [ApprovalController::class, 'reject'])->name('approvals.reject');
    Route::post('/permit-workers/{worker}/toggle', [PermitCheckController::class, 'toggleWorker'])->name('permit-workers.toggle');
    Route::post('/permit-workers/{worker}/note', [PermitCheckController::class, 'updateWorkerNote'])->name('permit-workers.note');
    Route::post('/permit-goods/{good}/verify', [PermitCheckController::class, 'verifyGood'])->name('permit-goods.verify');
    Route::post('/permit-requests/{permitRequest}/complete-security-check', [PermitCheckController::class, 'completeSecurityCheck'])->name('permit-requests.completeSecurityCheck');

    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');
});


// Portal (staff toko)
Route::prefix('portal')->name('tenant-portal.')->middleware('auth:tenant')->group(function () {
    Route::resource('permits', PortalPermitRequestController::class)->except(['edit', 'update', 'destroy']);
});


