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

        $pdf = Pdf::loadView('pdf.unit-qr-label', ['units' => collect([$unit])])
            ->setPaper([0, 0, 320, 480]); // ukuran custom, bisa disesuaikan (dalam points)

        return $pdf->download("QR-Unit-{$unit->unit_code}.pdf");
    }

    public function bulk(Request $request)
    {
        $query = Unit::with(['branch', 'activeTenancy.tenant', 'scannableCode'])->where('is_active', true);

        if (! $request->user()->canViewAllBranches()) {
            $query->where('branch_id', $request->user()->branch_id);
        }

        // ponytail: cap 50 per PDF, queue jika butuh semua sekaligus
        $units = $query->orderBy('unit_code')->limit(50)->get();
        $this->ensureCodes($units);

        $pdf = Pdf::loadView('pdf.unit-qr-label', ['units' => $units])
            ->setPaper([0, 0, 320, 480]);

        return $pdf->download('QR-Semua-Unit.pdf');
    }

    private function ensureCodes($units): void
    {
        foreach ($units as $unit) {
            if ($unit->scannableCode) continue;

            $unit->setRelation('scannableCode', ScannableCode::create([
                'token' => (string) Str::uuid(),
                'scannable_type' => Unit::class,
                'scannable_id' => $unit->id,
            ]));
        }
    }
}
