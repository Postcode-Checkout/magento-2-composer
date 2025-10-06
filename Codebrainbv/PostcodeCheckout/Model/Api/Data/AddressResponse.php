<?php

namespace Codebrainbv\PostcodeCheckout\Model\Api\Data;

use Magento\Framework\DataObject;
use Codebrainbv\PostcodeCheckout\Api\Data\AddressResponseInterface;

class AddressResponse extends DataObject implements AddressResponseInterface
{
    /**
     * @inheritdoc
     */
    public function getStatus(): bool
    {
        return (bool) $this->getData('status');
    }

    /**
     * @inheritdoc
     */
    public function setStatus(bool $status)
    {
        return $this->setData('status', $status);
    }

    /**
     * @inheritdoc
     */
    public function getMessage(): ?string
    {
        return $this->getData('message');
    }

    /**
     * @inheritdoc
     */
    public function setMessage(?string $message)
    {
        return $this->setData('message', $message);
    }

    /**
     * @inheritdoc
     */
    public function getResult()
    {
        return $this->getData('result');
    }

    /**
     * @inheritdoc
     */
    public function setResult($result)
    {
        return $this->setData('result', $result);
    }
}
