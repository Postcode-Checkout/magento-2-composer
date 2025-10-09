<?php

namespace Codebrainbv\PostcodeCheckout\Model\Api\Data\Autocomplete;

use Magento\Framework\DataObject;
use Codebrainbv\PostcodeCheckout\Api\Data\Autocomplete\MatchInterface;

class MatchResult extends DataObject implements MatchInterface
{
    /**
     * @inheritdoc
     */
    public function getValue(): string
    {
        return (string)$this->getData('value');
    }

    /**
     * @inheritdoc
     */
    public function getLabel(): string
    {
        return (string)$this->getData('label');
    }

    /**
     * @inheritdoc
     */
    public function getDescription(): string
    {
        return (string)$this->getData('description');
    }

    /**
     * @inheritdoc
     */
    public function getPrecision(): string
    {
        return (string)$this->getData('precision');
    }

    /**
     * @inheritdoc
     */
    public function getContext(): string
    {
        return (string)$this->getData('context');
    }

    /**
     * @inheritdoc
     */
    public function getHighlights(): array
    {
        return (array)$this->getData('highlights');
    }
}