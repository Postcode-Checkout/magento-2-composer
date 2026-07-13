<?php

declare(strict_types=1);

namespace Codebrainbv\PostcodeCheckout\Model\Provider;

class ProviderType
{
    public const INTERNATIONAL = ['postcodenlext', 'pro6ppext'];

    public function isInternational(?string $provider): bool
    {
        return in_array((string) $provider, self::INTERNATIONAL, true);
    }

    public function isNational(?string $provider): bool
    {
        $provider = (string) $provider;
        return $provider !== '' && !$this->isInternational($provider);
    }
}
