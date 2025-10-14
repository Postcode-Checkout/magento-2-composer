<?php

namespace Codebrainbv\PostcodeCheckout\Api\Data;

interface SuggestionResultInterface
{

    /**
     * @return string|null
     */
    public function getNewContext(): ?string;

    /**
     * @param string|null $newContext
     * @return $this
     */
    public function setNewContext(?string $newContext);


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
