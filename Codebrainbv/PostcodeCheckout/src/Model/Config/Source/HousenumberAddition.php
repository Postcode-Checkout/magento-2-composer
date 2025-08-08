<?php
namespace Codebrainbv\PostcodeCheckout\Model\Config\Source;

use Magento\Framework\Option\ArrayInterface;

class HousenumberAddition implements ArrayInterface
{
    public function toOptionArray()
    {
        return [
            [
                'value' => 0,
                'label' => __('Alles op straat 1')
            ],
            [
                'value' => 1,
                'label' => __('Straat op veld 1, rest op veld 2')
            ],
            [
                'value' => 2,
                'label' => __('Straat op veld 1, huisnummer op veld 2, toevoeging op veld 3')
            ],
        ];
    }
}
