<?php

namespace Codebrainbv\PostcodeCheckout\Model\Api\Data;

use Magento\Framework\DataObject;
use Codebrainbv\PostcodeCheckout\Api\Data\AddressResultInterface;

class AddressResult extends DataObject implements AddressResultInterface
{
    /**
     * @inheritdoc
     */
    public function getStreet(): ?string { return $this->getData('street'); }

    /**
     * @inheritdoc
     */
    public function setStreet(?string $street) { return $this->setData('street', $street); }
    
    /**
     * @inheritdoc
     */
    public function getHousenumber(): ?string { return $this->getData('housenumber'); }
    
    /**
     * @inheritdoc
     */
    public function setHousenumber(?string $number) { return $this->setData('housenumber', $number); }

    /**
     * @inheritdoc
     */
    public function getAddition(): ?string { return $this->getData('addition'); }
    
    /**
     * @inheritdoc
     */
    public function setAddition(?string $addition) { return $this->setData('addition', $addition); }
    
    /**
     * @inheritdoc
     */
    public function getPostcode(): ?string { return $this->getData('postcode'); }
    
    /**
     * @inheritdoc
     */
    public function setPostcode(?string $postcode) { return $this->setData('postcode', $postcode); }
    
    /**
     * @inheritdoc
     */
    public function getCity(): ?string { return $this->getData('city'); }
    
    /**
     * @inheritdoc
     */
    public function setCity(?string $city) { return $this->setData('city', $city); }
    
    /**
     * @inheritdoc
     */
    public function getProvince(): ?string { return $this->getData('province'); }
    
    /**
     * @inheritdoc
     */
    public function setProvince(?string $province) { return $this->setData('province', $province); }
}
