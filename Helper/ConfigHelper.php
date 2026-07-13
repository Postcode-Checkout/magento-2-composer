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

    public function getConfigValue($field)
    {
        return $this->scopeConfig->getValue($field, ScopeInterface::SCOPE_STORE);
    }

    public function getShopUrl(): string
    {
        $store = $this->_storeManager->getStore();
        $baseUrl = $this->_urlBuilder->getBaseUrl(['_store' => $store->getCode()]);
        $parts = parse_url($baseUrl);

        return rtrim(($parts['scheme'] ?? 'https') . '://' . ($parts['host'] ?? ''), '/');
    }

    public function isEnabled(): bool
    {
        return (string) $this->getConfigValue('postcodecheckout_section/general/enabled') === '1';
    }

    public function getApiKey(): string
    {
        return (string) ($this->getConfigValue('postcodecheckout_section/general/api_key') ?? '');
    }

    public function getConfiguredProvider(): string
    {
        return strtolower((string) ($this->getConfigValue('postcodecheckout_section/general/configured_provider') ?? ''));
    }

    public function getJsConfig(): array
    {
        $store = $this->_storeManager->getStore();
        $baseUrl = $this->_urlBuilder->getBaseUrl(['_store' => $store->getCode()]);
        $apiUrl = $baseUrl . 'rest/V1/codebrainbv_postcodecheckout/';
        $provider = $this->getConfiguredProvider();

        $config = [
            'enabled' => $this->getConfigValue('postcodecheckout_section/general/enabled'),
            'empty_default_address_fields' => $this->getConfigValue('postcodecheckout_section/address_settings/empty_default_address_fields'),
            'hide_default_address_fields' => $this->getConfigValue('postcodecheckout_section/address_settings/hide_default_address_fields'),
            'housenumber_addition_address2' => $this->getConfigValue('postcodecheckout_section/address_settings/housenumber_addition_address2'),
            'autocomplete_off' => $this->getConfigValue('postcodecheckout_section/extra_settings/autocomplete_off'),
            'debug_mode' => $this->getConfigValue('postcodecheckout_section/extra_settings/debug_mode'),
            'provider' => $provider,
            'national_providers' => ['demo', 'postcodenl', 'pro6pp', 'postcodeapi', 'nederland_postcode', 'postcode_connect'],
            'international_providers' => ['postcodenlext', 'pro6ppext'],
            'api_urls' => [
                'national' => $apiUrl . 'national/address',
                'postcodenlext_suggest' => $apiUrl . 'international/suggest/${context}/${term}',
                'postcodenlext_details' => $apiUrl . 'international/details/${context}',
                'international_suggest' => $apiUrl . 'international/suggest/${context}/${term}',
                'international_details' => $apiUrl . 'international/details/${context}',
                'pro6pp_autocomplete' => $baseUrl . 'postcodecheckout/pro6pp/autocomplete',
            ],
        ];

        if ($provider === 'postcodenlext') {
            $config['supported_countries'] = $this->getCountriesPostcodeNlExt();
        } elseif ($provider === 'pro6ppext') {
            $config['supported_countries'] = $this->getCountriesPro6ppExt();
        } else {
            // National providers only work for the Netherlands.
            $config['supported_countries'] = [
                ['name' => 'The Netherlands', 'iso2' => 'NL', 'iso3' => 'NLD'],
            ];
        }

        return $config;
    }

    public function getTranslations(): array
    {
        return [
            'search' => __('Adres aanvullen'),
            'placeholder_search' => __('Postcode, Straatnaam of Stad'),
            'automatic' => __('Automatisch invullen'),
            'manual' => __('Handmatig invullen'),
            'result' => __('Gevonden adres'),
            'postcode' => __('Postcode'),
            'housenumber' => __('Huisnummer'),
            'addition' => __('Toevoeging'),
            'no_addition' => __('Geen toevoeging'),
            'not_found' => __('Adres kon niet worden gevonden. Controleer de invoer of vul handmatig in.'),
        ];
    }

    private function getCountriesPro6ppExt(): array
    {
        $cacheDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'cache' . DIRECTORY_SEPARATOR;

        if (!is_dir($cacheDir)) {
            mkdir($cacheDir, 0755, true);
        }

        $cacheFilePath = $cacheDir . 'pro6pp_countries.json';

        $fallback = [
            ['name' => 'The Netherlands', 'iso2' => 'NL'],
            ['name' => 'Germany', 'iso2' => 'DE'],
            ['name' => 'Belgium', 'iso2' => 'BE'],
            ['name' => 'Luxembourg', 'iso2' => 'LU'],
            ['name' => 'Austria', 'iso2' => 'AT'],
            ['name' => 'Switzerland', 'iso2' => 'CH'],
            ['name' => 'France', 'iso2' => 'FR'],
            ['name' => 'Spain', 'iso2' => 'ES'],
            ['name' => 'Denmark', 'iso2' => 'DK'],
        ];

        if (is_readable($cacheFilePath)) {
            $cache = json_decode(
                (string) file_get_contents($cacheFilePath),
                true
            );

            if (
                !empty($cache['expiry'])
                && time() < (int) $cache['expiry']
            ) {
                return $cache['countries'] ?? $fallback;
            }
        }

        $ch = curl_init('https://api.pro6pp.nl/partners/countryFeatures/');

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER         => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_HTTPHEADER     => [
                'Accept: application/json',
            ],
        ]);

        $response = curl_exec($ch);

        if (
            $response === false
            || curl_getinfo($ch, CURLINFO_HTTP_CODE) !== 200
        ) {
            curl_close($ch);

            return $fallback;
        }

        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $headers = substr($response, 0, $headerSize);
        $body = substr($response, $headerSize);

        curl_close($ch);

        $data = json_decode($body, true);

        if (!is_array($data)) {
            return $fallback;
        }

        $countries = [];

        foreach ($data as $iso2 => $info) {
            if (in_array('v2/infer', $info['features'] ?? [], true)) {
                $countries[] = [
                    'iso2' => strtoupper((string) $iso2),
                ];
            }
        }

        if (!$countries) {
            return $fallback;
        }

        preg_match(
            '/^Cache-Control:.*max-age\s*=\s*(\d+)/mi',
            $headers,
            $matches
        );

        $expiry = isset($matches[1])
            ? time() + (int) $matches[1]
            : time() + 86400;

        file_put_contents(
            $cacheFilePath,
            json_encode([
                'countries' => $countries,
                'expiry'    => $expiry,
            ])
        );

        return $countries;
    }
    private function getCountriesPostcodeNlExt(): array
    {
        $cacheDir = dirname(__DIR__) .  DIRECTORY_SEPARATOR . 'cache' . DIRECTORY_SEPARATOR;
        if (!is_dir($cacheDir)) {
            mkdir($cacheDir, 0755, true);
        }
        $cacheFilePath = $cacheDir . 'postcodeEU_countries.json';

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
            ['name' => 'Sweden', 'iso3' => 'SWE', 'iso2' => 'SE'],
            ['name' => 'Italy', 'iso3' => 'ITA', 'iso2' => 'IT'],
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
