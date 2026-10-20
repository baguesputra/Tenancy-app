<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyHcisSignature
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = (string) config('services.hcis.webhook_secret');

        if ($secret === '') {
            return response()->json([
                'status' => 'error',
                'message' => 'Webhook secret is not configured.',
            ], 503);
        }

        $signature = (string) $request->header('X-HCIS-Signature');
        $expected = hash_hmac('sha256', $request->getContent(), $secret);

        if ($signature === '' || ! hash_equals($expected, $signature)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid webhook signature.',
            ], 401);
        }

        return $next($request);
    }
}
