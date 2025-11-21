<?php

namespace Codebrainbv\PostcodeCheckout\Block;

use Magento\Framework\View\Element\Template;
use Codebrainbv\PostcodeCheckout\Helper\ConfigHelper;

class Config extends Template
{
    protected $scopeConfig;
    protected $configHelper;

    public function __construct(
        Template\Context $context,
        ConfigHelper $configHelper,
        array $data = []
    ) {
        parent::__construct($context, $data);
        $this->configHelper = $configHelper;
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
    public function getCheckoutJsFilesForProvider(): array
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
                'Codebrainbv_PostcodeCheckout/js/checkout/postcodeeu'
            ];
        } else {
            // Load national file
            $files = [
                'Codebrainbv_PostcodeCheckout/js/checkout/national'
            ];
        }

        return $files;
    }

    /**
     * Get all Account JS files for the active provider.
     */
    public function getAccountJsFilesForProvider(): array
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
                'Codebrainbv_PostcodeCheckout/js/account/postcodeeu'
            ];
        } else {
            // Load national file
            $files = [
                'Codebrainbv_PostcodeCheckout/js/account/national'
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
                'Codebrainbv_PostcodeCheckout/js/vendor/autocompleteaddress',
                'Codebrainbv_PostcodeCheckout/js/hyva/postcodeeu'
            ];
        } else {
            // Load national file
            $files = [
                'Codebrainbv_PostcodeCheckout/js/hyva/national'
            ];
        }

        return $files;
    }
}
