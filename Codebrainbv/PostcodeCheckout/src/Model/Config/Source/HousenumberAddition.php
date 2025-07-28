<?php

namespace Codebrainbv\PostcodeCheckout\Model\Config\Source;

use Magento\Framework\Option\ArrayInterface;

class HousenumberAddition implements ArrayInterface
{
    public function toOptionArray()
    {
        return [
            ['value' => '0', 'label' => __('everything in one field')],
            ['value' => 'additionHousenumber', 'label' => __('Housenumber in onther field than addition')],
            ['value' => 'housenumber_addition', 'label' => __('Housenumber + addition in same field')]
        ];
    }
}
