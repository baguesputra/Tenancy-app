<?php

namespace App\Http\Middleware;

use App\Services\BreadcrumbService;
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

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $webUser ? fn () => [
                    'id' => $webUser->id,
                    'name' => $webUser->name,
                    'email' => $webUser->email,
                    'photo_url' => $webUser->photo_url,
                    'branch_id' => $webUser->branch_id,
                    'branch' => $webUser->branch ? ['id' => $webUser->branch->id, 'name' => $webUser->branch->name] : null,
                    'permissions' => $webUser->getAllPermissions()->pluck('name'),
                    'roles' => $webUser->getRoleNames(),
                ] : null,
            ],
            'notifications' => fn () => $webUser
                ? $webUser->unreadNotifications()->latest()->take(5)->get()->map(fn ($n) => [
                    'id' => $n->id,
                    'title' => $n->data['title'],
                    'message' => $n->data['message'],
                    'url' => $n->data['url'],
                    'created_at' => $n->created_at->diffForHumans(),
                ])
                : [],
            'unreadNotificationsCount' => fn () => $webUser?->unreadNotifications()->count() ?? 0,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'answer' => fn () => $request->session()->get('answer'),
                'credl' => fn () => $request->session()->get('credl'),
            ],
            'breadcrumbs' => fn () => BreadcrumbService::forRequest($request),
        ];
    }
}
