<?php

use Illuminate\Foundation\DevCommands;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Tenancy pakai port 8001 (koperasi-app pakai 8000/5173).
// Default framework: serve port 8000.
// DevCommands::artisan('serve --host=127.0.0.1 --port=8000', 'server');
DevCommands::artisan('serve --host=127.0.0.1 --port=8001', 'server');
