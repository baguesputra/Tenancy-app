<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\StaticDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class StaticDocumentController extends Controller
{
    public const LABELS = [
        'peraturan-fitout' => ['label' => 'Peraturan Pekerja Fit Out', 'trigger' => 'Centang Fit Out / Pull Out'],
        'tata-tertib-lembur' => ['label' => 'Tata Tertib Pekerja Lembur', 'trigger' => 'Centang Lembur'],
        'penitipan-barang' => ['label' => 'Surat Izin Penitipan Barang', 'trigger' => 'Centang Masuk Barang / Fit Out / Pull Out'],
    ];

    public function index()
    {
        $branches = Branch::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);

        $records = StaticDocument::with('uploadedBy:id,name')
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'key' => $d->key,
                'branch_id' => $d->branch_id,
                'original_name' => $d->original_name,
                'size_kb' => round($d->size / 1024),
                'uploaded_by' => $d->uploadedBy?->name,
                'updated_at' => $d->updated_at?->translatedFormat('d M Y, H:i'),
            ])
            ->groupBy(fn ($d) => $d['key'].'|'.($d['branch_id'] ?? 'all'));

        return Inertia::render('Settings/Documents/Index', [
            'docs' => collect(self::LABELS)->map(fn ($meta, $key) => ['key' => $key, ...$meta])->values(),
            'branches' => $branches,
            'records' => $records,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'key' => 'required|in:'.implode(',', StaticDocument::KEYS),
            'branch_id' => 'nullable|exists:branches,id',
            'file' => 'required|file|mimes:pdf,doc,docx|max:10240',
        ], [
            'file.mimes' => 'File harus PDF, DOC, atau DOCX.',
            'file.max' => 'Ukuran file maksimal 10MB.',
        ]);

        $branchId = $validated['branch_id'] ?? null;

        $doc = StaticDocument::where('key', $validated['key'])
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId), fn ($q) => $q->whereNull('branch_id'))
            ->first();

        if ($doc && $doc->file_path && Storage::disk('local')->exists($doc->file_path)) {
            Storage::disk('local')->delete($doc->file_path);
        }

        $file = $validated['file'];
        $path = $file->store('static-documents', 'local');

        StaticDocument::updateOrCreate(
            ['key' => $validated['key'], 'branch_id' => $branchId],
            [
                'file_path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime' => $file->getClientMimeType(),
                'size' => $file->getSize(),
                'uploaded_by' => $request->user()->id,
            ]
        );

        return back()->with('success', 'Dokumen berhasil diupload.');
    }
}
