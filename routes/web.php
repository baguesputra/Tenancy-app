<?php

use App\Http\Controllers\ApprovalController;
use App\Http\Controllers\Auth\LocalLoginController;
use App\Http\Controllers\Auth\PasswordChangeController;
use App\Http\Controllers\Auth\SsoController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FloorPlanController;
use App\Http\Controllers\InspectionController;
use App\Http\Controllers\InspectionSessionController;
use App\Http\Controllers\PermitCheckController;
use App\Http\Controllers\PermitRequestController;
use App\Http\Controllers\ProductCategoryController;
use App\Http\Controllers\ScanController;
use App\Http\Controllers\Settings\AccessControlController;
use App\Http\Controllers\Settings\GateSyncController;
use App\Http\Controllers\Settings\InspectionTemplateController;
use App\Http\Controllers\Settings\StaticDocumentController;
use App\Http\Controllers\Settings\UserManagementController;
use App\Http\Controllers\TenancyController;
use App\Http\Controllers\TenantCategoryController;
use App\Http\Controllers\TenantController;
use App\Http\Controllers\TenantProfileController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\UnitQrController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    if (request()->query('local') === '1' && config('auth.allow_local_login', false)) {
        return redirect()->route('login', ['local' => 1]);
    }

    if (config('auth.mode') === 'sso' || config('services.perusahaan.metadata')) {
        return redirect()->route('sso.redirect');
    }

    return redirect()->route('login');
})->name('home');

Route::get('/logout', function () {
    if (auth()->check()) {
        return app(LocalLoginController::class)->destroy(request());
    }

    if (config('auth.mode') === 'sso') {
        return redirect()->away(config('services.gate.base_url', 'https://gate.appdutamall.com').'/dashboard');
    }

    return redirect()->route('login');
})->name('logout.get');

Route::middleware(['auth', 'can:documents.manage'])->prefix('settings')->name('settings.')->group(function () {
    Route::get('/documents', [StaticDocumentController::class, 'index'])->name('documents.index');
    Route::post('/documents', [StaticDocumentController::class, 'store'])->name('documents.store');
});

Route::middleware(['auth', 'can:settings.access'])->prefix('settings')->name('settings.')->group(function () {
    Route::get('/users', [UserManagementController::class, 'index'])->name('users.index');
    Route::post('/users', [UserManagementController::class, 'store']);
    Route::put('/users/{id}', [UserManagementController::class, 'update']);
    Route::delete('/users/{id}', [UserManagementController::class, 'destroy']);

    Route::get('/access-control', [AccessControlController::class, 'index'])->name('access-control.index');
    Route::put('/access-control/{role}', [AccessControlController::class, 'update']);
    Route::put('/access-control/{role}/scopes', [AccessControlController::class, 'updateScopes'])->name('access-control.scopes');

    Route::get('/inspection-templates', [InspectionTemplateController::class, 'index'])->name('inspection-templates.index');
    Route::put('/inspection-templates/{template}', [InspectionTemplateController::class, 'update'])->name('inspection-templates.update');
    Route::put('/inspection-items/{item}', [InspectionTemplateController::class, 'updateItem'])->name('inspection-items.update');

    Route::get('/gate', [GateSyncController::class, 'index'])->name('gate.index');
    Route::middleware('can:gate.sync')->group(function () {
        Route::post('/gate/sync', [GateSyncController::class, 'syncSemua'])->name('gate.sync');
        Route::post('/gate/sync-master', [GateSyncController::class, 'syncMaster'])->name('gate.sync-master');
        Route::post('/gate/sync-karyawan', [GateSyncController::class, 'syncKaryawan'])->name('gate.sync-karyawan');
        Route::post('/gate/jadwal', [GateSyncController::class, 'simpanJadwal'])->name('gate.jadwal');
    });
});

Route::middleware('guest')->group(function () {
    Route::get('/login', [LocalLoginController::class, 'create'])->name('login')->middleware('sso.local-guard');
    Route::post('/login', [LocalLoginController::class, 'store'])->middleware('sso.local-guard');
});

Route::get('/auth/sso/redirect', [SsoController::class, 'redirect'])->name('sso.redirect');
Route::match(['get', 'post'], '/auth/sso/callback', [SsoController::class, 'callback'])
    ->name('sso.callback')
    ->middleware('throttle:sso-callback');
