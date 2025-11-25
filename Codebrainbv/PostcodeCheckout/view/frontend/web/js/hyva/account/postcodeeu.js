console.log('Postcode Checkout EU Account script loaded');

function initializePostcodeEUAccount() {

    if (typeof pcm2_config !== 'undefined' && pcm2_config.enabled == 1) {
        console.log('PCM2 EU init with the config:', pcm2_config);
        pcm2_addLookup();
    } else {
        console.log('PCM2 EU not enabled');
    }
}



var fields, elements, validationFields, oldAddition; // Declare variables at module level
    
function pcm2_addLookup() {

    // Get country value
    var countryField = document.querySelector('select[name="country_id"]');

    pcm2_log('Country field:', countryField);

    if (!countryField) {
        pcm2_log('PCM2 country field not found');
        return;
    }

    var countryCode = countryField.value;
    pcm2_log('PCM2 country code:', countryCode);


    // Add event listener to country field
    countryField.addEventListener('change', function (event) {
        var newCountryCode = event.target.value;
        pcm2_log('PCM2 country changed to:', newCountryCode);
        countryCode = newCountryCode;

        // Check if country is supported
        if (pcm2_isSupportedCountry(countryCode)) {
            pcm2_log('PCM2 country is supported, adding postcode lookup');
            pcm2_hideForm();
        } else {
            pcm2_log('PCM2 country is not supported, no postcode lookup');
            // Show default fields again
            pcm2_showForm();
        }
    });

    // Check if country is supported
    if (pcm2_isSupportedCountry(countryCode)) {
        pcm2_log('PCM2 country is supported, adding postcode lookup');

        // Add postcode lookup
        pcm2_hideForm();
    } else {
        pcm2_log('PCM2 country is not supported, no postcode lookup');
        return;
    }


    // Add event listener to pcm2 buttons
    document.addEventListener('click', function (event) {
        if (event.target && event.target.id === 'pcm2_autocomplete_manualbtn') {
            pcm2_log('PCM2 manual button clicked, showing default fields');
            pcm2_showForm(true);
        }

        if (event.target && event.target.id === 'pcm2_autocomplete_autobtn') {
            pcm2_log('PCM2 auto button clicked, showing postcode lookup fields');
            pcm2_hideForm(true);
        }
    });

    // Initialize lookup functionality
    pcm2_initLookup();

}






if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePostcodeEUAccount);
} else {
    initializePostcodeEUAccount();
}