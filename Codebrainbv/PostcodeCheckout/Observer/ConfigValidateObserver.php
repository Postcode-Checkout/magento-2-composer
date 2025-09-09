<?php

namespace Codebrainbv\PostcodeCheckout\Observer;

use Magento\Framework\Event\Observer;
use Magento\Framework\Event\ObserverInterface;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\App\Config\Storage\WriterInterface;
use Magento\Framework\App\RequestInterface;
use Magento\Store\Model\StoreManagerInterface;
use Magento\Framework\HTTP\Client\Curl;

class ConfigValidateObserver implements ObserverInterface
{
    const CONFIG_MAXLENGTH_LICENSE = 32;

    protected $configWriter;
    protected $request;
    protected $storeManager;
    protected $curlClient;

    public function __construct(
        WriterInterface $configWriter,
        RequestInterface $request,
        StoreManagerInterface $storeManager,
        Curl $curlClient
    ) {
        $this->configWriter = $configWriter;
        $this->request = $request;
        $this->storeManager = $storeManager;
        $this->curlClient = $curlClient;
    }

    public function execute(Observer $observer)
    {
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
        if (strlen($apiKey) < 150) {
            $errors[] = 'API key is too short!';
            return false;
        }

        $decodedKey = base64_decode($apiKey, true);
        if ($decodedKey === false) {
            $errors[] = 'API key could not be validated!';
            return false;
        }

        $parts = explode('|', $decodedKey);

        if (count($parts) !== 2) {
            $errors[] = 'API key seems invalid, did it paste correctly?';
            return false;
        }

        $json = json_decode($parts[0]);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $errors[] = 'Error while checking the API key!';
            return false;
        }

        $expiration = $json->expiration_date ?? null;
        $currentDate = time();

        if (!$expiration || $currentDate > $expiration) {
            $errors[] = 'API Key is expired!';
            return false;
        }

        $shopUrl = $this->storeManager->getStore()->getBaseUrl(true);
        $parsed = parse_url($shopUrl);
        $shopUrl = $parsed['scheme'] . '://' . $parsed['host'];

        $headers = [
            'Authorization' => 'Bearer ' . $apiKey,
            'Referer' => $shopUrl,
            'Content-Type' => 'application/json',
        ];

        try {
            $this->curlClient->setHeaders($headers);
            $this->curlClient->get('https://dashboard.postcode-checkout.nl/api/v1/check');
            $httpCode = $this->curlClient->getStatus();
            $responseBody = $this->curlClient->getBody();
        } catch (\Exception $e) {
            $errors[] = "No response from API endpoint!";
            return false;
        }

        if ($httpCode !== 200) {
            $errors[] = "Invalid response from provider!";
            return false;
        }

        $responseData = json_decode($responseBody, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $errors[] = 'Error during the json process after the response got in!';
            return false;
        }

        if (!isset($responseData['provider'])) {
            $errors[] = 'Provider not found in response!';
            return false;
        }

        return $responseData['provider'];
    }
}
