<?php

namespace App\Http\Controllers;

use App\Models\InspectionFinding;
use App\Models\Tenant;
use App\Services\InspectionFindingService;
use App\Services\TenantScopeService;
use Illuminate\Http\Request;

class InspectionFindingController extends Controller
{
    public function __construct(
        private TenantScopeService $tenantScope,
        private InspectionFindingService $findings,
    ) {}

    public function update(InspectionFinding $finding, Request $request)
    {
        $this->authorizeAccess($finding, $request);

        $validated = $request->validate([
            'severity' => 'required|in:'.implode(',', InspectionFinding::SEVERITIES),
            'due_date' => 'nullable|date',
            'action_required' => 'nullable|string|max:2000',
        ]);

        $this->findings->updateDetails($finding, $validated);

        return back()->with('success', 'Detail tindak lanjut temuan diperbarui.');
    }

    public function resolve(InspectionFinding $finding, Request $request)
    {
        $this->authorizeAccess($finding, $request);

        $validated = $request->validate([
            'resolution_note' => 'required|string|max:2000',
            'resolved_by_name' => 'nullable|string|max:120',
            'photo' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $this->findings->submitResolution(
            $finding,
            $validated['resolution_note'],
            $validated['resolved_by_name'] ?: $request->user()->name,
            $request->file('photo'),
            true
        );

        return back()->with('success', 'Bukti perbaikan dicatat dan menunggu verifikasi.');
    }

    public function verify(InspectionFinding $finding, Request $request)
    {
        $this->authorizeAccess($finding, $request);

        $validated = $request->validate([
            'verification_note' => 'nullable|string|max:2000',
        ]);

        $this->findings->verify($finding, $request->user(), $validated['verification_note'] ?? null);

        return back()->with('success', 'Temuan CAPA telah diverifikasi dan ditutup.');
    }

    public function reject(InspectionFinding $finding, Request $request)
    {
        $this->authorizeAccess($finding, $request);

        $validated = $request->validate([
            'verification_note' => 'required|string|max:2000',
        ]);

        $this->findings->reject($finding, $request->user(), $validated['verification_note']);

        return back()->with('success', 'Perbaikan ditolak dan dikembalikan untuk ditindaklanjuti.');
    }

    private function authorizeAccess(InspectionFinding $finding, Request $request): void
    {
        $user = $request->user();
        abort_unless((int) $finding->branch_id === (int) $user->branch_id || $user->canViewAllBranches(), 403);

        if ($this->tenantScope->hasAnyScope($user) && $finding->tenant_id) {
            $allowed = Tenant::query()->whereKey($finding->tenant_id);
            $this->tenantScope->applyView($allowed, $user);
            abort_unless($allowed->exists(), 403);
        }
    }
}
