<?php
namespace Codebrainbv\PostcodeCheckout\Observer;

use Magento\Framework\Event\Observer;
use Magento\Framework\Event\ObserverInterface;

class HyvaCheckoutConfigBefore implements ObserverInterface
{
    public function execute(Observer $observer)
    {
        $config = $observer->getData('config');
        $config['codebrainbv_postcodecheckout'] = [
            'active' => true
        ];
        $observer->setData('config', $config);
    }
}
