<?php

namespace App\Http\Controllers;

use App\Models\Loo;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Inertia\Inertia;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class LooTrackController extends Controller
{
    /**
     * Halaman tracking publik untuk calon tenant (tanpa login).
     * Hanya data umum progres — tanpa nominal, file, kontak, catatan internal.
     */
    public function show(string $token)
    {
        $loo = Loo::where('track_token', $token)->first();
        abort_unless($loo, 404);

        if ($this->expired($loo)) {
            return Inertia::render('Track/Expired', [
                'loo_number' => $loo->loo_number,
                'expires_label' => $loo->track_expires_at?->translatedFormat('d M Y'),
            ])->toResponse(request())->setStatusCode(410);
        }

        $loo->load(['branch:id,name', 'tenant:id,name', 'unit:id,unit_code', 'sections']);

        return Inertia::render('Track/Show', ['track' => $this->payload($loo)]);
    }

    /** Unduh QR link tracking (SVG, untuk cetak). */
    public function qr(Loo $loo, Request $request)
    {
        $this->authorizeManage($loo, $request);
        abort_unless($loo->track_token, 404);

        $svg = (string) QrCode::size(420)->margin(2)->generate($this->url($loo));

        return response($svg, 200, ['Content-Type' => 'image/svg+xml'])
            ->header('Content-Disposition', "attachment; filename=\"tracking-{$loo->loo_number}.svg\"");
    }

    /** Regenerate token (mencabut link lama) + reset masa berlaku. */
    public function regenerate(Loo $loo, Request $request)
    {
        $this->authorizeManage($loo, $request);

        do {
            $token = Str::random(40);
        } while (Loo::where('track_token', $token)->exists());

        $loo->forceFill(['track_token' => $token, 'track_expires_at' => null])->save();

        return back()->with('success', 'Link tracking baru dibuat. Link lama sudah tidak berlaku.');
    }

    /** Perpanjang masa berlaku 1 bulan (bisa berkali-kali). */
    public function extend(Loo $loo, Request $request)
    {
        $this->authorizeManage($loo, $request);

        $base = $loo->track_expires_at && $loo->track_expires_at->isFuture()
            ? $loo->track_expires_at
            : now();
        $loo->forceFill(['track_expires_at' => $base->copy()->addMonth()])->save();

        return back()->with('success', 'Masa berlaku link tracking diperpanjang 1 bulan.');
    }

    /** Data QR + link untuk kartu "Bagikan ke Tenant" di halaman Show. */
    public function trackShare(Loo $loo): array
    {
        if (! $loo->track_token) {
            $loo->forceFill(['track_token' => Str::random(40)])->save();
            $loo->refresh();
        }

        $url = $this->url($loo);

        return [
            'url' => $url,
            'qr' => Cache::remember(
                'loo-track-qr.'.md5($url),
                3600,
                fn () => 'data:image/svg+xml;base64,'.base64_encode((string) QrCode::size(220)->generate($url))
            ),
            'expires_label' => $loo->track_expires_at?->translatedFormat('d M Y'),
            'is_terminal' => in_array($loo->status, ['completed', 'cancelled'], true),
        ];
    }

    private function url(Loo $loo): string
    {
        return route('track.show', $loo->track_token);
    }

    private function expired(Loo $loo): bool
    {
        return in_array($loo->status, ['completed', 'cancelled'], true)
            && $loo->track_expires_at !== null
            && $loo->track_expires_at->isPast();
    }

    private function authorizeManage(Loo $loo, Request $request): void
    {
        $user = $request->user();
        abort_unless($loo->branch_id === $user->branch_id || $user->canViewAllBranches(), 403);
        abort_unless(
            $loo->marketing_id === $user->id || $user->hasAnyRole(['admin', 'super_admin']),
            403,
            'Hanya pembuat LOO atau admin yang bisa mengelola link tracking.'
        );
    }

    private function payload(Loo $loo): array
    {
        $sections = $loo->sections->keyBy('section_key');

        // Hitung kelengkapan keseluruhan TANPA membocorkan struktur internal:
        // 3 kelengkapan divisi + seluruh item checklist operasional.
        $divisionKeys = ['legalitas', 'biaya_termin', 'manajemen_tenant'];
        $filled = 0;
        $total = count($divisionKeys);
        foreach ($divisionKeys as $key) {
            if (($sections->get($key)?->is_submitted ?? false)) {
                $filled++;
            }
        }

        $departments = config('loo_sections.fitout_checklist_pre.fields.0.departments') ?? [];
        foreach (['fitout_checklist_pre', 'fitout_checklist_post'] as $sectionKey) {
            $savedChecklist = $sections->get($sectionKey)?->data['checklist'] ?? [];
            foreach ($departments as $dept) {
                foreach (array_keys($dept['items'] ?? []) as $itemKey) {
                    $total++;
                    $status = $savedChecklist[$dept['key']]['items'][$itemKey]['status'] ?? null;
                    if ($status === 'Ok' || $status === 'Tidak') {
                        $filled++;
                    }
                }
            }
        }

        return [
            'loo_number' => $loo->loo_number,
            'tenant_name' => $loo->tenant?->name ?? $loo->prospective_tenant_name ?? '—',
            'branch_name' => $loo->branch?->name ?? '—',
            'unit_code' => $loo->unit?->unit_code,
            'phase' => $this->phaseLabel($loo->status),
            'is_terminal' => in_array($loo->status, ['completed', 'cancelled'], true),
            'progress_percent' => $total > 0 ? (int) round($filled / $total * 100) : 0,
            'tenant_signed' => $this->tenantSigned($sections),
            'submitted_at' => $this->isoDate($loo->submitted_at ?? $loo->created_at),
            'completed_at' => $this->isoDate($loo->completed_at),
            'expires_label' => $loo->track_expires_at?->translatedFormat('d M Y'),
        ];
    }

    private function isoDate($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_int($value) || (is_string($value) && ctype_digit($value))) {
            return Carbon::createFromTimestamp((int) $value)->toIso8601String();
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->toIso8601String();
        }

        return (string) $value;
    }

    private function phaseLabel(string $status): string
    {
        return match ($status) {
            'draft', 'legal_review', 'accounting_review', 'tenant_mgmt_review' => 'Pengisian Divisi',
            'measurement' => 'Measurement',
            'ba_handover' => 'BA Handover',
            'fitout' => 'Fitout',
            'pre_handover' => 'Pre-Handover',
            'completed' => 'Selesai',
            'cancelled' => 'Dibatalkan',
            default => $status,
        };
    }

    private function tenantSigned($sections): bool
    {
        foreach (['fitout_checklist_pre', 'fitout_checklist_post'] as $key) {
            $row = $sections->get($key);
            if ($row && ! empty($row->data['signature_tenant'])) {
                return true;
            }
        }

        return false;
    }
}
