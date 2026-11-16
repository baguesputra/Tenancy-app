<?php

namespace App\Http\Controllers;

use App\Models\Inspection;
use App\Models\InspectionFinding;
use App\Models\ScannableCode;
use App\Services\InspectionFindingService;
use Illuminate\Http\Request;

class PublicFindingController extends Controller
{
    public function submit(string $token, InspectionFinding $finding, Request $request, InspectionFindingService $findings)
    {
        $scannable = ScannableCode::with('scannable')
            ->where('token', $token)
            ->firstOrFail();

        $inspection = $scannable->scannable;
        abort_unless($inspection instanceof Inspection, 404);

        $inspection->loadMissing('session');
        $done = $inspection->status === 'completed'
            || ($inspection->session && $inspection->session->status === 'completed');
        abort_unless($done, 404);
        abort_unless($finding->inspection_id === $inspection->id, 404);

        $validated = $request->validate([
            'resolved_by_name' => 'required|string|max:120',
            'resolution_note' => 'required|string|max:2000',
            'photo' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ], [
            'resolved_by_name.required' => 'Nama pelapor wajib diisi.',
            'resolution_note.required' => 'Keterangan perbaikan wajib diisi.',
            'photo.required' => 'Foto bukti perbaikan wajib dilampirkan.',
            'photo.image' => 'Bukti perbaikan harus berupa file gambar.',
            'photo.max' => 'Ukuran foto maksimal 5 MB.',
        ]);

        $findings->submitResolution(
            $finding,
            $validated['resolution_note'],
            $validated['resolved_by_name'],
            $request->file('photo'),
            false
        );

        return back()->with('success', 'Bukti perbaikan berhasil dikirim dan menunggu verifikasi manajemen.');
    }
}
