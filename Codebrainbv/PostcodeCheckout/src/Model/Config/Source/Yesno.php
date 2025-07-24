<?php
namespace Codebrainbv\PostcodeCheckout\Model\Config\Source;

use Magento\Framework\Option\ArrayInterface;

class Yesno implements ArrayInterface
{
    public function toOptionArray()
    {
        return [
            ['value' => '1', 'label' => __('Yes')],
            ['value' => '0', 'label' => __('No')]
        ];
    }
}
