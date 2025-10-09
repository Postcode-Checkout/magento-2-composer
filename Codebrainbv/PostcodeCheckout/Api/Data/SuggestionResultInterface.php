<?php

namespace Codebrainbv\PostcodeCheckout\Api\Data;

interface SuggestionResultInterface
{


    /**
     * @return Codebrainbv\PostcodeCheckout\Api\Data\Autocomplete\MatchInterface[]
     */
    public function getMatches(): array;

    /**
     * @return string|null
     */
    public function getError(): ?string;

    /**
     * @return string|null
     */
    public function getMessage(): ?string;

}
