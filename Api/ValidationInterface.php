<?php 

namespace Codebrainbv\PostcodeCheckout\Api;

use Codebrainbv\PostcodeCheckout\Api\Data\AddressResponseInterface;
use Codebrainbv\PostcodeCheckout\Api\Data\SuggestionResultInterface;

interface ValidationInterface
{
    /**
     * Get international address suggestion based on country ISO3 and search query
     * 
     * @param string $context
     * @param string $term
     * @return \Codebrainbv\PostcodeCheckout\Api\Data\SuggestionResultInterface
     */
    public function getInternationalSuggestion($context, $term): SuggestionResultInterface;

    /**
     * Get international address details based on provided context/addressId
     * 
     * @param string $context
     * @return \Codebrainbv\PostcodeCheckout\Api\Data\AddressResponseInterface
     */
    public function getInternationalDetails($context): AddressResponseInterface;

    /**
     * Get national address based on zip code and house number
     * 
     * @param string $zipCode
     * @param string $houseNumber
     * @return \Codebrainbv\PostcodeCheckout\Api\Data\AddressResponseInterface
     */
    public function getNationalAddress($zipCode, $houseNumber): AddressResponseInterface;
}