<?php

namespace Codebrainbv\PostcodeCheckout\Model\Api;

use Codebrainbv\PostcodeCheckout\Api\ValidationInterface;
use Codebrainbv\PostcodeCheckout\Api\Data\SuggestionResultInterface;
use Codebrainbv\PostcodeCheckout\Api\Data\AddressResponseInterface;
use Codebrainbv\PostcodeCheckout\Helper\ConfigHelper;
use Codebrainbv\PostcodeCheckout\Model\Api\Data\AddressResponseFactory;
use Codebrainbv\PostcodeCheckout\Model\Api\Data\AddressResultFactory;
use Codebrainbv\PostcodeCheckout\Model\Api\Data\SuggestionResultFactory;
use Magento\Framework\App\RequestInterface;

class ValidationModel implements ValidationInterface
{
    /**
     * @var ConfigHelper
     */
    private $configHelper;

    /**
     * @var AddressResponseFactory
     */
    private $responseFactory;

    /**
     * @var AddressResultFactory
     */
    private $resultFactory;

    /**
     * @var SuggestionResultFactory
     */
    private $suggestionResultFactory;

    /**
     * @var api_url
     */
    private $api_url = 'https://api.postcode-checkout.nl';

    /**
     * @var RequestInterface
     */
    private $request;

    public function __construct(
        ConfigHelper $configHelper,
        AddressResponseFactory $responseFactory,
        AddressResultFactory $resultFactory,
        SuggestionResultFactory $suggestionResultFactory,
        RequestInterface $request
    ) {
        $this->configHelper = $configHelper;
        $this->responseFactory = $responseFactory;
        $this->resultFactory = $resultFactory;
        $this->suggestionResultFactory = $suggestionResultFactory;
        $this->request = $request;
    }


    /**
     * @inheritdoc
     */
    public function getSuggestion($country, $query): SuggestionResultInterface
    {
        $response = $this->suggestionResultFactory->create();

        if (empty($country) || empty($query)) {
            return $response
                ->setError('Country and Query are required');
        }

        $apiKey = $this->configHelper->getApiKey();
        if (empty($apiKey)) {
            return $response
                ->setError('Module is not yet configured (no API key)');
        }


        // In magento2Test: $context is altijd ISO3, $term is altijd plain base64
        $url = $this->api_url . '/international/v2/suggestions?country=' . $country
            . '&query=' . urlencode($query);

        $rawResponse = $this->callInternationalApi($url, $apiKey);

        if ($rawResponse['error']) {
            return $response
                ->setError($rawResponse['message']);
        }

        $result = $rawResponse['result'] ?? [];

        $matches = $result['matches'] ?? [];

        // Pro6PP
        if (empty($matches) && isset($result['suggestions']) && is_array($result['suggestions'])) {
            $matches = $result['suggestions'];
        }

        if (empty($matches)) {
            $matches = [];

            foreach (($result['cities'] ?? []) as $city) {
                $matches[] = $city;
            }

            foreach (($result['streets'] ?? []) as $street) {
                $matches[] = $street;
            }
        }

        $newContext = $result['newContext'] ?? null;

        return $response
            ->setNewContext($newContext)
            ->setMatches($matches)
            ->setMessage('Success');
    }

    /**
     * @inheritdoc
     */
    public function getDetails($query): AddressResponseInterface
    {
        $response = $this->responseFactory->create();

        if (empty($query)) {
            return $response
                ->setStatus(false)
                ->setMessage('Query is required')
                ->setResult(null);
        }

        $apiKey = $this->configHelper->getApiKey();
        if (empty($apiKey)) {
            return $response
                ->setStatus(false)
                ->setMessage('Module is not yet configured (no API key)')
                ->setResult(null);
        }

        $url = $this->api_url . '/international/v2/details?query=' . rawurlencode($query)
            . '&provider=' . rawurlencode($this->configHelper->getConfiguredProvider());
        $rawResponse = $this->callInternationalApi($url, $apiKey);

        if ($rawResponse['error']) {
            return $response
                ->setStatus(false)
                ->setMessage($rawResponse['message'])
                ->setResult(null);
        }

        $result = $this->resultFactory->create();

        $addressData = [];
        if (isset($rawResponse['result']['address']) && is_array($rawResponse['result']['address'])) {
            $addressData = $rawResponse['result']['address'];
        } elseif (isset($rawResponse['result']) && is_array($rawResponse['result'])) {
            $addressData = $rawResponse['result'];
        } elseif (isset($rawResponse['address']) && is_array($rawResponse['address'])) {
            $addressData = $rawResponse['address'];
        }

        $result->setStreet($addressData['street'] ?? $addressData['streetName'] ?? null)
            ->setHousenumber($addressData['buildingNumber'] ?? $addressData['houseNumber'] ?? $addressData['housenumber'] ?? $addressData['street_number'] ?? null)
            ->setPostcode($addressData['postcode'] ?? $addressData['postalCode'] ?? null)
            ->setCity($addressData['locality'] ?? $addressData['city'] ?? null)
            ->setProvince($addressData['province'] ?? $addressData['state'] ?? null)
            ->setAddition($addressData['buildingNumberAddition'] ?? $addressData['addition'] ?? null);

        return $response
            ->setStatus(true)
            ->setMessage(null)
            ->setResult($result);
    }

