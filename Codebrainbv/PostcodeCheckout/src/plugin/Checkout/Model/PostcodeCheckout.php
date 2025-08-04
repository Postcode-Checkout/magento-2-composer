<?php
namespace Codebrainbv\PostcodeCheckout\Plugin\Checkout\Model;

class PostcodeCheckout
{
    protected $postcodeHelper;
    
    public function __construct(
        \PcPostcode\Autocomplete\Helper\Data $postcodeHelper
    ){
        $this->postcodeHelper = $postcodeHelper;
    }
   
   /**
    * Lookup address
    *
    * @return string Return json of completed request
    */
    public function getPostcodeInformation($postcode, $houseNumber, $houseNumberAddition)
	{		
        $aResult = $this->postcodeHelper->lookupAddress($postcode, $houseNumber, $houseNumberAddition);
		
        return json_encode($aResult);
    }

    
    /**
     * Set $postcodeHelper
     */
    public function __construct(
        \PcPostcode\Autocomplete\Helper\Data $postcodeHelper
    ){
        $this->postcodeHelper = $postcodeHelper;
    }
   
    /**
     * Get all Postcode settings
     * 
     * @return array $config
     */
    public function getConfig()
    {        
        $config = [
            'pcpostcode_autocomplete' => [
                'settings' => $this->postcodeHelper->getJsinit(false)
            ]
        ];
		
        return $config;
    }
}
