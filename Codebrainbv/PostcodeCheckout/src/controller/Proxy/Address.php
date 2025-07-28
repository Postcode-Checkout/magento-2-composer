<?php

namespace Codebrainbv\PostcodeCheckout\Controller\Proxy;

use Magento\Framework\App\Action\Action;
use Magento\Framework\App\Action\Context;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\Controller\Result\JsonFactory;
use Magento\Framework\App\Response\Http as HttpResponse;

class Address extends Action
{
    protected $resultJsonFactory;
    protected $scopeConfig;
    protected $response;

    public function __construct(
        Context $context,
        JsonFactory $resultJsonFactory,
        ScopeConfigInterface $scopeConfig,
        HttpResponse $response
    ) {
        parent::__construct($context);
        $this->resultJsonFactory = $resultJsonFactory;
        $this->scopeConfig = $scopeConfig;
        $this->response = $response;
    }

    public function execute()
    {
        // Alleen POST requests accepteren
        if (!$this->getRequest()->isPost()) {
            $this->response->setHttpResponseCode(405);
            $result = $this->resultJsonFactory->create();
            return $result->setData(['error' => 'Method Not Allowed']);
        }

        // Haal post data op
        $postcode = $this->getRequest()->getPost('postcode');
        $housenumber = $this->getRequest()->getPost('housenumber');

        if (empty($postcode) || empty($housenumber)) {
            $this->response->setHttpResponseCode(400);
            $result = $this->resultJsonFactory->create();
            return $result->setData(['error' => 'Postcode and housenumber are required']);
        }

        // Haal API-key uit config
        $apiKey = $this->scopeConfig->getValue(
            'postcodecheckout_section/general/api_key',
            ScopeConfigInterface::SCOPE_STORE
        );

        if (empty($apiKey)) {
            $this->response->setHttpResponseCode(400);
            $result = $this->resultJsonFactory->create();
            return $result->setData(['error' => 'API key is not set']);
        }

        // Shop URL voor referer
        $shopUrl = $this->_url->getBaseUrl();
        $userAgent = 'CodeBrain BV Postcode Checkout Magento2 ' . $this->_objectManager->get('Magento\Framework\App\ProductMetadataInterface')->getVersion();

        $url = 'https://dashboard.postcode-checkout.nl/api/national/v3/address?postcode=' . urlencode($postcode) . '&housenumber=' . urlencode($housenumber);

        $headers = [
            'Authorization: Bearer ' . $apiKey,
            'Referer: ' . $shopUrl,
            'User-Agent: ' . $userAgent,
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_USERAGENT, $userAgent);

        $response = curl_exec($ch);

        // (optioneel) log naar een bestand, zoals in Prestashop (voor debug)
        // file_put_contents(BP . '/var/log/curl_out_headers.log', $userAgent.PHP_EOL, FILE_APPEND);

        if ($response === false) {
            $error = curl_error($ch);
            curl_close($ch);
            $this->response->setHttpResponseCode(502);
            $result = $this->resultJsonFactory->create();
            return $result->setData(['error' => 'Curl Error: ' . $error]);
        }

        $status_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $this->response->setHttpResponseCode($status_code);
        $this->getResponse()->representJson($response);

        return;
    }
}
