<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\HcisEmployeeSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HcisEmployeeSyncController extends Controller
{
    public function __invoke(Request $request, HcisEmployeeSyncService $sinkron): JsonResponse
    {
        $validated = $request->validate([
            'event' => 'required|in:employee.created,employee.updated,employee.deactivated',
            'timestamp' => 'nullable|string',
            'data' => 'required|array',
            'data.id' => 'required|uuid',
            'data.name' => 'required|string|max:255',
            'data.email' => 'required|email|max:255',
            'data.nik' => 'nullable|string|max:50',
            'data.phone' => 'nullable|string|max:50',
            'data.photo' => 'nullable|string|max:1000',
            'data.nickname' => 'nullable|string|max:100',
            'data.callsign' => 'nullable|string|max:50',
            'data.is_active' => 'nullable|boolean',
        ]);

        $hasil = $sinkron->proses($validated);
        $user = $hasil['user'];

        return response()->json([
            'status' => 'success',
            'message' => match ($hasil['action']) {
                'created' => 'User created successfully via HCIS sync.',
                'updated' => 'User updated successfully via HCIS sync.',
                'deactivated' => 'User deactivated successfully via HCIS sync.',
                default => 'User not found, deactivation skipped.',
            },
            'data' => [
                'id' => $validated['data']['id'],
                'nik' => $validated['data']['nik'] ?? null,
                'email' => $validated['data']['email'],
                'is_active' => (bool) ($user?->is_active ?? false),
                'action' => $hasil['action'],
            ],
        ]);
    }
}
