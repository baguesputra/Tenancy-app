<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class SystemNotification extends Notification
{
    public function __construct(
        public string $title,
        public string $message,
        public string $url,
        public string $icon = 'bell',
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'url' => $this->url,
            'icon' => $this->icon,
        ];
    }
}