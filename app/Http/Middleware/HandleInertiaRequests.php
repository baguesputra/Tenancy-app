<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

   public function share(Request $request): array
    {
        $webUser = $request->user('web');
        $tenantUser = $request->user('tenant');
        $notifiable = $webUser ?? $tenantUser;

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $webUser?->load('branch'),
                'tenantUser' => $tenantUser?->load('tenant'),
            ],
            'notifications' => $notifiable
                ? $notifiable->unreadNotifications()->latest()->take(10)->get()->map(fn ($n) => [
                    'id' => $n->id,
                    'title' => $n->data['title'],
                    'message' => $n->data['message'],
                    'url' => $n->data['url'],
                    'created_at' => $n->created_at->diffForHumans(),
                ])
                : [],
            'unreadNotificationsCount' => $notifiable?->unreadNotifications()->count() ?? 0,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'answer' => fn () => $request->session()->get('answer'),
            ],
        ];
    }
}