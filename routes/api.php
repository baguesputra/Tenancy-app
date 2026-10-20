<?php

use App\Http\Controllers\Api\HcisEmployeeSyncController;
use App\Http\Middleware\VerifyHcisSignature;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/v1/ingest/employee-sync', HcisEmployeeSyncController::class)
    ->middleware(VerifyHcisSignature::class)
    ->name('hcis.employee-sync');
