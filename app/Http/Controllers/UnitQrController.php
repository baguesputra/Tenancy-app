<?php

namespace App\Http\Controllers;

use App\Models\ScannableCode;
use App\Models\Unit;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UnitQrController extends Controller
{
    public function single($id)
    {
        $unit = Unit::with(['branch', 'activeTenancy.tenant', 'scannableCode'])->findOrFail($id);
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
                    ->orWhere('block', 'like', "%{$request->search}%");
            }))
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
        foreach ($units as $unit) {
            $path = $unit->activeTenancy?->tenant?->logo_path;
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
    }

    private function ensureCodes($units): void
    {
        foreach ($units as $unit) {
            if ($unit->scannableCode) {
                continue;
            }

            $unit->setRelation('scannableCode', ScannableCode::create([
                'token' => (string) Str::uuid(),
                'scannable_type' => Unit::class,
                'scannable_id' => $unit->id,
            ]));
        }
    }
}
