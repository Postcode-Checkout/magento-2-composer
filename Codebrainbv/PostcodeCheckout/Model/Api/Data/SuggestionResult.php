<?php

namespace Codebrainbv\PostcodeCheckout\Model\Api\Data;

use Magento\Framework\DataObject;
use Codebrainbv\PostcodeCheckout\Api\Data\SuggestionResultInterface;

class SuggestionResult extends DataObject implements SuggestionResultInterface
{
    /**
     * @inheritdoc
     */
    public function getMatches(): Codebrainbv\PostcodeCheckout\Model\Api\Data\Autocomplete\MatchResult;
    

    /**
     * @inheritdoc
     */
    public function getError(): ?string;

    /**
     * @inheritdoc
     */
    public function getMessage(): ?string;

    
}