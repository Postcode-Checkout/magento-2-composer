<?php

namespace Codebrainbv\PostcodeCheckout\Block;

use Magento\Framework\View\Element\Template;
use Codebrainbv\PostcodeCheckout\Helper\ConfigHelper;
use Magento\Csp\Helper\CspNonceProvider;

class Config extends Template
{
    protected $scopeConfig;
    protected $configHelper;
    /**
     * @var CspNonceProvider
     */
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
        $config = $this->configHelper->getJsConfig();
        return $config;
    }

    public function getTranslations(): array
    {
        $translate = $this->configHelper->getTranslations();
        return $translate;
    }

    /**
     * Returns configured provider, to be used in JS
     * @return string
     */
    public function getConfiguredProvider(): string
    {
        return $this->configHelper->getConfiguredProvider();
    }

    /**
     * Get all Checkout JS files for the active provider.
     */
    public function getCheckoutJsFiles(): array
    {
        $provider = $this->getConfiguredProvider();

        if ($provider === '') {
            return [
                'Codebrainbv_PostcodeCheckout/js/empty'
            ];
        }

        if (in_array($provider, ['postcodenlext'])) {
            // Load international file
            $files = [
                'Codebrainbv_PostcodeCheckout/js/vendor/autocompleteaddress',
                'Codebrainbv_PostcodeCheckout/js/default/checkout/postcodeeu'
            ];
        } else {
            // Load national file
            $files = [
                'Codebrainbv_PostcodeCheckout/js/default/checkout/national'
            ];
        }

        return $files;
    }

    /**
     * Get all Account JS files for the active provider.
     */
    public function getAccountJsFiles(): array
    {
        $provider = $this->getConfiguredProvider();

        if ($provider === '') {
            return [
                'Codebrainbv_PostcodeCheckout/js/empty'
            ];
        }

        if (in_array($provider, ['postcodenlext'])) {
            // Load international file
            $files = [
                'Codebrainbv_PostcodeCheckout/js/vendor/autocompleteaddress',
                'Codebrainbv_PostcodeCheckout/js/default/account/postcodeeu'
            ];
        } else {
            // Load national file
            $files = [
                'Codebrainbv_PostcodeCheckout/js/default/account/national'
            ];
        }

        return $files;
    }

    public function getHyvaCheckoutJsFiles(): array
    {
        $provider = $this->getConfiguredProvider();

        if ($provider === '') {
            return [
                'Codebrainbv_PostcodeCheckout/js/empty'
            ];
        }

        if (in_array($provider, ['postcodenlext'])) {
            // Load international file
            $files = [
                'Codebrainbv_PostcodeCheckout/js/hyva/checkout/postcodeeu'
            ];
        } else {
            // Load national file
            $files = [
                'Codebrainbv_PostcodeCheckout/js/hyva/checkout/national'
            ];
        }

        return $files;
    }


    public function getHyvaAccountJsFiles(): array
    {
        $provider = $this->getConfiguredProvider();

        if ($provider === '') {
            return [
                'Codebrainbv_PostcodeCheckout/js/empty'
            ];
        }

        if (in_array($provider, ['postcodenlext'])) {
            // Load international file
            $files = [
                'Codebrainbv_PostcodeCheckout/js/hyva/account/postcodeeu'
            ];
        } else {
            // Load national file
            $files = [
                'Codebrainbv_PostcodeCheckout/js/hyva/account/national'
            ];
        }

        return $files;
    }
 
    /**
     * Get CSP Nonce
     *
     * @return String
     */
    public function getNonce(): string
    {
        return $this->cspNonceProvider->generateNonce();
    }
}
