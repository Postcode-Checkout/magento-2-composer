<?php

namespace Codebrainbv\PostcodeCheckout\Block;

use Magento\Framework\View\Element\Template;
use Codebrainbv\PostcodeCheckout\Helper\ConfigHelper;
use Magento\Csp\Helper\CspNonceProvider;

class Config extends Template
{
    protected $configHelper;
    private $cspNonceProvider;

    public function __construct(
        Template\Context $context,
        ConfigHelper $configHelper,
        CspNonceProvider $cspNonceProvider,
        array $data = []
    ) {
        parent::__construct($context, $data);
        $this->configHelper = $configHelper;
        $this->cspNonceProvider = $cspNonceProvider;
    }

    public function getJsConfig(): array
    {
        return $this->configHelper->getJsConfig();
    }

    public function getTranslations(): array
    {
        return $this->configHelper->getTranslations();
    }

    public function getConfiguredProvider(): string
    {
        return strtolower((string) $this->configHelper->getConfiguredProvider());
    }

    public function getCheckoutJsFiles(): array
    {
        return $this->getDefaultJsFiles();
    }

    public function getAccountJsFiles(): array
    {
        return $this->getDefaultJsFiles();
    }

    public function getHyvaCheckoutJsFiles(): array
    {
        return $this->getHyvaJsFiles();
    }

    public function getHyvaAccountJsFiles(): array
    {
        return $this->getHyvaJsFiles();
    }

    private function getDefaultJsFiles(): array
    {
        $provider = $this->getConfiguredProvider();

        // The shim files (postcodenlext.js / pro6ppext.js) declare the vendor lib
        // as an AMD dependency, so RequireJS guarantees correct load order.
        if ($provider === 'postcodenlext') {
            return [
                'Codebrainbv_PostcodeCheckout/js/pcm2/postcodenlext',
            ];
        }

        if ($provider === 'pro6ppext') {
            return [
                'Codebrainbv_PostcodeCheckout/js/pcm2/pro6ppext',
            ];
        }

        // National providers: use adapter/core.js which has proper postcode+housenumber UI.
        return [
            'Codebrainbv_PostcodeCheckout/js/adapter/luma',
        ];
    }

    private function getHyvaJsFiles(): array
    {
        $provider = $this->getConfiguredProvider();

        // Hyvä: sequential script loading guarantees vendor is ready before core.
        if ($provider === 'postcodenlext') {
            return [
                'Codebrainbv_PostcodeCheckout::js/vendor/autocompleteaddress.js',
                'Codebrainbv_PostcodeCheckout::js/pcm2/core.js',
            ];
        }

        if ($provider === 'pro6ppext') {
            return [
                'Codebrainbv_PostcodeCheckout::js/vendor/pro6pp.js',
                'Codebrainbv_PostcodeCheckout::js/pcm2/core.js',
            ];
        }

        // National providers: use adapter/core.js which has proper postcode+housenumber UI.
        // adapter/hyva.js boots PCM2 on all relevant Hyvä events.
        return [
            'Codebrainbv_PostcodeCheckout::js/adapter/core.js',
            'Codebrainbv_PostcodeCheckout::js/adapter/hyva.js',
        ];
    }

    public function getNonce(): string
    {
        return $this->cspNonceProvider->generateNonce();
    }
}
