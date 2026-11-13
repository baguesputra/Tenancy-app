<?php

use App\Http\Controllers\Api\AuthTokenController;
use App\Http\Controllers\Api\HcisEmployeeSyncController;
use App\Http\Controllers\Api\InspectionApiController;
use App\Http\Controllers\Api\InspectionSessionApiController;
use App\Http\Controllers\Api\SecurityPermitApiController;
use App\Http\Controllers\Auth\MobileSsoController;
use App\Http\Middleware\VerifyHcisSignature;
use App\Http\Resources\SessionUserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return response()->json((new SessionUserResource($request->user()))->resolve($request));
})->middleware('auth:sanctum');

Route::post('/v1/ingest/employee-sync', HcisEmployeeSyncController::class)
    ->middleware(VerifyHcisSignature::class)
    ->name('hcis.employee-sync');

Route::post('/v1/auth/login', [AuthTokenController::class, 'store'])->name('api.auth.login');
Route::post('/v1/sso/mobile/exchange', [MobileSsoController::class, 'exchange'])->name('api.sso.mobile.exchange');

Route::middleware('auth:sanctum')->prefix('v1')->group(function () {
    Route::post('/auth/logout', [AuthTokenController::class, 'destroy'])->name('api.auth.logout');

    Route::middleware('can:sidak.manage')->group(function () {
        Route::get('/inspection-sessions/current', [InspectionSessionApiController::class, 'current'])->name('api.sessions.current');
        Route::post('/inspection-sessions', [InspectionSessionApiController::class, 'store'])->name('api.sessions.store');
        Route::patch('/inspection-sessions/{session}/participants', [InspectionSessionApiController::class, 'updateParticipants'])->name('api.sessions.updateParticipants');
        Route::post('/inspection-sessions/{session}/scan', [InspectionSessionApiController::class, 'scan'])->name('api.sessions.scan');
        Route::post('/inspection-sessions/{session}/tenants', [InspectionSessionApiController::class, 'addTenant'])->name('api.sessions.addTenant');
        Route::post('/inspection-sessions/{session}/complete', [InspectionSessionApiController::class, 'complete'])->name('api.sessions.complete');
        Route::get('/staff-options', [InspectionSessionApiController::class, 'staffOptions'])->name('api.staff.options');
        Route::get('/tenants', [InspectionSessionApiController::class, 'tenants'])->name('api.tenants.index');
    });

    Route::middleware('can:sidak.view')->group(function () {
        Route::get('/inspection-sessions', [InspectionSessionApiController::class, 'index'])->name('api.sessions.index');
        Route::get('/inspection-sessions/{session}', [InspectionSessionApiController::class, 'show'])->name('api.sessions.show');
        Route::get('/inspections/{inspection}', [InspectionApiController::class, 'show'])->name('api.inspections.show');
    });

    Route::middleware('can:sidak.answer')->group(function () {
        Route::post('/inspections/{inspection}/answers', [InspectionApiController::class, 'saveAnswer'])->name('api.inspections.saveAnswer');
        Route::delete('/inspection-photos/{photo}', [InspectionApiController::class, 'destroyAnswerPhoto'])->name('api.inspections.destroyAnswerPhoto');
        Route::post('/inspections/{inspection}/extra-photos', [InspectionApiController::class, 'storeExtraPhoto'])->name('api.inspections.storeExtraPhoto');
        Route::delete('/inspection-extra-photos/{photo}', [InspectionApiController::class, 'destroyExtraPhoto'])->name('api.inspections.destroyExtraPhoto');
        Route::patch('/inspections/{inspection}/notes', [InspectionApiController::class, 'updateNotes'])->name('api.inspections.updateNotes');
        Route::post('/inspections/{inspection}/complete', [InspectionApiController::class, 'complete'])->name('api.inspections.complete');
    });

    Route::middleware('can:permits.inspect')->prefix('security')->group(function () {
        Route::get('/permits', [SecurityPermitApiController::class, 'index'])->name('api.security.permits.index');
        Route::get('/permits/{permit}', [SecurityPermitApiController::class, 'show'])->name('api.security.permits.show');
        Route::post('/permits/{permit}/complete', [SecurityPermitApiController::class, 'complete'])->name('api.security.permits.complete');
        Route::post('/permits/{permit}/ktp', [SecurityPermitApiController::class, 'uploadKtp'])->name('api.security.ktp.store');
        Route::delete('/ktp-photos/{photo}', [SecurityPermitApiController::class, 'deleteKtp'])->name('api.security.ktp.destroy');
        Route::post('/workers/{worker}/toggle', [SecurityPermitApiController::class, 'toggleWorker'])->name('api.security.workers.toggle');
        Route::post('/workers/{worker}/note', [SecurityPermitApiController::class, 'updateWorkerNote'])->name('api.security.workers.note');
        Route::post('/goods/{good}/verify', [SecurityPermitApiController::class, 'verifyGood'])->name('api.security.goods.verify');
    });
});
