(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['Codebrainbv_PostcodeCheckout/js/vendor/autocompleteaddress'], factory);
    } else {
        root.PCM2_PostcodeEU = factory(root.PostcodeNl && root.PostcodeNl.AutocompleteAddress);
    }
}(this, function (AutocompleteAddress) {
    'use strict';

        
    var fields, elements, validationFields, pcm2_Autocomplete; // Declare variables at module level
    

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

        var iso3Code = pcm2_convertIso2ToIso3(countryCode);
        
        pcm2_log('Converted country code to ISO3:', iso3Code);


        // Initialize autocomplete
        const searchField = document.getElementById('pcm2_autocomplete_search');

        if (!AutocompleteAddress) {
            pcm2_log('PCM2 AutocompleteAddress not available');
            return;
        }

        pcm2_Autocomplete = new AutocompleteAddress(searchField, {
            autocompleteUrl: config.pcm2_config.api_urls.international_suggest,
            addressDetailsUrl: config.pcm2_config.api_urls.international_details,
            autoFocus: true,
            autoSelect: true,
            context: iso3Code
        });

        pcm2_Autocomplete.getSuggestions = function (context, term, response) {

            // Encode the term to binary to preserve whitespace
            // and then encode it to base64 for the URL.
            const encodedTerm = new TextEncoder().encode(term),
                binaryTerm = Array.from(encodedTerm, (byte) => String.fromCodePoint(byte)).join(''),
                url = this.options.autocompleteUrl.replace('${context}', encodeURIComponent(context)).replace('${term}', encodeURIComponent(btoa(binaryTerm)));

            return this.xhrGet(url, response);
        }

        pcm2_Autocomplete.getDetails = function (addressId, response) {
            const url = this.options.addressDetailsUrl.replace('${context}', encodeURIComponent(addressId));
            return this.xhrGet(url, response);
        };


        searchField.addEventListener('autocomplete-select', function (event) {

            // Set value of the search field to the selected address
            searchField.value = event.detail.label;
            logDebug('Autocomplete-select event: ', event);

            if (event.detail.precision === 'Address') {

                logDebug('Autocomplete-select: ', event.detail);
                pcm2_fillAddressFields(event.detail);
            }
        });

    }
    

    function debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
            func.apply(this, args);
            }, delay);
        };
    }

    function pcm2_fillAddressFields(result) {
        fields = pcm2_getFields();

        pcm2_log('PCM2 filling address fields with result:', result);


        // Check if we have a result, empty array?
        if (!result || Object.keys(result).length === 0) {
            pcm2_log('PCM2 no result found');

            pcm2_updatePreview(true);
        } else {

            if(config.pcm2_config.housenumber_addition_address2 == 0) {
                // Everything on street 1 field
                fields.address_1.value = result.street;
                fields.address_1.value += ' ' + result.housenumber;
            }
            else { 
                // Street on field 1, rest on field 2
                fields.address_1.value = result.street;
                fields.address_2.value = result.housenumber;
            }

            // Check additions
            if (result.addition && Array.isArray(result.addition) && result.addition.length > 0) {
                pcm2_log('Found additions to place in the select:', result.addition);
				pcm2_setHouseNumberAdditions(result.addition);
            } else {
                pcm2_changeHousenumberAddition(result.addition);
                validationFields.housenumberAddition.style.display = 'none';
            }

            fields.postcode.value = result.postcode;
            fields.city.value = result.city;

            pcm2_updatePreview();
        }
    }

    function pcm2_updatePreview(errorMsg = false) {

        if(errorMsg) {
            validationFields.resultWrapper.innerHTML = '<p style="color:red;">Adres kon niet worden gevonden, controleer Postcode en Huisnummer of voer handmatig in.</p>';
            return;
        }

        var html = '';

        html += '<p>'+ fields.address_1.value;

        if (fields.address_2 && fields.address_2.value) {
            html += ' ' + fields.address_2.value;
        }

        if (fields.address_3 && fields.address_3.value) {
            html += ' ' + fields.address_3.value;
        }
        html += '</p>';
        html += '<p>' + fields.postcode.value + ' ' + fields.city.value + '</p>';

        validationFields.resultWrapper.innerHTML = html;
    }

    function pcm2_hideForm(defaultForm = false) {
        // Add param to find out if its the shipping or billing form
        fields = pcm2_getFields();
        elements = pcm2_getElements();
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

            // Re-initialize event listeners after showing elements
            pcm2_initLookup();

        } else {
            // Hide address fields
            var html =
            '<div class="field" id="pcm2_autocomplete_search_wrapper">' +
            '  <label class="label" for="pcm2_autocomplete_search"><span>Complete your address</span></label>' +
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

            // Check if it doesnt already exists
            if (!document.getElementById('pcm2_autocomplete_search_wrapper')) {
                pcm2_log('PCM2 postcode lookup fields do not exist, adding them now');
                elements.country.insertAdjacentHTML('beforebegin', html);
            }
            
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
            address_1: document.getElementById('street_1'),
            address_2: document.getElementById('street_2'),
            address_3: document.getElementById('street_3'),
            postcode: document.getElementById('zip'),
            city: document.getElementById('city'),
            region: document.getElementById('region'),
        };

        return fields;
    }

    function pcm2_getElements() {

        elements = {
            // Since street 0,1,2 have a single parent fieldset, we need to get the parent element once
            address_1: document.getElementById('street_1').closest('div.field'),
            postcode : document.getElementById('zip').closest('div.field'),
            city : document.getElementById('city').closest('div.field'),
            region : document.getElementById('region').closest('div.field'),
            country : document.getElementById('country').closest('div.field'),
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

        // Check if country code is NL
        if (config.pcm2_config.supported_countries.find(country => country.iso2 === countryCode)) {

            return true;
        }

        return false;
    }

    function pcm2_convertIso2ToIso3(iso2) {
	    return config.pcm2_config.supported_countries.find(country => country.iso2 === iso2).iso3;
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

                    console.log('PCM2 Postcodeeu init');

                    pcm2_addLookup();
                // }
            
            } else {
                console.log('PCM2 Postcodeeu not enabled');
            }
        }

    };
}));