<?php

return [

    'enabled' => env('PERMIT_TIME_LOCK_ENABLED', false),

    'lock_start' => env('PERMIT_TIME_LOCK_START', '22:50'),

    'lock_end' => env('PERMIT_TIME_LOCK_END', '09:50'),

    'timezone' => env('PERMIT_TIME_LOCK_TIMEZONE', 'Asia/Makassar'),

    'excluded_roles' => ['super_admin', 'admin'],

];