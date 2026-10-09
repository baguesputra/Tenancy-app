<?php

namespace Tests;

use App\Models\GateSyncSetting;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Cache;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Buang sisa lock/unik cache antar test (array store menumpuk selama satu proses).
        Cache::flush();

        // Memo statis GateSyncSetting melekat selama satu proses — reset antar test.
        (new \ReflectionProperty(GateSyncSetting::class, 'memo'))->setValue(null, null);
    }
}
