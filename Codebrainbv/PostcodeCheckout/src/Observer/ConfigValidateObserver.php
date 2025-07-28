<?php

namespace Codebrainbv\PostcodeCheckout\Observer;

use Magento\Framework\Event\Observer;
use Magento\Framework\Event\ObserverInterface;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\App\Config\Storage\WriterInterface;
use Magento\Framework\App\RequestInterface;

class ConfigValidateObserver implements ObserverInterface
{
    const CONFIG_MAXLENGTH_LICENSE = 32;

    protected $configWriter;
    protected $request;

    public function __construct(
        WriterInterface $configWriter,
        RequestInterface $request
    ) {
        $this->configWriter = $configWriter;
        $this->request = $request;
    }

    public function execute(Observer $observer)
    {
        // Haal altijd de POST data op via DI
        $postData = $this->request->getPostValue();

        $group = 'general';
        $apiKey = $postData['groups'][$group]['fields']['api_key']['value'] ?? '';
        $licenseKey = $postData['groups'][$group]['fields']['license_key']['value'] ?? '';

        $errors = [];

        if (!is_string($licenseKey) || strlen($licenseKey) > self::CONFIG_MAXLENGTH_LICENSE) {
            $errors[] = 'License key is too long or invalid!';
        }

        if (!is_string($apiKey) || empty($apiKey)) {
            $errors[] = 'API key is empty or invalid!';
        }

        $provider = null;
        if (empty($errors)) {
            $provider = $this->validateApiKey($apiKey, $errors);
        }

        if (!empty($errors)) {
            throw new LocalizedException(__(implode("\n", $errors)));
        }

        if ($provider) {
            $this->configWriter->save(
                "postcodecheckout_section/general/configured_provider",
                $provider
            );
        }
    }

    /**
     * validate API key and get provider
     */
    private function validateApiKey($apiKey, &$errors)
    {
        // Check if the API key is at least 150 characters long
        if (strlen($apiKey) < 150) {
            $errors[] = 'API key is too short!';
            return false;
        }

        // Can we decode the API key?
        $decodedKey = base64_decode($apiKey, true);
        if ($decodedKey === false) {
            $errors[] = 'Can\'t decode the API key!';
            return false;
        }

        // Explode API key into parts
        $parts = explode('|', $decodedKey);

        if (count($parts) !== 2) {
            $errors[] = 'There aren\'t enough parts for the API key!';
            return false;
        }

        // Is part 0 a valid json string?
        $json = json_decode($parts[0]);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $errors[] = 'Error during the json process!';
            return false;
        }

        // Grab shop URL and expiration
        $expiration = $json->expiration_date ?? null;
        $currentDate = time();

        // Has it expired?
        if (!$expiration || $currentDate > $expiration) {
            $errors[] = 'Key is out of date!';
            return false;
        }

        // Externe check via API endpoint
        $requestHeaders = [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://dashboard.postcode-checkout.nl/api/v1/check');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $requestHeaders);
        curl_setopt($ch, CURLOPT_HEADER, true);

        $response = curl_exec($ch);
        if ($response === false) {
            $errors[] = "No response from API endpoint!";
            return false;
        }

        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($httpCode !== 200) {
            $errors[] = "API response code: $httpCode";
            return false;
        }

        // Split headers/body
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $responseBody = substr($response, $headerSize);
        $responseData = json_decode($responseBody, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $errors[] = 'Error during the json process after the response got in!';
            return false;
        }

        // Check if provider is in response
        if (!isset($responseData['provider'])) {
            $errors[] = 'Provider not found in response!';
            return false;
        }

        return $responseData['provider'];
    }
}
