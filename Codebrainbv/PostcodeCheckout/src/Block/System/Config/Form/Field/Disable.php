<?php
namespace Codebrainbv\PostcodeCheckout\Block\System\Config\Form\Field;

use Magento\Framework\Data\Form\Element\AbstractElement;
use Magento\Config\Block\System\Config\Form\Field;

class Disable extends Field
{
    /**
     * Make this field readonly in the admin
     */
    protected function _getElementHtml(AbstractElement $element)
    {
        $element->setReadonly(true, true);
        return parent::_getElementHtml($element);
    }
}
