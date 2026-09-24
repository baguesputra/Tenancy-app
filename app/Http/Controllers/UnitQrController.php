<?php

namespace App\Http\Controllers;

use App\Models\ScannableCode;
use App\Models\Unit;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UnitQrController extends Controller
{
    public function single($id, Request $request)
    {
        $unit = Unit::with(['branch', 'activeTenancy.tenant', 'scannableCode'])->findOrFail($id);
        $user = $request->user();
        abort_unless($unit->branch_id === $user->branch_id || $user->canViewAllBranches(), 403);
        $this->ensureCodes(collect([$unit]));

        $pdf = Pdf::loadView('pdf.unit-qr-label', ['units' => collect([$unit]), 'logos' => $this->logos(collect([$unit]))])
            ->setPaper('a4');

        return $pdf->download("QR-Unit-{$unit->unit_code}.pdf");
    }

    public function bulk(Request $request)
    {
        $query = Unit::with(['branch', 'activeTenancy.tenant', 'scannableCode'])
            ->when($request->search, fn ($q) => $q->where(function ($qq) use ($request) {
                $qq->where('unit_code', 'like', "%{$request->search}%")
                    ->orWhere('floor', 'like', "%{$request->search}%")
                    ->orWhere('block', 'like', "%{$request->search}%")
                    ->orWhere('unit_number', 'like', "%{$request->search}%");
            }))
            ->when($request->floor, fn ($q) => $q->where('floor', $request->floor))
            ->when($request->block, fn ($q) => $q->where('block', $request->block))
            ->when($request->unit_number, fn ($q) => $q->where('unit_number', $request->unit_number))
            ->when($request->status === 'occupied', fn ($q) => $q->whereHas('activeTenancy'))
            ->when($request->status === 'vacant', fn ($q) => $q->whereDoesntHave('activeTenancy')->where('is_active', true))
            ->when($request->status === 'inactive', fn ($q) => $q->where('is_active', false))
            ->when(! $request->status, fn ($q) => $q->where('is_active', true));

        if (! $request->user()->canViewAllBranches()) {
            $query->where('branch_id', $request->user()->branch_id);
        }

        // ponytail: cap 50 per PDF, queue jika butuh semua sekaligus
        $units = $query->orderBy('unit_code')->limit(50)->get();
        $this->ensureCodes($units);

        $pdf = Pdf::loadView('pdf.unit-qr-label', ['units' => $units, 'logos' => $this->logos($units)])
            ->setPaper('a4');

        return $pdf->download('QR-Semua-Unit.pdf');
    }

    private function logos($units): array
    {
        $out = [];
        $paths = [];
        foreach ($units as $unit) {
            $path = $unit->activeTenancy?->tenant?->logo_path;
            if ($path) {
                $paths[$unit->id] = $path;
            }
        }

        return \Cache::remember('unit-qr-logos.'.md5(implode('|', $paths)), 3600, function () use ($units, $paths) {
            $out = [];
            foreach ($units as $unit) {
                $path = $paths[$unit->id] ?? null;
                if ($path && \Storage::disk('public')->exists($path)) {
                    $mime = match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
                        'png' => 'image/png',
                        'webp' => 'image/webp',
                        default => 'image/jpeg',
                    };
                    $out[$unit->id] = 'data:'.$mime.';base64,'.base64_encode(\Storage::disk('public')->get($path));
                }
            }

            return $out;
        });
    }

    private function ensureCodes($units): void
    {
        $missing = $units->filter(fn ($unit) => ! $unit->scannableCode)->values();
        if ($missing->isEmpty()) {
            return;
        }

        $rows = $missing->map(fn ($unit) => [
            'token' => (string) Str::uuid(),
            'scannable_type' => Unit::class,
            'scannable_id' => $unit->id,
            'created_at' => now(),
            'updated_at' => now(),
        ])->all();
        ScannableCode::insert($rows);

        $fresh = ScannableCode::where('scannable_type', Unit::class)
            ->whereIn('scannable_id', $missing->pluck('id')->all())
            ->get()->keyBy('scannable_id');
        foreach ($missing as $unit) {
            if ($code = $fresh->get($unit->id)) {
                $unit->setRelation('scannableCode', $code);
            }
        }
    }
}
