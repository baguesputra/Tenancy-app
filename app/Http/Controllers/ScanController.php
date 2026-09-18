<?php

namespace App\Http\Controllers;

use App\Models\PermitRequest;
use App\Models\ScannableCode;
use App\Models\Unit;
use App\Services\InspectionService;
use App\Services\InspectionSessionService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ScanController extends Controller
{
    public function __invoke(
        Request $request,
        string $token,
        InspectionSessionService $sessions,
        InspectionService $inspections,
    ) {
        $scannable = ScannableCode::with('scannable')
            ->where('token', $token)
            ->firstOrFail();

        $model = $scannable->scannable;
        if (! $model) {
            abort(404, 'Scannable target not found');
        }

        $webUser = $request->user('web');
        $tenantUser = $request->user('tenant');

        if (! $webUser && ! $tenantUser) {
            $request->session()->put('scan_redirect_token', $token);

            return Inertia::render('Scan/ChooseLogin', ['token' => $token]);
        }

        return match (get_class($model)) {
            Unit::class => $this->handleUnit($model, $webUser, $tenantUser, $sessions, $inspections),
            PermitRequest::class => $this->handlePermit($model, $webUser, $tenantUser),
            default => abort(400, 'Unsupported scannable type'),
        };
    }

    private function handleUnit(
        Unit $unit,
        $webUser,
        $tenantUser,
        InspectionSessionService $sessions,
        InspectionService $inspections,
    ) {
        $unit->loadMissing('activeTenancy.tenant');

        if ($tenantUser) {
            $tenancy = $unit->activeTenancy;
            if ($tenancy && (string) $tenancy->tenant_id === (string) $tenantUser->tenant_id) {
                return redirect()->route('tenant-portal.permits.create');
            }

            return redirect()->route('tenant-portal.permits.index');
        }

        if ($webUser->can('sidak.create')) {
            $tenancy = $unit->activeTenancy;
            abort_unless($tenancy && $tenancy->tenant, 404, 'Unit kosong, tidak ada tenant aktif.');

            $session = $sessions->getOrCreateActiveSession($webUser);
            $inspection = $inspections->addInspection($session, $tenancy->tenant);

            return redirect()->route('inspections.show', $inspection->id);
        }

        return $webUser->can('units.view')
            ? redirect()->route('units.index')
            : redirect()->route('dashboard');
    }

    private function handlePermit(PermitRequest $permit, $webUser, $tenantUser)
    {
        if ($tenantUser) {
            abort_unless((string) $permit->tenant_id === (string) $tenantUser->tenant_id, 403);

            return redirect()->route('tenant-portal.permits.show', $permit->id);
        }

        abort_unless($webUser->can('permits.view'), 403);

        return redirect()->route('permit-requests.show', $permit->id);
    }
}
