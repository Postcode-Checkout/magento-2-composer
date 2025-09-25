<?php 

namespace Codebrainbv\PostcodeCheckout\Api;

interface ValidationInterface
{
    /**
     * Get address autocomplete suggestions based on context and term
     * @param string $context
     * @param string $term
     * @return array
     */
    public function getAddressAutocomplete($context, $term);


    /**
     * Get address details based on context
     * @param string $context
     * @return array
     */
    public function getAddressDetails($context);


    /**
     * Get national address based on zip code and house number
     * @param string $zipCode
     * @param string $houseNumber
     * @return array
     */
    public function getNationalAddress($zipCode, $houseNumber);


}