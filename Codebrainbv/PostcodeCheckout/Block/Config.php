<?php
namespace Codebrainbv\PostcodeCheckout\Block;

use Magento\Framework\View\Element\Template;

class Config extends Template
{
    protected $scopeConfig;
    protected $countryHelper;

    public function __construct(
        Template\Context $context,
        \Magento\Framework\App\Config\ScopeConfigInterface $scopeConfig,
        \Codebrainbv\PostcodeCheckout\Helper\Country $countryHelper,
        array $data = []
    ) {
        parent::__construct($context, $data);
        $this->scopeConfig = $scopeConfig;
        $this->countryHelper = $countryHelper;
    }

    public function getJsConfig()
    {
        return [
            'enabled' => $this->scopeConfig->isSetFlag('postcodecheckout_section/general/enabled'),
            'hide_address_fields' => $this->scopeConfig->isSetFlag('postcodecheckout_section/general/hide_address_fields'),
            'empty_default_address_fields' => $this->scopeConfig->isSetFlag('postcodecheckout_section/general/empty_default_address_fields'),
            'housenumber_addition_address2' => $this->scopeConfig->getValue('postcodecheckout_section/general/housenumber_addition_address2'),
            'autocomplete_off' => $this->scopeConfig->isSetFlag('postcodecheckout_section/general/autocomplete_off'),
            'debug_mode' => $this->scopeConfig->isSetFlag('postcodecheckout_section/general/debug_mode'),
            'configured_provider' => $this->scopeConfig->getValue('postcodecheckout_section/general/configured_provider'),
            'countries' => $this->countryHelper->getCountries(),
        ];
    }
}
