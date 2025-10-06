<?php

namespace Codebrainbv\PostcodeCheckout\Api\Data;

interface AddressResponseInterface
{
    /**
     * Get the status of the response
     * @return bool
     */
    public function getStatus(): bool;

    /**
     * Set the status of the response
     * @param bool $status
     * @return $this
     */
    public function setStatus(bool $status);

    /**
     * Get the message of the response
     * @return string|null
     */
    public function getMessage(): ?string;

    /** 
     * Set the message of the response
     * @param string|null $message
     * @return $this
    */
    public function setMessage(?string $message);

    /**
     * Get the result data of the response
     * @return \Codebrainbv\PostcodeCheckout\Api\Data\AddressResultInterface|null
     */
    public function getResult();

    /**
     * Set the result data of the response
     * @param \Codebrainbv\PostcodeCheckout\Api\Data\AddressResultInterface|null $result
     * @return $this
     */
    public function setResult($result);
}
