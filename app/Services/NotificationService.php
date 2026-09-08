<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\SystemNotification;
use Illuminate\Support\Facades\Notification;

class NotificationService
{
    public function notify($notifiable, string $title, string $message, string $url, string $icon = 'bell'): void
    {
        $notifiable->notify(new SystemNotification($title, $message, $url, $icon));
    }

    public function notifyDepartment(int $departmentId, string $title, string $message, string $url, string $icon = 'bell'): void
    {
        $users = User::where('department_id', $departmentId)->get();

        if ($users->isNotEmpty()) {
            Notification::send($users, new SystemNotification($title, $message, $url, $icon));
        }
    }
}