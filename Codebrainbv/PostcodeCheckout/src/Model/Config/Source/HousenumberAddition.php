<?php
namespace Codebrainbv\PostcodeCheckout\Model\Config\Source;

use Magento\Framework\Option\ArrayInterface;

class HousenumberAddition implements ArrayInterface
{
    public function toOptionArray()
    {
        return [
            ['value' => '0', 'label' => __('No')],
            ['value' => 'addition', 'label' => __('Addition')],
            ['value' => 'housenumber_addition', 'label' => __('Housenumber + addition')]
        ];
    }
}
