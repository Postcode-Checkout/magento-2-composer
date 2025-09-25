<?php

namespace Codebrainbv\PostcodeCheckout\Model\Api;

use Codebrainbv\PostcodeCheckout\Api\ValidationInterface;
use Codebrainbv\PostcodeCheckout\Helper\ConfigHelper;
use Codebrainbv\PostcodeCheckout\Model\Api\Data\AddressResponseFactory;

class ValidationModel implements ValidationInterface
{
    /**
     * @var ConfigHelper
     */
    private $configHelper;

    private $responseFactory;

    public function __construct(
        ConfigHelper $configHelper,
        AddressResponseFactory $responseFactory
    ) {
        $this->configHelper = $configHelper;
        $this->responseFactory = $responseFactory;
    }

    public function getAddressAutocomplete($context, $term)
    {
        // Implementation for getting address autocomplete suggestions
    }

    public function getAddressDetails($context)
    {
        // Implementation for getting address details
    }

    public function getNationalAddress($zipCode, $houseNumber)
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

        return $response
            ->setStatus(true)
            ->setMessage(null)
            ->setResult($rawResponse['result']);
    }

    private function callApi(string $url, string $apiKey): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $apiKey,
                'Referer: ' . $this->configHelper->getShopUrl(),
                'User-Agent: PostcodeCheckoutMagento2Module/1.0.1',
            ],
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

}