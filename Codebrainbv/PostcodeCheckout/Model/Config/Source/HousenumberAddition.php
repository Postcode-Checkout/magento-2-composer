<?php

namespace Codebrainbv\PostcodeCheckout\Model\Config\Source;


class HousenumberAddition implements \Magento\Framework\Data\OptionSourceInterface
{



    /**
     * Return array of options as value-label pairs
     *
     * @return array
     */
    public function toOptionArray()
    {
        return [
            [
                'value' => 0,
                'label' => __('Everything on street 1 field')
            ],
            [
                'value' => 1,
                'label' => __('Street on field 1, rest on field 2')
            ],
            [
                'value' => 2,
                'label' => __('Street on field 1, housenumber on field 2, addition on field 3')
            ],
        ];
    }
}
