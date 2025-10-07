<?php

namespace Codebrainbv\PostcodeCheckout\Api\Data;

interface AddressResultInterface
{
    /**
     * Get the street name
     * @return string|null
     */
    public function getStreet(): ?string;

    /**
     * Set the street name
     * @param string|null $street
     * @return $this
     */
    public function setStreet(?string $street);

    /**
     * Get the house number
     * @return string|null
     */
    public function getHousenumber(): ?string;

    /**
     * Set the house number
     * @param string|null $number
     * @return $this
     */
    public function setHousenumber(?string $number);

    /**
     * Get the addition to the house number
     * @return array|null
     */
    public function getAddition(): ?array;

    /**
     * Set the addition to the house number
     * @param array|null $addition
     * @return $this
     */
    public function setAddition(?array $addition);

    /**
     * Get the postcode
     * @return string|null
     */
    public function getPostcode(): ?string;

    /**
     * Set the postcode
     * @param string|null $postcode
     * @return $this
     */
    public function setPostcode(?string $postcode);

    /**
    * Get the city name
    * @return string|null
    */
    public function getCity(): ?string;

    /**
     * Set the city name
     * @param string|null $city
     * @return $this
     */
    public function setCity(?string $city);

    /**
     * Get the province name
     * @return string|null
     */
    public function getProvince(): ?string;

    /**
     * Set the province name
     * @param string|null $province
     * @return $this
     */
    public function setProvince(?string $province);
}
