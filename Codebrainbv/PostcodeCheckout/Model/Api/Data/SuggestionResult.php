<?php

namespace Codebrainbv\PostcodeCheckout\Model\Api\Data;

use Magento\Framework\DataObject;
use Codebrainbv\PostcodeCheckout\Api\Data\SuggestionResultInterface;

class SuggestionResult extends DataObject implements SuggestionResultInterface
{
    /**
     * @inheritdoc
     */
    public function getMatches(): array
    {
        return $this->getData('matches') ?: [];
    }

    /**
     * Set matches
     * @param array $matches
     * @return $this
     */
    public function setMatches(array $matches)
    {
        return $this->setData('matches', $matches);
    }

    /**
     * @inheritdoc
     */
    public function getError(): ?string
    {
        return $this->getData('error');
    }

    /**
     * Set error
     * @param string|null $error
     * @return $this
     */
    public function setError(?string $error)
    {
        return $this->setData('error', $error);
    }

    /**
     * @inheritdoc
     */
    public function getMessage(): ?string
    {
        return $this->getData('message');
    }

    /**
     * Set message
     * @param string|null $message
     * @return $this
     */
    public function setMessage(?string $message)
    {
        return $this->setData('message', $message);
    }
}