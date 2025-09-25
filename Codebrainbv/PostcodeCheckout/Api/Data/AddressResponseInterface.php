<?php

namespace Codebrainbv\PostcodeCheckout\Api\Data;

interface AddressResponseInterface
{
    public function getStatus(): bool;
    public function setStatus(bool $status);

    public function getMessage(): ?string;
    public function setMessage(?string $message);

    public function getResult(): ?array;
    public function setResult(?array $result);
}
