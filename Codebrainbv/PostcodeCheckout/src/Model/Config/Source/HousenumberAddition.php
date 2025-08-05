<?php
namespace Codebrainbv\PostcodeCheckout\Model\Config\Source;

use Magento\Framework\Option\ArrayInterface;

class HousenumberAddition implements ArrayInterface
{
    public function toOptionArray()
    {
        return [
            [
                'value' => 'street1_all',
                'label' => __('Alles op straat 1')
            ],
            [
                'value' => 'street1_street2_rest',
                'label' => __('Straat op veld 1, rest op veld 2')
            ],
            [
                'value' => 'street1_street2_housenumber_street3_addition',
                'label' => __('Straat op veld 1, huisnummer op veld 2, toevoeging op veld 3')
            ],
        ];
    }
}
