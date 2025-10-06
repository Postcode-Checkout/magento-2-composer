<?php 

namespace Codebrainbv\PostcodeCheckout\Api;

use Codebrainbv\PostcodeCheckout\Api\Data\AddressResponseInterface;

interface ValidationInterface
{

    /**
     * Get national address based on zip code and house number
     * 
     * @param string $zipCode
     * @param string $houseNumber
     * @return \Codebrainbv\PostcodeCheckout\Api\Data\AddressResponseInterface
     */
    public function getNationalAddress($zipCode, $houseNumber): AddressResponseInterface;


}