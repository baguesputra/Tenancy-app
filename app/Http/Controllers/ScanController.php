<?php

namespace App\Http\Controllers;

use App\Models\PermitRequest;
use App\Models\ScannableCode;
use App\Models\Unit;
use App\Services\InspectionService;
use App\Services\InspectionSessionService;
use Illuminate\Http\Request;

class ScanController extends Controller
{
    public function resolve(string $token, Request $request)
    {
        $code = ScannableCode::where('token', $token)->first();
        abort_unless($code, 404, 'QR code tidak dikenali.');

        $webUser = $request->user('web');
        $tenantUser = $request->user('tenant');

        if (! $webUser && ! $tenantUser) {
            session(['scan_redirect_token' => $token]);
            return redirect()->route('login')
                ->with('info', 'Silakan login terlebih dahulu untuk melanjutkan.');
        }

        return match ($code->scannable_type) {
            Unit::class => $this->resolveUnit($code, $webUser, $tenantUser),
            PermitRequest::class => $this->resolvePermit($code, $webUser, $tenantUser),
            default => abort(404),
        };
    }

    private function resolveUnit(ScannableCode $code, $webUser, $tenantUser)
    {
        $unit = Unit::find($code->scannable_id);
        abort_unless($unit, 404, 'Unit tidak ditemukan.');

        // Staff toko scan QR unit → masuk ke Surat Izin mereka sendiri
        if ($tenantUser) {
            return redirect()->route('tenant-portal.permits.index');
        }

        // Staff mall dengan izin Sidak → langsung masuk alur checklist
        if ($webUser->can('sidak.create')) {
            $tenant = $unit->activeTenancy?->tenant;

            if (! $tenant) {
                return redirect()->route('units.index')
                    ->with('success', "Unit {$unit->unit_code} belum memiliki tenant aktif.");
            }

            $sessionService = app(InspectionSessionService::class);
            $inspectionService = app(InspectionService::class);

            $session = $sessionService->getOrCreateActiveSession($webUser);
            $inspection = $inspectionService->addInspection($session, $tenant);

            return redirect()->route('inspections.show', $inspection->id);
        }

        // Staff mall tanpa izin Sidak → info unit read-only
        if ($webUser->can('units.view')) {
            return redirect()->route('units.index')
                ->with('success', "Unit {$unit->unit_code} — Tenant: " . ($unit->activeTenancy?->tenant?->name ?? 'Kosong'));
        }

        return redirect()->route('dashboard');
    }

    private function resolvePermit(ScannableCode $code, $webUser, $tenantUser)
    {
        $permit = PermitRequest::find($code->scannable_id);
        abort_unless($permit, 404, 'Surat izin tidak ditemukan.');

        if ($tenantUser) {
            abort_unless($permit->tenant_id === $tenantUser->tenant_id, 403);
            return redirect()->route('tenant-portal.permits.show', $permit->id);
        }

        if ($webUser) {
            return redirect()->route('permit-requests.show', $permit->id);
        }

        abort(403);
    }
}