    /**
     * @inheritdoc
     */
    public function getNationalAddress($zipCode, $houseNumber): AddressResponseInterface
    {
        $response = $this->responseFactory->create();

        if (empty($zipCode) || empty($houseNumber)) {
            return $response
                ->setStatus(false)
                ->setMessage('Postcode en housenumber zijn verplicht')
                ->setResult(null);
        }

        $apiKey = $this->configHelper->getApiKey();
        if (empty($apiKey)) {
            return $response
                ->setStatus(false)
                ->setMessage('Module is nog niet geconfigureerd (geen API key)')
                ->setResult(null);
        }

        $url = $this->api_url . '/national/v3/address?postcode='
            . urlencode($zipCode) . '&housenumber=' . urlencode($houseNumber);

        $rawResponse = $this->callApi($url, $apiKey);

        if ($rawResponse['error']) {
            return $response
                ->setStatus(false)
                ->setMessage($rawResponse['message'])
                ->setResult(null);
        }

        $result = $this->resultFactory->create();

        $result->setStreet($rawResponse['result']['street'] ?? null)
            ->setHousenumber($rawResponse['result']['housenumber'] ?? null)
            ->setAddition($rawResponse['result']['addition'] ?? null)
            ->setPostcode($rawResponse['result']['postcode'] ?? null)
            ->setCity($rawResponse['result']['city'] ?? null)
            ->setProvince($rawResponse['result']['province'] ?? null);

        return $response
            ->setStatus(true)
            ->setMessage(null)
            ->setResult($result);
    }


    /**
     * Make the actual API call
     * 
     * @param string $url
     * @param string $apiKey
     * @return array
     */
    private function callApi(string $url, string $apiKey): array
    {
        $headers = [
            'Authorization: Bearer ' . $apiKey,
            'Referer: ' . $this->configHelper->getShopUrl(),
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_USERAGENT => 'PostcodeCheckoutMagento2Module/1.0.1',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 10,
        ]);

        $response = curl_exec($ch);

        if ($response === false) {
            return [
                'error' => true,
                'message' => 'Curl Error: ' . curl_error($ch),
                'result' => null
            ];
        }

        $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decoded = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return [
                'error' => true,
                'message' => 'Ongeldige API response',
                'result' => null
            ];
        }

        if ($statusCode !== 200) {
            return [
                'error' => true,
                'message' => 'API Error: ' . ($decoded['message'] ?? 'Unknown'),
                'result' => null
            ];
        }

        return [
            'error' => false,
            'message' => null,
            'result' => $decoded['result'] ?? null
        ];
    }


    private function callInternationalApi(string $url, string $apiKey): array
    {

        $headers = [
            'Authorization: Bearer ' . $apiKey,
            'Referer: ' . $this->configHelper->getShopUrl(),
        ];

        if ($this->configHelper->getConfiguredProvider() == 'postcodenlext') {
            $headers[] = 'X-Autocomplete-Session: ' . ($_SERVER['HTTP_X_AUTOCOMPLETE_SESSION'] ?? uniqid());
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_USERAGENT => 'PostcodeCheckoutMagento2Module/1.0.1',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 10,
        ]);

        $response = curl_exec($ch);

        if ($response === false) {
            return [
                'error' => true,
                'message' => 'Curl Error: ' . curl_error($ch),
                'result' => null
            ];
        }

        $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decoded = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return [
                'error' => true,
                'message' => 'Ongeldige API response',
                'result' => null
            ];
        }

        if ($statusCode !== 200) {
            return [
                'error' => true,
                'message' => 'API Error: ' . ($decoded['message'] ?? 'Unknown'),
                'result' => null
            ];
        }

        return [
            'error' => false,
            'message' => null,
            'result' => $decoded ?? null
        ];
    }
}
