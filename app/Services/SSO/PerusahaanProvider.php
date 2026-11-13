<?php

namespace App\Services\SSO;

use App\Models\MobileSsoTransaction;
use Carbon\Carbon;
use LightSaml\Validator\Model\Assertion\AssertionTimeValidator;
use SocialiteProviders\Saml2\Provider as Saml2Provider;

class PerusahaanProvider extends Saml2Provider
{
    protected function getState(): string
    {
        $relayState = $this->request->session()->pull('mobile_sso_relay_state');

        return $relayState ?? parent::getState();
    }

    protected function hasInvalidState(): bool
    {
        $relayState = $this->messageContext->getMessage()->getRelayState();
        if (is_string($relayState) && MobileSsoTransaction::where('relay_state', $relayState)
            ->whereNull('used_at')->where('expires_at', '>', now())->exists()) {
            return false;
        }

        return parent::hasInvalidState();
    }

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
