<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\PermitScanSetting;
use App\Services\PermitScanWindowService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PermitScanSettingController extends Controller
{
    public function index(PermitScanWindowService $windows)
    {
        $setting = PermitScanSetting::current();

        return Inertia::render('Settings/PermitScan/Index', [
            'setting' => [
                'enabled' => (bool) $setting->enabled,
                'windows' => $setting->windows ?: PermitScanSetting::defaults(),
            ],
            'dayLabels' => PermitScanSetting::DAY_LABELS,
            'summary' => $windows->summary(),
        ]);
    }

    public function update(Request $request, PermitScanWindowService $windows)
    {
        $validated = $request->validate([
            'enabled' => 'boolean',
            'windows' => 'required|array',
            'windows.*.open' => 'required|date_format:H:i',
            'windows.*.close' => 'required|date_format:H:i',
            'windows.*.enabled' => 'boolean',
        ]);

        $settings = array_replace_recursive(PermitScanSetting::defaults(), $validated['windows']);

        PermitScanSetting::simpan([
            'enabled' => (bool) ($validated['enabled'] ?? false),
            'windows' => $settings,
        ]);

        return back()->with('success', 'Jam akses QR disimpan. '.$windows->summary());
    }
}
