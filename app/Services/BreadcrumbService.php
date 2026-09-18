<?php

namespace App\Services;

use Illuminate\Http\Request;

class BreadcrumbService
{
    public static function forRequest(Request $request): array
    {
        $route = $request->route();
        $name = $route?->getName();

        $webHome = ['label' => 'Beranda', 'href' => '/dashboard'];
        $portalHome = ['label' => 'Beranda', 'href' => '/portal/dashboard'];

        $crumbs = match ($name) {
            'dashboard' => [$webHome],
            'tenants.index' => [$webHome, self::item('Master Tenant', '/tenants')],
            'units.index' => [$webHome, self::item('Master Unit', '/units')],
            'units.qr', 'units.qr.bulk' => [$webHome, self::item('Master Unit', '/units'), self::item('QR Unit')],
            'tenancies.index' => [$webHome, self::item('Master Tenancy', '/tenancies')],
            'tenant-categories.index' => [$webHome, self::item('Kategori Tenant', '/tenant-categories')],
            'product-categories.index' => [$webHome, self::item('Kategori Produk', '/product-categories')],
            'sessions.index' => [$webHome, self::item('Sesi Sidak', '/inspection-sessions')],
            'sessions.current' => [$webHome, self::item('Sesi Sidak', '/inspection-sessions'), self::item('Sesi Berjalan')],
            'sessions.show' => [$webHome, self::item('Sesi Sidak', '/inspection-sessions'), self::item(self::sessionLabel($request))],
            'inspections.show' => [$webHome, self::item('Sesi Sidak', '/inspection-sessions'), ...self::inspectionParents($request), self::item(self::inspectionLabel($request))],
            'permit-requests.index' => [$webHome, self::item('Surat Izin', '/permit-requests')],
            'permit-requests.create' => [$webHome, self::item('Surat Izin', '/permit-requests'), self::item('Tambah')],
            'permit-requests.show' => [$webHome, self::item('Surat Izin', '/permit-requests'), self::item(self::permitLabel($request, 'permitRequest'))],
            'settings.users.index' => [$webHome, self::item('Pengaturan', '/settings/users'), self::item('Manajemen User')],
            'settings.tenant-accounts.index' => [$webHome, self::item('Pengaturan', '/settings/users'), self::item('Akun Portal Tenant')],
            'settings.access-control.index' => [$webHome, self::item('Pengaturan', '/settings/users'), self::item('Hak Akses')],
            'password.change.form' => [$webHome, self::item('Ubah Password')],
            'tenant-portal.dashboard' => [$portalHome],
            'tenant-portal.permits.index' => [$portalHome, self::item('Surat Izin', '/portal/permits')],
            'tenant-portal.permits.create' => [$portalHome, self::item('Surat Izin', '/portal/permits'), self::item('Tambah')],
            'tenant-portal.permits.show' => [$portalHome, self::item('Surat Izin', '/portal/permits'), self::item(self::permitLabel($request, 'permit'))],
            default => [$webHome, ...self::fallback($request)],
        };

        return array_values($crumbs);
    }

    private static function item(string $label, ?string $href = null): array
    {
        return ['label' => $label, 'href' => $href];
    }

    private static function permitLabel(Request $request, string $param): string
    {
        $permit = $request->route()?->parameter($param);

        return is_object($permit) ? ($permit->permit_number ?? 'Detail') : 'Detail';
    }

    private static function sessionLabel(Request $request): string
    {
        $session = $request->route()?->parameter('session');

        if (is_object($session) && $session->started_at) {
            return 'Sesi '.$session->started_at->format('d M Y');
        }

        return 'Detail Sesi';
    }

    private static function inspectionLabel(Request $request): string
    {
        $inspection = $request->route()?->parameter('inspection');

        if (is_object($inspection)) {
            try {
                return $inspection->tenant?->name ?? 'Detail Inspeksi';
            } catch (\Throwable) {
                return 'Detail Inspeksi';
            }
        }

        return 'Detail Inspeksi';
    }

    private static function inspectionParents(Request $request): array
    {
        $inspection = $request->route()?->parameter('inspection');

        if (! is_object($inspection)) {
            return [];
        }

        try {
            $sessionId = $inspection->inspection_session_id;
            $startedAt = $inspection->session?->started_at;
            $label = $startedAt ? 'Sesi '.$startedAt->format('d M Y') : 'Sesi Berjalan';

            return $sessionId ? [self::item($label, '/inspection-sessions/'.$sessionId)] : [];
        } catch (\Throwable) {
            return [];
        }
    }

    private static function fallback(Request $request): array
    {
        $segments = collect(explode('/', trim($request->path(), '/')))
            ->reject(fn ($s) => $s === '' || is_numeric($s) || preg_match('/^[a-f0-9-]{36}$/', $s))
            ->map(fn ($s) => self::item(ucwords(str_replace(['-', '_'], ' ', $s))))
            ->values()
            ->all();

        return $segments === [] ? [] : $segments;
    }
}
