<?php

namespace App\Services\SSO;

use Carbon\Carbon;
use LightSaml\Validator\Model\Assertion\AssertionTimeValidator;
use SocialiteProviders\Saml2\Provider as Saml2Provider;

class PerusahaanProvider extends Saml2Provider
{
    public static function additionalConfigKeys(): array
    {
        return array_merge(parent::additionalConfigKeys(), ['validation']);
    }

    protected function validateTimestamps(): void
    {
        (new AssertionTimeValidator)->validateTimeRestrictions(
            $this->getFirstAssertion(),
            Carbon::now()->timestamp,
            (int) config('services.perusahaan.validation.clock_skew', 600)
        );
    }
}
