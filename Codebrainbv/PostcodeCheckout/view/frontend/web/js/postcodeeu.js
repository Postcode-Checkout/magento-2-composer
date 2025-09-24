define([], function() {
    'use strict';
    
    var fields, elements, validationFields; // Declare variables at module level
    
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
        countryField.addEventListener('change', function(event) {
            var newCountryCode = event.target.value;
            pcm2_log('PCM2 country changed to:', newCountryCode);
            countryCode = newCountryCode;


            // Check if country is supported
            if(pcm2_isSupportedCountry(countryCode)) {
                pcm2_log('PCM2 country is supported, adding postcode lookup');
                pcm2_hideForm();
            } else {
                pcm2_log('PCM2 country is not supported, no postcode lookup');
                // Show default fields again
                pcm2_showForm();
            }
        });

        // Check if country is supported
        if(pcm2_isSupportedCountry(countryCode)) {
            pcm2_log('PCM2 country is supported, adding postcode lookup');

            // Add postcode lookup
            pcm2_hideForm();
        } else {
            pcm2_log('PCM2 country is not supported, no postcode lookup');
            return;
        }


        // Add event listener to pcm2 buttons
        document.addEventListener('click', function(event) {
            if (event.target && event.target.id === 'pcm2_autocomplete_manualbtn') {
                pcm2_log('PCM2 manual button clicked, showing default fields');
                pcm2_showForm(true);
            }

            if (event.target && event.target.id === 'pcm2_autocomplete_autobtn') {
                pcm2_log('PCM2 auto button clicked, showing postcode lookup fields');
                pcm2_hideForm(true);
            }
        });

        var iso3 = pcm2_convertIso2ToIso3(countryCode);

        // Load the postcodeeu script
        const searchId = document.querySelector('#pcm2_autocomplete_search');

        // Set postcode EU object, from the loaded script        
        pcm2_Autocomplete = new PostcodeNl.AutocompleteAddress(searchId, {
            autocompleteUrl: config.pcm2_config.api_urls.international_suggest,
            addressDetailsUrl: config.pcm2_config.api_urls.international_details,
            autoFocus: true,
            autoSelect: true,
            context: sIso3Code
        });

        
        pcm2_Autocomplete.getSuggestions = function (context, term, response) {

        }


        pcm2_Autocomplete.getDetails = function (addressId, response) {

        };

        searchId.addEventListener('autocomplete-select', function (event) {

            
        });

    }


    function pcm2_hideForm(defaultForm = false) {
        // Add param to find out if its the shipping or billing form
        fields = pcm2_getFields();
        elements = pcm2_getElements();

        pcm2_log('PCM2 fields:', fields);
        pcm2_log('PCM2 elements:', elements);

        validationFields = pcm2_getValidationFields();

        // If checkbox, hide our fields and show default fields
		if (defaultForm) {
            pcm2_log('PCM2 checkbox is checked, hiding PCM2 fields and showing default fields');

            var domKeys = Object.keys(validationFields);

            for (var iDom = 0; iDom < domKeys.length; iDom++) {
                // Hide all fields, except the autoBtn
                if (domKeys[iDom] != 'autoBtn') {
                    validationFields[domKeys[iDom]].style.display = 'block';
                } else {
                    // Display the other button
                    validationFields[domKeys[iDom]].style.display = 'none';
                }
            }
        } else {
            // Hide address fields
            var html =
            '<div class="field" id="pcm2_autocomplete_search_wrapper">' +
            '  <label class="label"><span>Address lookup</span></label>' +
            '  <div class="control"><input id="pcm2_autocomplete_search" name="pcm2_autocomplete_search" type="text" class="input-text" required /></div>' +
            '</div>' +
            '<div class="field" id="pcm2_autocomplete_result_wrapper">' +
            '  <label class="label"><span></span></label>' +
            '  <div class="control" id="pcm2_autocomplete_result"></div>' +
            '</div>' +
            '<div class="field"><div class="control">' +
            '  <button type="button" class="action secondary" id="pcm2_autocomplete_manualbtn">Enter manually</button> ' +
            '  <button type="button" class="action secondary" id="pcm2_autocomplete_autobtn" style="display:none;">Enter automatically</button>' +
            '</div></div>';

            elements.country.insertAdjacentHTML('beforebegin', html); 
        }

        // Hide address fields
        var domKeys = Object.keys(fields);

        for (var iDom = 0; iDom < domKeys.length; iDom++) {

            // Hide the element, and empty the value, except for country
            if (domKeys[iDom] != 'country') {

                fields[domKeys[iDom]].value = '';

                // If its address_2 or address_3 we skip this step
                if (domKeys[iDom] != 'address_2' && domKeys[iDom] != 'address_3') {
                    elements[domKeys[iDom]].style.display = 'none';
                }
            }
        }
    }

    function pcm2_showForm(defaultForm = false) {
        fields = pcm2_getFields();
        elements = pcm2_getElements();


        var domKeys = Object.keys(fields);

        for (var iDom = 0; iDom < domKeys.length; iDom++) {

            // Hide the element, and empty the value, except for country
            if (domKeys[iDom] != 'country') {

                // If its address_2 or address_3 we skip this step
                if (domKeys[iDom] != 'address_2' && domKeys[iDom] != 'address_3') {
                    elements[domKeys[iDom]].style.display = 'block';
                }
            }
        }

        validationFields = pcm2_getValidationFields();

        // Checkbox to show default form
        if ( defaultForm ) {

            var domKeys = Object.keys(validationFields);

            for (var iDom = 0; iDom < domKeys.length; iDom++) {
                // Hide all fields, except the autoBtn
                if (domKeys[iDom] != 'autoBtn') {
                    validationFields[domKeys[iDom]].style.display = 'none';
                } else {
                    // Display the other button
                    validationFields[domKeys[iDom]].style.display = 'block';
                }
            }
        } else {
            // Remove postcode lookup fields
            var domKeys = Object.keys(validationFields);

            for (var iDom = 0; iDom < domKeys.length; iDom++) {
                validationFields[domKeys[iDom]].remove();
            }
        }

    }

    function pcm2_getFields() {

        fields = {
            address_1: document.querySelector('input[name="street[0]"]'),
            address_2: document.querySelector('input[name="street[1]"]'),
            address_3: document.querySelector('input[name="street[2]"]'),
            postcode: document.querySelector('input[name="postcode"]'),
            city: document.querySelector('input[name="city"]'),
            region: document.querySelector('input[name="region"]'),
        };

        return fields;
    }

    function pcm2_getElements() {

        elements = {
            // Since street 0,1,2 have a single parent fieldset, we need to get the parent element once
            address_1: document.querySelector('input[name="street[0]"]').closest('fieldset.street'),
            postcode : document.querySelector('input[name="postcode"]').closest('div.field'),
            city : document.querySelector('input[name="city"]').closest('div.field'),
            region : document.querySelector('input[name="region"]').closest('div.field'),
            country : document.querySelector('select[name="country_id"]').closest('div.field'),
        };

        return elements;
    }

    function pcm2_getValidationFields() {
        var validationFields = {
            searchWrapper: document.getElementById('pcm2_autocomplete_search_wrapper'),
            resultWrapper: document.getElementById('pcm2_autocomplete_result_wrapper'),
            manualBtn: document.getElementById('pcm2_autocomplete_manualbtn'),
            autoBtn: document.getElementById('pcm2_autocomplete_autobtn')
        };

        return validationFields;
    }

    function pcm2_isSupportedCountry(countryCode) {
        if (typeof config.pcm2_config.supported_countries === 'undefined') {
            pcm2_log('PCM2 supported countries not defined in config');
            return false;
        }

        return config.pcm2_config.supported_countries.find(country => country.iso2 === countryCode);
    }

    function pcm2_convertIso2ToIso3(iso2Code) {
        
	    return config.pcm2_config.supported_countries.find(country => country.iso2 === iso2Code).iso3;
    }

    function pcm2_log(msg, data) {
        if (config.pcm2_config.debug_mode == 1) {
            console.log('PCM2:', msg);
            if (data) console.dir(data);
        }
    }

    // Public API
    return {
        pcm2_init: function () {
            // Check if dom is ready
            if (typeof config.pcm2_config !== 'undefined' && config.pcm2_config.enabled === true) {

                // Add check if it is the checkout shipping form or the address form
                // var isCheckoutAddress = document.getElementById('#shipping-new-address-form');

                // if ( isCheckoutAddress ) {

                    console.log('PCM2 postcodeeu.js init');

                    pcm2_addLookup();
                // }
            
            } else {
                console.log('PCM2 postcodeeu.js not enabled');
            }
        }

    };
});