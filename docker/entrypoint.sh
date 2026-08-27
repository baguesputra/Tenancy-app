#!/bin/bash
set -e

if [ ! -f "composer.json" ]; then
    echo "composer.json tidak ditemukan. Pastikan project sudah ter-clone lengkap."
    sleep infinity
fi

if [ ! -d "vendor" ]; then
    echo ">> Menjalankan composer install..."
    composer install --no-interaction
fi

if [ ! -d "node_modules" ]; then
    echo ">> Menjalankan npm install..."
    npm install
fi

if [ -f ".env" ] && ! grep -q "^APP_KEY=base64" .env; then
    echo ">> Menjalankan php artisan key:generate..."
    php artisan key:generate
fi

echo ">> Menjalankan php artisan serve di 0.0.0.0:8000"
php artisan serve --host=0.0.0.0 --port=8000