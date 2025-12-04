var fields, elements, validationFields, pcm2_Autocomplete, countryCode; // Declare variables at module level
var placementHousenumberAdditions = pcm2_config.housenumber_addition_address2;



function pcm2_addLookup(section, countryElement) {
    if (!countryElement) {
        console.log("Country element not found for section: " + section);
        return;
    }

    countryCode = countryElement.value;

    console.log("Country set to: " + countryCode + " for section: " + section);

}










if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePostcodeEUCheckout);
} else {
    initializePostcodeEUCheckout();
}

function initializePostcodeEUCheckout() {
    // Is the checkout validation enabled?
    if (pcm2_config.enabled !== '1') {
        return false;
    }

    console.log("Initializing PostcodeEU Checkout Module");


    let pcm2_Section = '';
    let oElement = '';

    pcm2_Section = 'shipping';
    oElement = document.getElementById(pcm2_Section + '-country_id');

    if (oElement) {
        pcm2_addLookup(pcm2_Section, oElement);
    }
    
    var shippingToBillingCheckbox = document.getElementById('billing-as-shipping');
    pcm2_Section = 'billing';

    if (shippingToBillingCheckbox) {

        // Check state of the checkbox
        if(!shippingToBillingCheckbox.checked) {
            var billingCountry = document.getElementById(pcm2_Section + '-country_id');
            if (billingCountry) {
                pcm2_addLookup(pcm2_Section, billingCountry);
            }
        }

        shippingToBillingCheckbox.addEventListener('change', function() {
            if (this.checked) {
                console.log("Shipping to billing address checkbox checked");
                // Re-initialize or update the PostcodeEU module as needed
                // initializePostcodeEUCheckout();
            } else {
                console.log("Shipping to billing address checkbox unchecked");
                
                // Use interval to wait for billing form to be rendered
                var attempts = 0;
                var maxAttempts = 20; // Try for 2 seconds (20 * 100ms)
                
                var checkBillingField = setInterval(function() {
                    attempts++;
                    console.log("Attempt " + attempts + ": Checking for billing country field");

                    var billingCountry = document.getElementById(pcm2_Section + '-country_id');
                    if (billingCountry) {
                        console.log("Found billing country, adding lookup for billing address");
                        clearInterval(checkBillingField);
                        
                        pcm2_addLookup(pcm2_Section, billingCountry);
                        billingCountry.addEventListener('change', function () {
                            pcm2_addLookup(pcm2_Section, billingCountry);
                        });
                        
                    } else if (attempts >= maxAttempts) {
                        console.log("Billing country field not found after " + maxAttempts + " attempts.");
                        clearInterval(checkBillingField);
                    }
                }, 100);

            }
        });
    }
}