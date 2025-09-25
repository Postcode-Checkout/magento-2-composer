<?php

namespace Codebrainbv\PostcodeCheckout\Helper;


use Magento\Framework\App\Helper\AbstractHelper;
use Magento\Framework\App\Helper\Context;
use Magento\Store\Model\ScopeInterface;
use Magento\Store\Model\StoreManagerInterface;


class ConfigHelper extends AbstractHelper
{

    protected $_storeManager;

    public function __construct(
        Context $context,
        StoreManagerInterface $storeManager
    ) {
        parent::__construct($context);
        $this->_storeManager = $storeManager;
    }

    /**
     * Get config value by field
     *
     * @param string $field
     * @return mixed
     */
    public function getConfigValue($field)
    {
        return $this->scopeConfig->getValue(
            $field,
            ScopeInterface::SCOPE_STORE
        );
    }

    /**
     * Get shop URL
     * @return string
     */
    public function getShopUrl(): string
    {
        $store = $this->_storeManager->getStore();
        // $baseUrl = $store->getBaseUrl(\Magento\Framework\UrlInterface::URL_TYPE_WEB);
        $baseUrl = $this->_urlBuilder->getBaseUrl(['_store' => $store->getCode()]);
        return rtrim($baseUrl, '/');
    }

    /**
     * Is module enabled
     * @return bool
     */
    public function isEnabled(): bool
    {
        return $this->getConfigValue('postcodecheckout_section/general/enabled') == 1;
    }

    public function getApiKey(): string
    {
        return $this->getConfigValue('postcodecheckout_section/general/api_key') ?? '';
    }

    /**
     * Get module validation type
     * @return string
     */
    public function getConfiguredProvider(): string
    {
        return $this->getConfigValue('postcodecheckout_section/general/configured_provider') ?? '';
    }

    /**
     * Get JS config
     * @return array
     */
    public function getJsConfig(): array
    {
        $store = $this->_storeManager->getStore();
        // $baseUrl = $store->getBaseUrl(\Magento\Framework\UrlInterface::URL_TYPE_WEB);
        $baseUrl = $this->_urlBuilder->getBaseUrl(['_store' => $store->getCode()]);

        $apiUrl = $baseUrl . 'rest/V1/codebrainbv_postcodecheckout/';

        // Check provider
        $configuredProvider = $this->getConfigValue('postcodecheckout_section/general/configured_provider');

        $config = [
            'enabled' => $this->isEnabled(),
            'empty_default_address_fields' => $this->getConfigValue('postcodecheckout_section/general/empty_default_address_fields'),
            'housenumber_addition_address2' => $this->getConfigValue('postcodecheckout_section/general/housenumber_addition_address2'),
            'autocomplete_off' => $this->getConfigValue('postcodecheckout_section/general/autocomplete_off'),
            'debug_mode' => $this->getConfigValue('postcodecheckout_section/general/debug_mode'),
            'provider' => $configuredProvider,
            'api_urls' => [
                'national' => $apiUrl . 'national/address',
                'international_suggest' => $apiUrl . 'international/suggest',
                'international_details' => $apiUrl . 'international/details',
            ],
        ];

        if ($configuredProvider == 'postcodenlext') {
            // Load additional international config
            $config['supported_countries'] = $this->getCountries();
        }

        return $config;
    }

    private function getCountries(): array
    {
        $cacheDir = __DIR__ . '/cache/';
        if (!is_dir($cacheDir)) {
            mkdir($cacheDir, 0755, true);
        }
        $cacheFilePath = $cacheDir . 'countries.json';

        $fallback = [
            ['name' => 'The Netherlands', 'iso3' => 'NLD', 'iso2' => 'NL'],
            ['name' => 'Belgium', 'iso3' => 'BEL', 'iso2' => 'BE'],
            ['name' => 'Germany', 'iso3' => 'DEU', 'iso2' => 'DE'],
            ['name' => 'Luxembourg', 'iso3' => 'LUX', 'iso2' => 'LU'],
            ['name' => 'Austria', 'iso3' => 'AUT', 'iso2' => 'AT'],
            ['name' => 'Switzerland', 'iso3' => 'CHE', 'iso2' => 'CH'],
            ['name' => 'France', 'iso3' => 'FRA', 'iso2' => 'FR'],
            ['name' => 'United Kingdom', 'iso3' => 'GBR', 'iso2' => 'GB'],
            ['name' => 'Spain', 'iso3' => 'ESP', 'iso2' => 'ES'],
            ['name' => 'Denmark', 'iso3' => 'DNK', 'iso2' => 'DK'],
            ['name' => 'Norway', 'iso3' => 'NOR', 'iso2' => 'NO'],
            ['name' => 'Finland', 'iso3' => 'FIN', 'iso2' => 'FI'],
        ];

        if (is_readable($cacheFilePath)) {
            $data = json_decode(file_get_contents($cacheFilePath), true);
            if (!empty($data['expiry']) && time() < $data['expiry']) {
                return $data['countries'] ?? $fallback;
            }
        }

        $ch = curl_init('https://api.postcode.eu/international/v1/supported-countries');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        $resp = curl_exec($ch);

        if ($resp === false || curl_getinfo($ch, CURLINFO_HTTP_CODE) !== 200) {
            curl_close($ch);
            return $fallback;
        }

        $hdrSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $hdr     = substr($resp, 0, $hdrSize);
        $body    = substr($resp, $hdrSize);
        curl_close($ch);

        $countries = json_decode($body, true);
        preg_match('/^Cache-Control:.*max-age=(\d+)/mi', $hdr, $m);
        $expiry = isset($m[1]) ? time() + (int)$m[1] : time() + 86400;

        file_put_contents($cacheFilePath, json_encode([
            'countries' => $countries ?: $fallback,
            'expiry'    => $expiry,
        ]));

        return $countries ?: $fallback;
    }
}