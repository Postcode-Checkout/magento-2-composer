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
                'label' => __('everything_street_1')
            ],
            [
                'value' => 1,
                'label' => __('street_and_housenumber_field_1_addition_field_2')
            ],
            [
                'value' => 2,
                'label' => __('street_field_1_housenumber_addition_field_2')
            ]
        ];
    }
}
