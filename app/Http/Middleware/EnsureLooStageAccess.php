<?php

namespace App\Http\Middleware;

use App\Models\Loo;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate per stage: section hanya boleh diisi saat LOO berada di stage yang
 * sama. Mencegah divisi mengisi stage lain (dan submit yang bikin transisi
 * lompat).
 */
class EnsureLooStageAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $loo = $request->route('loo');
        $key = $request->route('key');

        abort_unless($loo instanceof Loo && is_string($key), 404);

        $config = config("loo_sections.{$key}");
        abort_unless($config, 404);

        abort_unless(
            $config['stage'] === $loo->current_stage,
            403,
            "Section ini hanya bisa diisi pada stage {$config['stage']}."
        );

        return $next($request);
    }
}
