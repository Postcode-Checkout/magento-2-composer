<?php

namespace Codebrainbv\PostcodeCheckout\Api\Data\Autocomplete    ;

interface MatchInterface
{
    /**
     * @return string
     */
    public function getValue(): string;

    /**
     * @return string
     */
    public function getLabel(): string;

    /**
     * @return string
     */
    public function getDescription(): string;

    /**
     * @return string
     */
    public function getPrecision(): string;

    /**
     * @return string
     */
    public function getContext(): string;

    /**
     * @return Codebrainbv\PostcodeCheckout\Api\Data\Autocomplete\HighlightInterface[]
     */
    public function getHighlights(): array;
}
