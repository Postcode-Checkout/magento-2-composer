<?php

namespace Codebrainbv\PostcodeCheckout\Controller\Proxy;

use Magento\Framework\App\Action\Action;
use Magento\Framework\App\Action\Context;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\Controller\Result\JsonFactory;
use Magento\Framework\App\Response\Http as HttpResponse;

class Suggestions extends Action
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
        $type = $this->getRequest()->getParam('type');
        $parts = explode('/', $type);

        $country = isset($parts[1]) ? $parts[1] : '';
        $query = isset($parts[2]) ? $parts[2] : '';

        // API key ophalen uit config
        $apiKey = $this->scopeConfig->getValue(
            'postcodecheckout_section/general/api_key',
            ScopeConfigInterface::SCOPE_STORE
        );

        // Site URL als referer
        $shopUrl = $this->_url->getBaseUrl();

        // User-Agent
        $userAgent = 'CodeBrain BV Postcode Checkout Magento2 ' . $this->_objectManager->get('Magento\Framework\App\ProductMetadataInterface')->getVersion();

        if (empty($query) || empty($country)) {
            $this->response->setHttpResponseCode(400);
            $result = $this->resultJsonFactory->create();
            return $result->setData(['error' => 'Query and Context are required']);
        }

        if (empty($apiKey)) {
            $this->response->setHttpResponseCode(400);
            $result = $this->resultJsonFactory->create();
            return $result->setData(['error' => 'API key is not set']);
        }

        $url = 'https://dashboard.postcode-checkout.nl/api/international/v2/suggestions?country=' . rawurlencode($country) . '&query=' . rawurlencode($query);

        $headers = [
            'Authorization: Bearer ' . $apiKey,
            'X-Autocomplete-Session: ' . ($this->getRequest()->getHeader('X-Autocomplete-Session') ?? uniqid()),
            'Referer: ' . $shopUrl,
            'User-Agent: ' . $userAgent,
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_USERAGENT, $userAgent);

        $response = curl_exec($ch);

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
