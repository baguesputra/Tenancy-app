<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Pintu masuk Pengaturan: hub berisi modul yang boleh diakses user. */
class SettingsHomeController extends Controller
{
    public function show(Request $request): Response
    {
        abort_unless(
            $request->user()->canAny(['users.manage', 'settings.access', 'documents.manage']),
            403
        );

        return Inertia::render('Settings/Home');
    }
}
