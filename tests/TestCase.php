<?php

namespace Tests;

use App\Models\GateSyncSetting;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Cache;

abstract class TestCase extends BaseTestCase
{
    /**
     * Guard keras: config cache membuat Laravel mengabaikan DB_CONNECTION=sqlite
     * dari phpunit.xml, sehingga RefreshDatabase menjalankan migrate:fresh di
     * database dev. Pernah terjadi 2026-10-30 dan menghapus data lokal.
     * Dicek sebelum aplikasi dibuat supaya tidak ada satu query pun yang jalan.
     */
    public function createApplication()
    {
        $cached = dirname(__DIR__).'/bootstrap/cache/config.php';

        if (is_file($cached)) {
            throw new \RuntimeException(
                "Test dibatalkan: config cache ada di {$cached}. "
                .'Config cache menimpa phpunit.xml, jadi RefreshDatabase bisa menghapus '
                .'database dev. Jalankan `php artisan config:clear` lalu ulangi test.'
            );
        }

        return parent::createApplication();
    }

    protected function setUp(): void
    {
        parent::setUp();

        // Buang sisa lock/unik cache antar test (array store menumpuk selama satu proses).
        Cache::flush();

        // Memo statis GateSyncSetting melekat selama satu proses — reset antar test.
        (new \ReflectionProperty(GateSyncSetting::class, 'memo'))->setValue(null, null);
    }
}