Route::get('/auth/sso/logout', [SsoController::class, 'logout'])->name('sso.logout');
Route::match(['get', 'post'], '/auth/sso/slo', [SsoController::class, 'slo'])->name('sso.slo');
Route::get('/auth/sso/metadata', [SsoController::class, 'metadata'])->name('sso.metadata');
Route::get('/auth/sso/gagal', function () {
    return Inertia::render('Auth/SsoGagal', [
        'error' => session('error'),
        'ssoLogoutUrl' => config('services.gate.base_url', 'https://gate.appdutamall.com').'/dashboard',
    ]);
})->middleware('guest')->name('sso.gagal');

use App\Http\Controllers\LooController;
use App\Http\Controllers\LooFitoutController;

Route::middleware('auth')->group(function () {

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::post('/logout', [LocalLoginController::class, 'destroy'])->name('logout');
    Route::get('/password/change', [PasswordChangeController::class, 'edit'])->name('password.change.form');
    Route::put('/password/change', [PasswordChangeController::class, 'update'])->middleware('throttle:password-change')->name('password.change.update');

    Route::middleware('can:tenants.view')->get('/tenants', [TenantController::class, 'index'])->name('tenants.index');
    Route::middleware('can:tenants.view')->get('/tenant-profiles', [TenantProfileController::class, 'index'])->name('tenant-profiles.index');
    Route::middleware('can:tenants.view')->get('/tenant-profiles/{tenant}/detail', [TenantProfileController::class, 'full'])->name('tenant-profiles.detail');
    Route::middleware('can:tenants.view')->get('/tenant-profiles/{tenant}', [TenantProfileController::class, 'show'])->name('tenant-profiles.show');
    Route::middleware('can:tenants.view')->get('/tenant-profiles/{tenant}/inspections/{inspection}', [TenantProfileController::class, 'showInspection'])->name('tenant-profiles.inspection');
    Route::middleware('can:tenants.view')->get('/tenant-profiles/{tenant}/permits/{permit}', [TenantProfileController::class, 'showPermit'])->name('tenant-profiles.permit');
    // Master Tenant — tidak bisa dibuat manual, hanya dari LOO `completed`
    Route::middleware('can:tenants.edit')->match(['put', 'post'], '/tenants/{id}', [TenantController::class, 'update'])->name('tenants.update'); // POST didukung karena upload logo via multipart + _method=put
    Route::middleware('can:tenants.delete')->delete('/tenants/{id}', [TenantController::class, 'destroy'])->name('tenants.destroy');

    Route::middleware('can:units.view')->get('/units', [UnitController::class, 'index'])->name('units.index');
    Route::middleware('can:units.create')->get('/units/create', [UnitController::class, 'create'])->name('units.create');
    Route::middleware('can:units.create')->post('/units', [UnitController::class, 'store'])->name('units.store');
    Route::middleware('can:units.edit')->put('/units/{id}', [UnitController::class, 'update'])->name('units.update');
    Route::middleware('can:units.delete')->delete('/units/{id}', [UnitController::class, 'destroy'])->name('units.destroy');

    Route::middleware('can:units.view')->group(function () {
        Route::get('/units/{id}/qr', [UnitQrController::class, 'single'])->name('units.qr');
        Route::get('/units-qr/bulk', [UnitQrController::class, 'bulk'])->name('units.qr.bulk');

        // Denah Lantai (Floor Map View 2D & 3D)
        Route::get('/floor-plans', [FloorPlanController::class, 'index'])->name('floor-plans.index');
        Route::get('/floor-plans/editor/{floor?}', [FloorPlanController::class, 'editor'])->name('floor-plans.editor');
        Route::post('/floor-plans/polygons', [FloorPlanController::class, 'savePolygons'])->name('floor-plans.polygons');
        Route::post('/floor-plans/upload', [FloorPlanController::class, 'uploadPlan'])->name('floor-plans.upload');
        Route::post('/floor-plans/parse-cad', [FloorPlanController::class, 'parseCad'])->name('floor-plans.parse-cad');
    });

    Route::middleware('can:tenancies.view')->get('/tenancies', [TenancyController::class, 'index'])->name('tenancies.index');
    // Master Tenancy — output dari LOO `completed`, tidak bisa dibuat manual
    Route::middleware('can:tenancies.edit')->post('/tenancies/{id}', [TenancyController::class, 'update'])->name('tenancies.update'); // pakai POST karena ada file upload + method spoofing
    Route::middleware('can:tenancies.delete')->delete('/tenancies/{id}', [TenancyController::class, 'destroy'])->name('tenancies.delete');

    Route::middleware('can:categories.view')->group(function () {
        Route::get('/categories', [CategoryController::class, 'index'])->name('categories.index');
        Route::redirect('/tenant-categories', '/categories?tab=tenant', 301);
        Route::redirect('/product-categories', '/categories?tab=product', 301);
    });
    Route::middleware('can:categories.manage')->group(function () {
        Route::post('/tenant-categories', [TenantCategoryController::class, 'store'])->name('tenant-categories.store');
        Route::put('/tenant-categories/{id}', [TenantCategoryController::class, 'update'])->name('tenant-categories.update');
        Route::delete('/tenant-categories/{id}', [TenantCategoryController::class, 'destroy'])->name('tenant-categories.destroy');
        Route::post('/product-categories', [ProductCategoryController::class, 'store'])->name('product-categories.store');
        Route::put('/product-categories/{id}', [ProductCategoryController::class, 'update'])->name('product-categories.update');
        Route::delete('/product-categories/{id}', [ProductCategoryController::class, 'destroy'])->name('product-categories.destroy');
    });

    Route::middleware('can:sidak.view')->group(function () {
        Route::get('/inspection-sessions', [InspectionSessionController::class, 'index'])->name('sessions.index');
        Route::get('/inspections/{inspection}', [InspectionController::class, 'show'])->name('inspections.show');
    });

    Route::middleware('can:sidak.create')->group(function () {
        // PENTING: route ini HARUS di atas '/inspection-sessions/{session}'
        Route::get('/inspection-sessions/current', [InspectionSessionController::class, 'current'])->name('sessions.current');
        Route::get('/inspection-sessions/create', [InspectionSessionController::class, 'create'])->name('sessions.create');
        Route::post('/inspection-sessions', [InspectionSessionController::class, 'store'])->name('sessions.store');
        Route::patch('/inspection-sessions/{session}/participants', [InspectionSessionController::class, 'updateParticipants'])->name('sessions.updateParticipants');
        Route::post('/inspection-sessions/{session}/tenants', [InspectionSessionController::class, 'addTenant'])->name('sessions.addTenant');
        Route::post('/inspection-sessions/{session}/scan', [InspectionSessionController::class, 'scan'])->name('sessions.scan');
        Route::post('/inspection-sessions/{session}/complete', [InspectionSessionController::class, 'complete'])->name('sessions.complete');
        Route::post('/inspections/{inspection}/answers', [InspectionController::class, 'saveAnswer'])->name('inspections.saveAnswer');
        Route::post('/inspections/{inspection}/extra-photos', [InspectionController::class, 'storeExtraPhoto'])->name('inspections.storeExtraPhoto');
        Route::delete('/inspection-extra-photos/{photo}', [InspectionController::class, 'destroyExtraPhoto'])->name('inspections.destroyExtraPhoto');
        Route::patch('/inspections/{inspection}/notes', [InspectionController::class, 'updateNotes'])->name('inspections.updateNotes');
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
        Route::post('/permit-requests', [PermitRequestController::class, 'store'])->name('permit-requests.store')->middleware('permit.time-lock');
        Route::post('/permit-requests/{permitRequest}/cancel', [PermitRequestController::class, 'cancel'])->name('permit-requests.cancel');
    });

    Route::middleware('can:permits.view')->get('/permit-requests/{permitRequest}/pdf', [PermitRequestController::class, 'pdf'])->name('permit-requests.pdf');
    Route::middleware('can:permits.view')->get('/permit-requests/{permitRequest}/pernyataan-tenant', [PermitRequestController::class, 'pernyataanTenant'])->name('permit-requests.pernyataan-tenant');
    Route::middleware('can:permits.view')->get('/permit-requests/{permitRequest}/pernyataan-kontraktor', [PermitRequestController::class, 'pernyataanKontraktor'])->name('permit-requests.pernyataan-kontraktor');
    Route::middleware('can:permits.view')->get('/permit-requests/{permitRequest}/fitout-tempel', [PermitRequestController::class, 'fitoutTempel'])->name('permit-requests.fitout-tempel');
    Route::middleware('can:permits.view')->get('/permit-requests/{permitRequest}/peraturan-fitout', [PermitRequestController::class, 'peraturanFitout'])->name('permit-requests.peraturan-fitout');
    Route::middleware('can:permits.view')->get('/permit-requests/{permitRequest}/tata-tertib-lembur', [PermitRequestController::class, 'tataTertibLembur'])->name('permit-requests.tata-tertib-lembur');
    Route::middleware('can:permits.view')->get('/permit-requests/{permitRequest}/kode-fitout', [PermitRequestController::class, 'kodeFitout'])->name('permit-requests.kode-fitout');
    Route::middleware('can:permits.view')->get('/permit-requests/{permitRequest}/penitipan-barang', [PermitRequestController::class, 'penitipanBarang'])->name('permit-requests.penitipan-barang');
    Route::middleware('can:permits.view')->get('/permit-requests/{permitRequest}/qr-label', [PermitRequestController::class, 'qrLabel'])->name('permit-requests.qr-label');
    Route::middleware('can:permits.view')->get('/permit-requests/{permitRequest}', [PermitRequestController::class, 'show'])->name('permit-requests.show');
    Route::middleware('can:permits.create')->post('/permit-requests/{permitRequest}/revise', [PermitRequestController::class, 'revise'])->name('permit-requests.revise');

    Route::middleware('can:permits.approve')->group(function () {
        Route::post('/approvals/{approval}/approve', [ApprovalController::class, 'approve'])->name('approvals.approve');
        Route::post('/approvals/{approval}/reject', [ApprovalController::class, 'reject'])->name('approvals.reject');
        Route::post('/permit-workers/{worker}/toggle', [PermitCheckController::class, 'toggleWorker'])->name('permit-workers.toggle');
        Route::post('/permit-workers/{worker}/note', [PermitCheckController::class, 'updateWorkerNote'])->name('permit-workers.note');
        Route::post('/permit-goods/{good}/verify', [PermitCheckController::class, 'verifyGood'])->name('permit-goods.verify');
        Route::post('/permit-requests/{permitRequest}/ktp-photos', [PermitCheckController::class, 'uploadKtp'])->name('permit-ktp.store');
        Route::delete('/permit-ktp-photos/{photo}', [PermitCheckController::class, 'deleteKtp'])->name('permit-ktp.destroy');
        Route::post('/permit-requests/{permitRequest}/complete-security-check', [PermitCheckController::class, 'completeSecurityCheck'])->name('permit-requests.completeSecurityCheck');
    });

    // LOO — Tenant Management System
    // PENTING: `/create` harus didaftarkan sebelum wildcard `/{loo}`
    Route::middleware('can:loos.create')->prefix('loos')->name('loos.')->group(function () {
        Route::get('/create', [LooController::class, 'create'])->name('create');
        Route::post('/store', [LooController::class, 'store'])->name('store');
        Route::post('/{loo}', [LooController::class, 'update'])->name('update');
    });

    Route::middleware('can:loos.view')->prefix('loos')->name('loos.')->group(function () {
        Route::get('/', [LooController::class, 'index'])->name('index');
        Route::get('/{loo}', [LooController::class, 'show'])->name('show');
        Route::get('/{loo}/files/{key}', [LooController::class, 'file'])->name('file');
        Route::get('/{loo}/attachments/{attachment}', [LooController::class, 'attachmentFile'])->name('attachment');
        Route::get('/{loo}/units', [LooController::class, 'units'])->name('units');
    });

    Route::middleware('can:loos.edit')->prefix('loos')->name('loos.')->group(function () {
        Route::get('/{loo}/edit', [LooController::class, 'edit'])->name('edit');
    });

    Route::middleware('can:loos.transition')->prefix('loos')->name('loos.')->group(function () {
        Route::post('/{loo}/transition', [LooController::class, 'transition'])->name('transition');
        Route::post('/{loo}/sections/{key}', [LooController::class, 'section'])->name('section');
        Route::post('/{loo}/fitout/approve', [LooFitoutController::class, 'acknowledgeGm'])->name('fitout.approve');
    });

    Route::middleware('can:loos.view')->prefix('loos')->name('loos.')->group(function () {
        Route::get('/{loo}/fitout', [LooFitoutController::class, 'show'])->name('fitout');
    });

    Route::middleware('can:loos.view')->get('/fitout-checklists', [LooFitoutController::class, 'index'])->name('fitout-checklists.index');

    Route::middleware('can:loos.delete')->post('/loos/{loo}/destroy', [LooController::class, 'destroy'])->name('loos.destroy');

    // Notifikasi — semua staff yang login boleh
    Route::post('/notifications/{id}/read', function ($id, Request $request) {
        $notifiable = $request->user();
        abort_unless($notifiable, 401);
        $notifiable->notifications()->where('id', $id)->update(['read_at' => now()]);

        return back();
    })->name('notifications.read')->withoutMiddleware('auth');
});

Route::middleware('throttle:30,1')->get('/scan/{token}', ScanController::class)->name('scan.resolve');
