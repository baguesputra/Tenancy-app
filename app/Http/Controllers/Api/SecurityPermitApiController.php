<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\PermitGood;
use App\Models\PermitKtpPhoto;
use App\Models\PermitRequest;
use App\Models\PermitWorker;
use App\Services\ApprovalService;
use App\Services\NotificationService;
use App\Services\PermitRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class SecurityPermitApiController extends Controller
{
    public function __construct(
        private ApprovalService $approvalService,
        private PermitRequestService $permitService,
        private NotificationService $notificationService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->ensureSecurity($request);

        $permits = PermitRequest::query()
            ->where('branch_id', $request->user()->branch_id)
            ->whereHas('approvals', fn ($q) => $q->where('step_key', 'security')->where('status', 'pending'))
            ->latest('request_date')
            ->get(['id', 'permit_number', 'store_name_snapshot', 'floor_snapshot', 'unit_number_snapshot', 'work_start_date', 'work_end_date', 'worker_count', 'activity_types']);

        return response()->json([
            'permits' => $permits->map(fn ($p) => [
                'id' => $p->id,
                'permit_number' => $p->permit_number,
                'store_name' => $p->store_name_snapshot,
                'location' => collect([$p->floor_snapshot, $p->unit_number_snapshot])->filter()->implode(' · ') ?: null,
                'work_start_date' => $p->work_start_date?->toDateString(),
                'work_end_date' => $p->work_end_date?->toDateString(),
                'worker_count' => $p->worker_count,
                'activity_types' => $p->activity_types,
            ])->values(),
        ]);
    }

    public function show(PermitRequest $permit, Request $request): JsonResponse
    {
        $this->authorizeSecurityAction($permit, $request);
        $permit->load(['workers', 'goods', 'ktpPhotos']);

        return response()->json(['permit' => $this->permitPayload($permit)]);
    }

    public function toggleWorker(PermitWorker $worker, Request $request): JsonResponse
    {
        $this->authorizeSecurityAction($worker->permitRequest, $request);

        $worker->update(['is_present' => ! $worker->is_present, 'checked_at' => now()]);

        return response()->json(['worker' => $this->workerPayload($worker)]);
    }

    public function updateWorkerNote(PermitWorker $worker, Request $request): JsonResponse
    {
        $this->authorizeSecurityAction($worker->permitRequest, $request);

        $validated = $request->validate(['mismatch_note' => 'nullable|string']);
        $worker->update(['mismatch_note' => $validated['mismatch_note'] ?? null]);

        return response()->json(['worker' => $this->workerPayload($worker)]);
    }

    public function verifyGood(PermitGood $good, Request $request): JsonResponse
    {
        $this->authorizeSecurityAction($good->permitRequest, $request);

        if ($good->is_verified) {
            $validated = $request->validate(['mismatch_note' => 'nullable|string']);
            if ($request->hasFile('photo')) {
                throw ValidationException::withMessages(['photo' => 'Foto sudah terkunci dan tidak dapat diganti.']);
            }
            $good->update(['mismatch_note' => $validated['mismatch_note'] ?? null]);

            return response()->json(['good' => $this->goodPayload($good)]);
        }

        $validated = $request->validate([
            'photo' => 'required|image|max:5120',
            'mismatch_note' => 'nullable|string',
        ]);

        $good->update([
            'is_verified' => true,
            'checked_at' => now(),
            'photo_path' => $request->file('photo')->store('permit-goods', 'public'),
            'mismatch_note' => $validated['mismatch_note'] ?? null,
        ]);

        return response()->json(['good' => $this->goodPayload($good)]);
    }

    public function uploadKtp(PermitRequest $permit, Request $request): JsonResponse
    {
        $this->authorizeSecurityAction($permit, $request);

        $validated = $request->validate([
            'photo' => 'required|image|max:5120',
            'mismatch_note' => 'nullable|string',
        ]);

        $photo = $permit->ktpPhotos()->create([
            'photo_path' => $request->file('photo')->store('permit-ktp', 'public'),
            'mismatch_note' => $validated['mismatch_note'] ?? null,
            'checked_at' => now(),
        ]);

        return response()->json(['ktp_photo' => $this->ktpPayload($photo)], 201);
    }

    public function deleteKtp(PermitKtpPhoto $photo, Request $request): JsonResponse
    {
        $this->authorizeSecurityAction($photo->permitRequest, $request);

        Storage::disk('public')->delete($photo->photo_path);
        $photo->delete();

        return response()->json(['deleted' => true]);
    }

    public function complete(PermitRequest $permit, Request $request): JsonResponse
    {
        $this->authorizeSecurityAction($permit, $request);

        if ($permit->workers()->exists()) {
            $workersDone = $permit->workers()->where('is_present', false)->doesntExist();
        } else {
            $workersDone = $permit->worker_count
                ? $permit->ktpPhotos()->count() >= $permit->worker_count
                : true;
        }
        $goodsDone = $permit->goods()->where('is_verified', false)->doesntExist();

        if (! $workersDone || ! $goodsDone) {
            throw ValidationException::withMessages([
                'security' => $workersDone
                    ? 'Semua barang harus dicek dulu sebelum menyelesaikan pemeriksaan.'
                    : 'Foto KTP kurang — jumlah foto minimal sama dengan jumlah pekerja.',
            ]);
        }

        $hasMismatch = $permit->workers()->whereNotNull('mismatch_note')->exists()
            || $permit->goods()->whereNotNull('mismatch_note')->exists()
            || $permit->ktpPhotos()->whereNotNull('mismatch_note')->exists();

        $step = $permit->approvals()->where('step_key', 'security')->first();
        abort_if(! $step, 422, 'Tahap Security tidak ditemukan untuk izin ini.');
        $this->approvalService->approve($step, $request->user());

        if ($hasMismatch) {
            $permit->update(['is_flagged' => true]);
        }

        $this->permitService->syncStatus($permit);

        $requester = $permit->requestedBy;
        if ($requester instanceof \App\Models\User) {
            $this->notificationService->notify(
                $requester,
                'Surat Izin Selesai',
                "{$permit->permit_number} — {$permit->store_name_snapshot} telah selesai diproses.",
                "/permit-requests/{$permit->id}",
                'check'
            );
        }

        return response()->json([
            'permit' => [
                'id' => $permit->id,
                'status' => $permit->fresh()->status,
                'is_flagged' => $hasMismatch || (bool) $permit->is_flagged,
            ],
            'message' => 'Pemeriksaan fisik selesai.'.($hasMismatch ? ' Ada catatan ketidaksesuaian yang ditandai.' : ''),
        ]);
    }

    private function ensureSecurity(Request $request): void
    {
        $deptId = Cache::remember('dept.id.Security', 3600, fn () => Department::where('name', 'Security')->value('id'));
        abort_unless($request->user()->department_id === $deptId, 403, 'Hanya staff Security yang bisa melakukan aksi ini.');
    }

    private function authorizeSecurityAction(PermitRequest $permit, Request $request)
    {
        $this->ensureSecurity($request);
        abort_if($permit->status === 'rejected', 403, 'Permohonan ini sudah ditolak.');

        $step = $permit->approvals()->where('step_key', 'security')->first();
        abort_unless(
            $step && $step->status === 'pending',
            403,
            'Belum waktunya cek fisik — approval sebelumnya belum selesai, atau tahap ini sudah diproses.'
        );

        return $step;
    }

    private function permitPayload(PermitRequest $permit): array
    {
        return [
            'id' => $permit->id,
            'permit_number' => $permit->permit_number,
            'store_name' => $permit->store_name_snapshot,
            'location' => collect([$permit->floor_snapshot, $permit->unit_number_snapshot])->filter()->implode(' · ') ?: null,
            'work_start_date' => $permit->work_start_date?->toDateString(),
            'work_end_date' => $permit->work_end_date?->toDateString(),
            'worker_count' => $permit->worker_count,
            'activity_types' => $permit->activity_types,
            'workers' => $permit->workers->map(fn ($w) => $this->workerPayload($w))->values(),
            'goods' => $permit->goods->map(fn ($g) => $this->goodPayload($g))->values(),
            'ktp_photos' => $permit->ktpPhotos->map(fn ($p) => $this->ktpPayload($p))->values(),
        ];
    }

    private function workerPayload(PermitWorker $worker): array
    {
        return [
            'id' => $worker->id,
            'name' => $worker->name,
            'is_present' => (bool) $worker->is_present,
            'mismatch_note' => $worker->mismatch_note,
            'checked_at' => $worker->checked_at,
        ];
    }

    private function goodPayload(PermitGood $good): array
    {
        return [
            'id' => $good->id,
            'description' => $good->description,
            'quantity_note' => $good->quantity_note,
            'is_verified' => (bool) $good->is_verified,
            'photo_url' => $good->photo_url,
            'mismatch_note' => $good->mismatch_note,
            'checked_at' => $good->checked_at,
        ];
    }

    private function ktpPayload(PermitKtpPhoto $photo): array
    {
        return [
            'id' => $photo->id,
            'photo_url' => $photo->photo_url,
            'mismatch_note' => $photo->mismatch_note,
            'checked_at' => $photo->checked_at,
        ];
    }
}
