<?php

namespace App\Http\Controllers;

use App\Models\PermitGood;
use App\Models\PermitWorker;
use Illuminate\Http\Request;

class PermitCheckController extends Controller
{
    public function toggleWorker(PermitWorker $worker, Request $request)
    {
        $worker->update([
            'is_present' => ! $worker->is_present,
            'checked_at' => now(),
        ]);

        return back();
    }

    public function verifyGood(PermitGood $good, Request $request)
    {
        $request->validate(['photo' => 'nullable|image|max:5120']);

        $path = $good->photo_path;
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('permit-goods', 'public');
        }

        $good->update([
            'is_verified' => true,
            'checked_at' => now(),
            'photo_path' => $path,
        ]);

        return back();
    }
}