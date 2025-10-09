<?php

namespace Codebrainbv\PostcodeCheckout\Model\Api;

use Codebrainbv\PostcodeCheckout\Api\ValidationInterface;
use Codebrainbv\PostcodeCheckout\Helper\ConfigHelper;
use Codebrainbv\PostcodeCheckout\Model\Api\Data\AddressResponseFactory;
use Codebrainbv\PostcodeCheckout\Model\Api\Data\AddressResultFactory;

class ValidationModel implements ValidationInterface
{
    /**
     * @var ConfigHelper
     */
    private $configHelper;

    private $responseFactory;

    private $resultFactory;

    public function __construct(
        ConfigHelper $configHelper,
        AddressResponseFactory $responseFactory,
        AddressResultFactory $resultFactory,
    ) {
        $this->configHelper = $configHelper;
        $this->responseFactory = $responseFactory;
        $this->resultFactory = $resultFactory;
    }


    /**
     * @inheritdoc
     */
    public function getInternationalSuggestion($context, $term): \Codebrainbv\PostcodeCheckout\Model\Api\Data\SuggestionResult
    {
        echo '<br>' . 'DEBUG: ' . __FILE__ . ' : ' . __LINE__ . '<br>';
        print_R($context);
        echo '<br>' . 'DEBUG: ' . __FILE__ . ' : ' . __LINE__ . '<br>';
        print_R($term);

        $response = $this->responseFactory->create();

        
        if (empty($context) || empty($term)) {
            return $response
                ->setStatus(false)
                ->setMessage('Context and Term are required')
                ->setResult(null);
        }

        $apiKey = $this->configHelper->getApiKey();
        if (empty($apiKey)) {
            return $response
                ->setStatus(false)
                ->setMessage('Module is not yet configured (no API key)')
                ->setResult(null);
        }

        $url = 'https://dashboard.postcode-checkout.nl/api/international/v2/suggestions?country=' . rawurlencode($context) . '&query=' . rawurlencode($term);

        echo '<br>' . 'DEBUG: ' . __FILE__ . ' : ' . __LINE__ . '<br>';
        print_R($url);

        $rawResponse = $this->callInternationalApi($url, $apiKey);

        echo '<br>' . 'DEBUG: ' . __FILE__ . ' : ' . __LINE__ . '<br>';
        print_r($rawResponse);
        echo '<br>' . 'DEBUG: ' . __FILE__ . ' : ' . __LINE__ . '<br>';
        exit;

        if ($rawResponse['error']) {
            return $response
                ->setStatus(false)
                ->setMessage($rawResponse['message'])
                ->setResult(null);
        }

        $result = $this->resultFactory->create();





    }

    /**
     * @inheritdoc
     */
    public function getInternationalDetails($context): \Codebrainbv\PostcodeCheckout\Model\Api\Data\AddressResponse
    {

    }



    /**
     * @inheritdoc
     */
    public function getNationalAddress($zipCode, $houseNumber): \Codebrainbv\PostcodeCheckout\Model\Api\Data\AddressResponse
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

        $url = 'https://dashboard.postcode-checkout.nl/api/national/v3/address?postcode='
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
            'X-Autocomplete-Session: ' . $_SERVER['HTTP_X_AUTOCOMPLETE_SESSION'] ?? uniqid(),
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
}