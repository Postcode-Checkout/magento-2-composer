<?php

namespace Codebrainbv\PostcodeCheckout\Api\Data\Autocomplete;

interface HighlightInterface
{
    /**
     * @return int[]
     */
    public function getOffsets(): array;
}
