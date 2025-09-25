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


        // Check for input on our fields
        document.addEventListener('input', function(event) {

            pcm2_log('PCM2 input event:', event);

            if (event.target && event.target.id === 'pcm2_autocomplete_postcode' || event.target.id === 'pcm2_autocomplete_housenumber') {
                var postcode = document.getElementById('pcm2_autocomplete_postcode').value;
                var housenumber = document.getElementById('pcm2_autocomplete_housenumber').value;

                // If both fields are filled, do the lookup
                if (postcode.length >= 6 && housenumber.length != 0) {
                    pcm2_log('PCM2 postcode and housenumber filled, doing lookup:', {postcode: postcode, housenumber: housenumber});

                    // Do the lookup with ajax call to our controller
                    var xhr = new XMLHttpRequest();
                    var url = config.pcm2_config.api_urls.national + '/' + encodeURIComponent(postcode) + '/' + encodeURIComponent(housenumber);

                    xhr.onreadystatechange = function() {
                        if (this.readyState === 4) {
                            if (this.status === 200) {
                                try {
                                    var response = JSON.parse(this.responseText);
                                    pcm2_log('PCM2 lookup response:', response);

                                    pcm2_log('Street found:', response.street);
                                    
                                    // Handle the successful response
                                    if (response && response.street) {
                                        // pcm2_fillAddressFields(response);
                                    }
                                } catch (e) {
                                    pcm2_log('PCM2 Invalid JSON response', e);
                                }
                            } else {
                                pcm2_log('PCM2 Request failed:', this);
                            }
                        }
                    };

                    xhr.onerror = function() {
                        console.error('PCM2 Network error occurred');
                        pcm2_log('PCM2 Network error');
                    };

                    xhr.timeout = 10000; // 10 second timeout
                    xhr.ontimeout = function() {
                        console.error('PCM2 Request timed out');
                        pcm2_log('PCM2 Request timeout');
                    };

                    xhr.open('GET', url, true);
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.send();


                }
            }
        });
    }

    function pcm2_fillAddressFields(data) {
        fields = pcm2_getFields();

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
        } else {
            // Hide address fields
            var html =
            '<div class="field" id="pcm2_autocomplete_postcode_wrapper">' +
            '  <label class="label"><span>Postcode</span></label>' +
            '  <div class="control"><input id="pcm2_autocomplete_postcode" name="pcm2_autocomplete_postcode" type="text" class="input-text" required /></div>' +
            '</div>' +
            '<div class="field" id="pcm2_autocomplete_housenumber_wrapper">' +
            '  <label class="label"><span>Huisnummer</span></label>' +
            '  <div class="control"><input id="pcm2_autocomplete_housenumber" name="pcm2_autocomplete_housenumber" type="text" class="input-text" required /></div>' +
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
            postcodeWrapper: document.getElementById('pcm2_autocomplete_postcode_wrapper'),
            housenumberWrapper: document.getElementById('pcm2_autocomplete_housenumber_wrapper'),
            resultWrapper: document.getElementById('pcm2_autocomplete_result_wrapper'),
            manualBtn: document.getElementById('pcm2_autocomplete_manualbtn'),
            autoBtn: document.getElementById('pcm2_autocomplete_autobtn')
        };

        return validationFields;
    }

    function pcm2_isSupportedCountry(countryCode) {

        // Check if country code is NL
        return countryCode === 'NL';
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

                    console.log('PCM2 national init');

                    pcm2_addLookup();
                // }
            
            } else {
                console.log('PCM2 national not enabled');
            }
        }

    };
});