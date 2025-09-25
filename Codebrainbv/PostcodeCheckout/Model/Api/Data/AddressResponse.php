<?php

namespace Codebrainbv\PostcodeCheckout\Model\Api\Data;

use Magento\Framework\DataObject;
use Codebrainbv\PostcodeCheckout\Api\Data\AddressResponseInterface;

class AddressResponse extends DataObject implements AddressResponseInterface
{
    public function getStatus(): bool
    {
        return (bool) $this->getData('status');
    }

    public function setStatus(bool $status)
    {
        return $this->setData('status', $status);
    }

    public function getMessage(): ?string
    {
        return $this->getData('message');
    }

    public function setMessage(?string $message)
    {
        return $this->setData('message', $message);
    }

    public function getResult(): ?array
    {
        return $this->getData('result');
    }

    public function setResult(?array $result)
    {
        return $this->setData('result', $result);
    }
}
