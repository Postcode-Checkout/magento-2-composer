<?php

declare(strict_types=1);

namespace Codebrainbv\PostcodeCheckout\ViewModel;

use Magento\Framework\View\Element\Block\ArgumentInterface;
use Magento\Store\Model\ScopeInterface;
use Magento\Framework\App\Config\ScopeConfigInterface;

class PostcodeCheckout implements ArgumentInterface
{
    public const XML_PROVIDER_CONFIG = 'postcodecheckout_section/general/configured_provider';

    private ScopeConfigInterface $scopeConfig;

    public function __construct(
        ScopeConfigInterface $scopeConfig
    ) {
        $this->scopeConfig = $scopeConfig;
    }

    public function getConfiguredProvider(): string
    {
        return (string) $this->scopeConfig->getValue(
            self::XML_PROVIDER_CONFIG,
            ScopeInterface::SCOPE_STORE
        );
    }

    public function isInternationalProvider(): bool
    {
        return in_array($this->getConfiguredProvider(), ['postcodenlext', 'pro6ppext'], true);
    }

    public function isProviderPostcodeNlExt(): bool
    {
        return $this->isInternationalProvider();
    }
}
