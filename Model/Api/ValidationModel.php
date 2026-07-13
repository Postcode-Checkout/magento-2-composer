<?php

namespace Codebrainbv\PostcodeCheckout\Model\Api;

use Codebrainbv\PostcodeCheckout\Api\ValidationInterface;
use Codebrainbv\PostcodeCheckout\Api\Data\SuggestionResultInterface;
use Codebrainbv\PostcodeCheckout\Api\Data\AddressResponseInterface;
use Codebrainbv\PostcodeCheckout\Helper\ConfigHelper;
use Codebrainbv\PostcodeCheckout\Model\Api\Data\AddressResponseFactory;
use Codebrainbv\PostcodeCheckout\Model\Api\Data\AddressResultFactory;
use Codebrainbv\PostcodeCheckout\Model\Api\Data\SuggestionResultFactory;

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

    public function __construct(
        ConfigHelper $configHelper,
        AddressResponseFactory $responseFactory,
        AddressResultFactory $resultFactory,
        SuggestionResultFactory $suggestionResultFactory,
    ) {
        $this->configHelper = $configHelper;
        $this->responseFactory = $responseFactory;
        $this->resultFactory = $resultFactory;
        $this->suggestionResultFactory = $suggestionResultFactory;
    }


    /**
     * @inheritdoc
     */
    public function getInternationalSuggestion($context, $term): SuggestionResultInterface
    {
        $response = $this->suggestionResultFactory->create();

        if (empty($context) || empty($term)) {
            return $response
                ->setError('Context and Term are required');
        }

        $apiKey = $this->configHelper->getApiKey();
        if (empty($apiKey)) {
            return $response
                ->setError('Module is not yet configured (no API key)');
        }


        // In magento2Test: $context is altijd ISO3, $term is altijd plain base64
        $url = $this->api_url . '/international/v2/suggestions?country=' . rawurlencode($context)
            . '&query=' . rawurlencode(base64_decode($term));

        $rawResponse = $this->callInternationalApi($url, $apiKey);

        if ($rawResponse['error']) {
            return $response
                ->setError($rawResponse['message']);
        }

        // Process the successful response
        $matches = $rawResponse['result']['matches'] ?? [];
        $newContext = $rawResponse['result']['newContext'] ?? null;

        return $response->setNewContext($newContext)
            ->setMatches($matches)
            ->setMessage('Success');
    }

    /**
     * @inheritdoc
     */
    public function getInternationalDetails($context): AddressResponseInterface
    {
        $response = $this->responseFactory->create();

        if (empty($context)) {
            return $response
                ->setStatus(false)
                ->setMessage('Context is required')
                ->setResult(null);
        }

        $apiKey = $this->configHelper->getApiKey();
        if (empty($apiKey)) {
            return $response
                ->setStatus(false)
                ->setMessage('Module is not yet configured (no API key)')
                ->setResult(null);
        }

        $url = $this->api_url . '/international/v2/details?query=' . rawurlencode($context)
            . '&provider=' . rawurlencode($this->configHelper->getConfiguredProvider());
        $rawResponse = $this->callInternationalApi($url, $apiKey);

        if ($rawResponse['error']) {
            return $response
                ->setStatus(false)
                ->setMessage($rawResponse['message'])
                ->setResult(null);
        }

        $result = $this->resultFactory->create();

        // Map the international response to the result object
        $addressData = $rawResponse['result']['address'] ?? [];
        
        $result->setStreet($addressData['street'] ?? null)
            ->setHousenumber($addressData['buildingNumber'] ?? null)
            ->setPostcode($addressData['postcode'] ?? null)
            ->setCity($addressData['locality'] ?? null)
            ->setProvince($addressData['province'] ?? null)
            ->setAddition($addressData['buildingNumberAddition'] ?? null);

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
            'X-Autocomplete-Session: ' . ($_SERVER['HTTP_X_AUTOCOMPLETE_SESSION'] ?? uniqid()),
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
            'result' => $decoded ?? null
        ];
    }

    /**
     * Pro6PP autocomplete proxy.
     *
     * @param string $country  ISO-2 country code
     * @param string $query    Search query
     * @param int|null $limit  Max results (optional)
     * @return array
     */
    public function getPro6ppAutocomplete(string $country, string $query, $limit = null): array
    {
        $country = strtoupper(trim($country));
        $query   = trim($query);

        if (empty($country) || empty($query)) {
            return ['stage' => 'final', 'suggestions' => [], 'error' => true, 'message' => 'Country and query are required'];
        }

        $apiKey = $this->configHelper->getApiKey();
        if (empty($apiKey)) {
            return ['stage' => 'final', 'suggestions' => [], 'error' => true, 'message' => 'Module is not yet configured (no API key)'];
        }

        $url = $this->api_url . '/international/v2/suggestions'
            . '?country=' . rawurlencode($country)
            . '&query=' . rawurlencode($query);

        if ($limit !== null && $limit !== '') {
            $url .= '&limit=' . (int) $limit;
        }

        $rawResponse = $this->callInternationalApi($url, $apiKey);

        if ($rawResponse['error']) {
            return ['stage' => 'final', 'suggestions' => [], 'error' => true, 'message' => $rawResponse['message']];
        }

        $apiData = $rawResponse['result'];

        if (!is_array($apiData)) {
            return ['stage' => 'final', 'suggestions' => []];
        }

        if (isset($apiData['stage'])) {
            return [
                'stage'       => $apiData['stage'],
                'suggestions' => $apiData['suggestions'] ?? [],
                'cities'      => $apiData['cities'] ?? [],
                'streets'     => $apiData['streets'] ?? [],
            ];
        }

        if (isset($apiData['suggestions']) && is_array($apiData['suggestions'])) {
            return ['stage' => 'final', 'suggestions' => $apiData['suggestions']];
        }

        return ['stage' => 'final', 'suggestions' => $apiData];
    }
}
