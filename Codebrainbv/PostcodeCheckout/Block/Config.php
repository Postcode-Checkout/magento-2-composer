<?php
namespace Codebrainbv\PostcodeCheckout\Block;

use Magento\Framework\View\Element\Template;
use Codebrainbv\PostcodeCheckout\Helper\ConfigHelper;

class Config extends Template
{
    protected $scopeConfig;
    protected $configHelper;

    public function __construct(
        Template\Context $context,
        ConfigHelper $configHelper,
        array $data = []
    ) {
        parent::__construct($context, $data);
        $this->configHelper = $configHelper;
    }

    public function getJsConfig(): array
    {
        return $this->configHelper->getJsConfig();
    }

    /**
     * Returns configured provider, to be used in JS
     * @return string
     */
    public function getConfiguredProvider(): string
    {
        return $this->configHelper->getConfiguredProvider();
    }

}
