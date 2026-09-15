<?php

namespace App\Http\Controllers;

use App\Models\ScannableCode;
use App\Models\Unit;
use App\Models\PermitRequest;
use App\Models\InspectionSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;

class ScanController extends Controller
{
    public function __invoke(Request $request, string $token)
    {
        $scannable = ScannableCode::with('scannable')
            ->where('token', $token)
            ->firstOrFail();

        $model = $scannable->scannable;
        if (! $model) {
            abort(404, 'Scannable target not found');
        }

        // Guest → login with intended URL
        if (! Auth::check()) {
            $request->session()->put('url.intended', url()->current());
            $request->session()->put('scan_token', $token);
            return Redirect::guest('login');
        }

        $user = Auth::user();

        // Polymorphic dispatch
        return match (get_class($model)) {
            Unit::class => $this->handleUnit($model, $user),
            PermitRequest::class => $this->handlePermit($model, $user),
            default => abort(400, 'Unsupported scannable type'),
        };
    }

    protected function handleUnit(Unit $unit, \App\Models\User $user)
    {
        // 1️⃣ Tenant staff (has a Tenant linked to this unit via activeTenancy)
        $activeTenancy = $unit->activeTenancy;
        if ($activeTenancy && $activeTenancy->tenant_id && $user->tenant_id === $activeTenancy->tenant_id) {
            // Redirect to portal permit creation (or list)
            return redirect()->route('portal.permits.create');
        }

        // 2️⃣ Mall staff with inspection permission
        if ($user->can('inspect', $unit)) {
            $session = InspectionSession::getOrCreateActiveSession($activeTenancy);
            $inspection = $session->addInspection($activeTenancy->tenant);
            return redirect()->route('inspections.show', $inspection);
        }

        // 3️⃣ Fallback – read‑only unit/tenant detail
        return redirect()->route('units.show', $unit);
    }

    protected function handlePermit(PermitRequest $permit, \App\Models\User $user)
    {
        // Permit visibility: requester, admin, or assigned approver
        if ($user->can('view', $permit)) {
            return redirect()->route('permit-requests.show', $permit);
        }
        abort(403, 'Unauthorized to view this permit');
    }
}
