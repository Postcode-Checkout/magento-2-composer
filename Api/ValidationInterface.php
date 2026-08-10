<?php

namespace Codebrainbv\PostcodeCheckout\Api;

use Codebrainbv\PostcodeCheckout\Api\Data\AddressResponseInterface;
use Codebrainbv\PostcodeCheckout\Api\Data\SuggestionResultInterface;

interface ValidationInterface
{
    /**
     * Get international address suggestion based on country ISO3 and search query
     * 
     * @param string $country
     * @param string $query
     * @return \Codebrainbv\PostcodeCheckout\Api\Data\SuggestionResultInterface
     */
    public function getSuggestion($country, $query): SuggestionResultInterface;

    /**
     * Get international address details based on provided query/addressId
     * 
     * @param string $query
     * @return \Codebrainbv\PostcodeCheckout\Api\Data\AddressResponseInterface
     */
    public function getDetails($query): AddressResponseInterface;


    /**
     * Get national address based on zip code and house number
     * 
     * @param string $zipCode
     * @param string $houseNumber
     * @return \Codebrainbv\PostcodeCheckout\Api\Data\AddressResponseInterface
     */
    public function getNationalAddress($zipCode, $houseNumber): AddressResponseInterface;
}
