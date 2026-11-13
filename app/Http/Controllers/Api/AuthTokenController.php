<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthTokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'sometimes|string',
            'no_karyawan' => 'sometimes|string',
            'employee_number' => 'sometimes|string',
            'password' => 'required|string',
            'device_name' => 'required|string|max:100',
        ]);

        $identifier = $validated['no_karyawan'] ?? $validated['employee_number'] ?? $validated['email'] ?? null;

        if (! $identifier) {
            throw ValidationException::withMessages([
                'email' => 'Nomor karyawan atau email wajib diisi.',
            ]);
        }

        $user = User::where('employee_number', $identifier)
            ->orWhere('email', $identifier)
            ->first();

        if (! $user || ! $user->is_active || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'Nomor karyawan/email atau kata sandi salah.',
            ]);
        }

        $token = $user->createToken($validated['device_name'])->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'employee_number' => $user->employee_number,
                'branch_id' => $user->branch_id,
            ],
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Token dicabut.']);
    }
}
