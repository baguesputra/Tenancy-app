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
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Settings\UserManagementController;
use App\Http\Controllers\Settings\AccessControlController;

Route::middleware('can:settings.access')->prefix('settings')->name('settings.')->group(function () {
    Route::get('/users', [UserManagementController::class, 'index'])->name('users.index');
    Route::post('/users', [UserManagementController::class, 'store']);
    Route::put('/users/{id}', [UserManagementController::class, 'update']);
    Route::delete('/users/{id}', [UserManagementController::class, 'destroy']);

    Route::get('/access-control', [AccessControlController::class, 'index'])->name('access-control.index');
    Route::put('/access-control/{role}', [AccessControlController::class, 'update']);
});

Route::middleware('auth:tenant')->post('/portal/notifications/{id}/read', function ($id, Illuminate\Http\Request $request) {
    $request->user('tenant')->notifications()->where('id', $id)->update(['read_at' => now()]);
    return back();
})->name('tenant-portal.notifications.read');

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

// routes/web.php — pola yang lebih ringkas

Route::middleware('auth')->group(function () {

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::post('/logout', [LocalLoginController::class, 'destroy'])->name('logout');
    Route::get('/password/change', [PasswordChangeController::class, 'edit'])->name('password.change.form');
    Route::put('/password/change', [PasswordChangeController::class, 'update'])->name('password.change.update');

    Route::middleware('can:tenants.view')->get('/tenants', [TenantController::class, 'index'])->name('tenants.index');
    Route::middleware('can:tenants.create')->post('/tenants', [TenantController::class, 'store']);
    Route::middleware('can:tenants.edit')->put('/tenants/{id}', [TenantController::class, 'update']);
    Route::middleware('can:tenants.delete')->delete('/tenants/{id}', [TenantController::class, 'destroy']);

    Route::middleware('can:units.view')->get('/units', [UnitController::class, 'index'])->name('units.index');
    Route::middleware('can:units.create')->post('/units', [UnitController::class, 'store']);
    Route::middleware('can:units.edit')->put('/units/{id}', [UnitController::class, 'update']);
    Route::middleware('can:units.delete')->delete('/units/{id}', [UnitController::class, 'destroy']);

    Route::middleware('can:tenancies.view')->get('/tenancies', [TenancyController::class, 'index'])->name('tenancies.index');
    Route::middleware('can:tenancies.create')->post('/tenancies', [TenancyController::class, 'store']);
    Route::middleware('can:tenancies.edit')->post('/tenancies/{id}', [TenancyController::class, 'update']); // pakai POST karena ada file upload + method spoofing
    Route::middleware('can:tenancies.delete')->delete('/tenancies/{id}', [TenancyController::class, 'destroy']);

    Route::middleware('can:categories.view')->group(function () {
        Route::get('/tenant-categories', [TenantCategoryController::class, 'index'])->name('tenant-categories.index');
        Route::get('/product-categories', [ProductCategoryController::class, 'index'])->name('product-categories.index');
    });
    Route::middleware('can:categories.manage')->group(function () {
        Route::post('/tenant-categories', [TenantCategoryController::class, 'store']);
        Route::put('/tenant-categories/{id}', [TenantCategoryController::class, 'update']);
        Route::delete('/tenant-categories/{id}', [TenantCategoryController::class, 'destroy']);
        Route::post('/product-categories', [ProductCategoryController::class, 'store']);
        Route::put('/product-categories/{id}', [ProductCategoryController::class, 'update']);
        Route::delete('/product-categories/{id}', [ProductCategoryController::class, 'destroy']);
    });

    Route::middleware('can:sidak.view')->group(function () {
    Route::get('/inspection-sessions', [InspectionSessionController::class, 'index'])->name('sessions.index');
    Route::get('/inspections/{inspection}', [InspectionController::class, 'show'])->name('inspections.show');
    });

    Route::middleware('can:sidak.create')->group(function () {
        // PENTING: route ini HARUS di atas '/inspection-sessions/{session}'
        Route::get('/inspection-sessions/current', [InspectionSessionController::class, 'current'])->name('sessions.current');
        Route::post('/inspection-sessions/{session}/tenants', [InspectionSessionController::class, 'addTenant'])->name('sessions.addTenant');
        Route::post('/inspection-sessions/{session}/complete', [InspectionSessionController::class, 'complete'])->name('sessions.complete');
        Route::post('/inspections/{inspection}/answers', [InspectionController::class, 'saveAnswer'])->name('inspections.saveAnswer');
        Route::post('/inspections/{inspection}/complete', [InspectionController::class, 'complete'])->name('inspections.complete');
    });

    Route::middleware('can:sidak.view')->group(function () {
        // Baru taruh route wildcard {session} di paling akhir, setelah 'current'
        Route::get('/inspection-sessions/{session}', [InspectionSessionController::class, 'show'])->name('sessions.show');
    });

    Route::middleware('can:permits.view')->get('/permit-requests', [PermitRequestController::class, 'index'])->name('permit-requests.index');

    Route::middleware('can:permits.create')->group(function () {
        // PENTING: taruh SEBELUM route wildcard {permitRequest}
        Route::get('/permit-requests/create', [PermitRequestController::class, 'create'])->name('permit-requests.create');
        Route::post('/permit-requests', [PermitRequestController::class, 'store']);
    });

    Route::middleware('can:permits.view')->get('/permit-requests/{permitRequest}', [PermitRequestController::class, 'show'])->name('permit-requests.show');

    Route::middleware('can:permits.approve')->group(function () {
        Route::post('/approvals/{approval}/approve', [ApprovalController::class, 'approve'])->name('approvals.approve');
        Route::post('/approvals/{approval}/reject', [ApprovalController::class, 'reject'])->name('approvals.reject');
        Route::post('/permit-workers/{worker}/toggle', [PermitCheckController::class, 'toggleWorker'])->name('permit-workers.toggle');
        Route::post('/permit-workers/{worker}/note', [PermitCheckController::class, 'updateWorkerNote'])->name('permit-workers.note');
        Route::post('/permit-goods/{good}/verify', [PermitCheckController::class, 'verifyGood'])->name('permit-goods.verify');
        Route::post('/permit-requests/{permitRequest}/complete-security-check', [PermitCheckController::class, 'completeSecurityCheck'])->name('permit-requests.completeSecurityCheck');
    });

    Route::middleware('can:settings.access')->prefix('settings')->name('settings.')->group(function () {
        // akan diisi di bagian berikutnya (User Management + Hak Akses)
    });

    // Notifikasi — semua yang login boleh
    Route::post('/notifications/{id}/read', function ($id, Illuminate\Http\Request $request) {
        $request->user()->notifications()->where('id', $id)->update(['read_at' => now()]);
        return back();
    })->name('notifications.read');
});


// Portal (staff toko)
Route::prefix('portal')->name('tenant-portal.')->middleware('auth:tenant')->group(function () {
    Route::resource('permits', PortalPermitRequestController::class)->except(['edit', 'update', 'destroy']);
});


