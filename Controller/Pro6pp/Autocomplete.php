<?php

namespace Codebrainbv\PostcodeCheckout\Controller\Pro6pp;

use Codebrainbv\PostcodeCheckout\Helper\ConfigHelper;
use Codebrainbv\PostcodeCheckout\Model\Api\ValidationModel;
use Magento\Framework\App\Action\HttpGetActionInterface;
use Magento\Framework\App\RequestInterface;
use Magento\Framework\Controller\Result\JsonFactory;

class Autocomplete implements HttpGetActionInterface
{
    private $request;
    private $jsonFactory;
    private $configHelper;
    private $validationModel;

    public function __construct(
        RequestInterface $request,
        JsonFactory $jsonFactory,
        ConfigHelper $configHelper,
        ValidationModel $validationModel
    ) {
        $this->request         = $request;
        $this->jsonFactory     = $jsonFactory;
        $this->configHelper    = $configHelper;
        $this->validationModel = $validationModel;
    }

    public function execute()
    {
        $country = (string) $this->request->getParam('country', '');
        $query   = (string) $this->request->getParam('query', '');
        $limit   = $this->request->getParam('limit', null);

        $data = $this->validationModel->getPro6ppAutocomplete($country, $query, $limit);

        // JsonResult uses json_encode() directly — no Magento WebAPI type-mangling.
        return $this->jsonFactory->create()->setData($data);
    }
}
