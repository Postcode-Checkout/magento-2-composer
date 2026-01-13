(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        root.PCM2_National = factory();
    }
}(this, function () {
    'use strict';

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

    function pcm2_initLookup() {
        pcm2_log('PCM2 initializing lookup functionality with event delegation');

        // Remove existing event delegation listener if it exists
        if (window.pcm2GlobalInputHandler) {
            document.removeEventListener('input', window.pcm2GlobalInputHandler);
            pcm2_log('PCM2 removed existing global input handler');
        }

        // Create debounced handler
        const debouncedHandleInput = debounce(pcm2_doLookup, 400);

        // Create global input handler using event delegation
        window.pcm2GlobalInputHandler = function (event) {
            if (event.target && (event.target.id === 'pcm2_autocomplete_postcode' || event.target.id === 'pcm2_autocomplete_housenumber')) {
                pcm2_log('PCM2 input detected on:', event.target.id, 'value:', event.target.value);
                debouncedHandleInput();
            }
        };

        // Add global event listener using delegation
        document.addEventListener('input', window.pcm2GlobalInputHandler);

        pcm2_log('PCM2 global event delegation setup complete');

        // Test if fields exist
        var postcode = document.getElementById('pcm2_autocomplete_postcode');
        var housenumber = document.getElementById('pcm2_autocomplete_housenumber');

        if (postcode && housenumber) {
            pcm2_log('PCM2 fields found - postcode:', postcode.value);
            pcm2_log('PCM2 fields found - housenumber:', housenumber.value);

            // If fields are pre-filled, do a lookup
            if (postcode.value.trim() !== '' && housenumber.value.trim() !== '') {
                pcm2_log('PCM2 fields are pre-filled, doing initial lookup');
                pcm2_doLookup();
            }
        } else {
            pcm2_log('PCM2 fields not found yet - will work when created');
        }
    }

    // Check for input on our fields
    function pcm2_doLookup() {
        pcm2_log('PCM2 lookup triggered');

        // Get our input fields
        var postcodeField = document.getElementById('pcm2_autocomplete_postcode');
        var housenumberField = document.getElementById('pcm2_autocomplete_housenumber');

        // Exit if fields don't exist
        if (!postcodeField || !housenumberField) {
            pcm2_log('PCM2 fields not found, aborting lookup');
            return;
        }

        // Get values from our 2 validation fields
        validationFields = pcm2_getValidationFields();

        // Clear previous results
        if (validationFields.result) {
            validationFields.result.innerHTML = '';
        }

        var postcode = postcodeField.value.trim().toUpperCase().replace(/\s+/g, '');
        var housenumber = housenumberField.value.trim().replace(/(^\d+)(.*?$)/i, '$1');
        var addition = housenumberField.value.trim().replace(/(^\d+)(.*?$)/i, '$2');

        // If both fields are filled, do the lookup
        if (postcode.length >= 6 && housenumber.length != 0) {
            pcm2_log('PCM2 postcode and housenumber filled, doing lookup:', { postcode: postcode, housenumber: housenumber });

            // Do the lookup with ajax call to our controller
            var xhr = new XMLHttpRequest();
            var url = pcm2_config.api_urls.national + '/' + encodeURIComponent(postcode) + '/' + encodeURIComponent(housenumber);

            xhr.onreadystatechange = function () {
                if (this.readyState === 4) {
                    if (this.status === 200) {
                        try {
                            oldAddition = null;
                            var response = JSON.parse(this.responseText);
                            pcm2_log('PCM2 lookup response:', response);

                            // Handle the successful response
                            if (response && response.status === true && response.result.street) {
                                pcm2_fillAddressFields(response.result, addition);
                            } else {
                                pcm2_log('PCM2 No address found for the given postcode and housenumber');
                                pcm2_updatePreview(true);
                            }
                        } catch (e) {
                            pcm2_log('PCM2 Invalid JSON response', e);

                            // Update preview with error message
                            pcm2_updatePreview(true);
                        }
                    } else {
                        pcm2_log('PCM2 Request failed:', this);
                        pcm2_updatePreview(true);
                    }
                }
            };

            xhr.onerror = function () {
                pcm2_log('PCM2 Network error');

                pcm2_updatePreview(true);

            };

            xhr.timeout = 10000; // 10 second timeout
            xhr.ontimeout = function () {
                console.error('PCM2 Request timed out');
                pcm2_log('PCM2 Request timeout');
            };

            xhr.open('GET', url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send();
        }
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

    function pcm2_fillAddressFields(result, addition) {
        fields = pcm2_getFields();

        pcm2_log('PCM2 filling address fields with result:', result);


        // Check if we have a result, empty array?
        if (!result || Object.keys(result).length === 0) {
            pcm2_log('PCM2 no result found');

            pcm2_updatePreview(true);
        } else {

            if (pcm2_config.housenumber_addition_address2 == 0) {
                // Everything on street 1 field
                fields.address_1.value = result.street;
                fields.address_1.value += ' ' + result.housenumber;
            } else if (pcm2_config.housenumber_addition_address2 == 1) {
                // Street on field 1, addition on field 2
                fields.address_1.value = result.street + ' ' + result.housenumber;
            } else {
                fields.address_1.value = result.street;
                fields.address_2.value = result.housenumber;
            }

            // Check additions
            if (result.addition && Array.isArray(result.addition) && result.addition.length > 0 && result.addition !== '') {
                pcm2_log('Found additions to place in the select:', result.addition);
                pcm2_setHouseNumberAdditions(result.addition);
            } else {
                result.addition = addition;
                pcm2_changeHousenumberAddition(result.addition);
            }

            fields.postcode.value = result.postcode;
            fields.city.value = result.city;

            pcm2_updatePreview();
        }
    }

    function pcm2_updatePreview(errorMsg = false) {
        var contextFields = pcm2_getFields();
        var contextValidationFields = pcm2_getValidationFields();

        if (errorMsg) {
            if (contextValidationFields.resultInit) {
                contextValidationFields.resultInit.innerHTML = '<p style="color:red;">Adres kon niet worden gevonden, controleer Postcode en Huisnummer of voer handmatig in.</p>';
            }
            return;
        }

        if (!contextFields.address_1 || !contextValidationFields.resultInit) {
            pcm2_log('PCM2 updatePreview: missing fields for context');
            return;
        }

        var html = '';

        html += '<p>' + contextFields.address_1.value;
        if (contextFields.address_2 && contextFields.address_2.value) {
            html += ' ' + contextFields.address_2.value;
        }

        if (contextFields.address_3 && contextFields.address_3.value) {
            html += ' ' + contextFields.address_3.value;
        }
        html += '</p>';
        html += '<p>' + contextFields.postcode.value + ' ' + contextFields.city.value + '</p>';

        contextValidationFields.resultInit.innerHTML = html;
    }

    function pcm2_setHouseNumberAdditions(aAdditions) {
        // Ensure validation fields exist
        if (!validationFields || !validationFields.housenumberAddition) {
            validationFields = pcm2_getValidationFields();
        }

        var select = validationFields.housenumberAddition;
        var wrapper = validationFields.housenumberAdditionWrapper;

        // Clear existing options
        select.innerHTML = '';

        // Remove existing change handler if present
        if (select._pcm2ChangeHandler) {
            select.removeEventListener('change', select._pcm2ChangeHandler);
            select._pcm2ChangeHandler = null;
        }

        // Filter out null/undefined
        var validAdditions = (aAdditions || []).filter(function (value) {
            return value !== undefined && value !== null;
        });

        // Build options
        validAdditions.forEach(function (value) {
            var opt = document.createElement('option');
            opt.value = value;
            opt.text = value === '' ? 'Geen toevoeging' : value;
            select.appendChild(opt);
        });

        if (validAdditions.length === 1) {
            // One option: select it, hide wrapper, and apply immediately
            var defaultValue = validAdditions.includes('') ? '' : validAdditions[0];
            select.value = defaultValue;
            wrapper.style.display = 'none';
            if (typeof pcm2_changeHousenumberAddition === 'function') {
                pcm2_changeHousenumberAddition(defaultValue);
            }
        } else if (validAdditions.length > 1) {
            // Multiple options: show wrapper, preselect default, and bind change
            wrapper.style.display = 'block';
        }

        // Add event listener to the select field
        validationFields.housenumberAddition.addEventListener('change', function (event) {
            var selectedValue = event.target.value;
            pcm2_log('PCM2 housenumber addition changed to:', selectedValue);
            pcm2_changeHousenumberAddition(selectedValue);
        });
    }

    function pcm2_changeHousenumberAddition(sNewAdditionValue) {
        // Normalize/guard
        if (typeof sNewAdditionValue === 'undefined' || sNewAdditionValue === null) {
            return;
        }

        fields = pcm2_getFields();

        var street = fields.address_1.value;
        var housenumber = document.getElementById('pcm2_autocomplete_housenumber').value;
        var addition = sNewAdditionValue || '';

        var trimmedStreet = street.replace(/\s+\d+.*$/, '');

        if (pcm2_config.housenumber_addition_address2 == 0) {

            // Everything on street 1 field
            fields.address_1.value = trimmedStreet + ' ' + housenumber;
            if (addition) {
                fields.address_1.value += ' ' + addition;
            }
        } else if (pcm2_config.housenumber_addition_address2 == 1) {
            fields.address_2.value = addition;
        } else if (pcm2_config.housenumber_addition_address2 == 2) {
            if (addition) {
                // Remove addition from address_2 if it was previously set
                if (oldAddition) {
                    var regex = new RegExp('\\s*' + oldAddition + '$');
                    fields.address_2.value = fields.address_2.value.replace(regex, '').trim();
                }

                fields.address_2.value += ' ' + addition;
            }
        } else {

            if (addition) {
                fields.address_3.value = addition;
            } else {
                fields.address_3.value = '';
            }
        }

        oldAddition = addition;

        pcm2_updatePreview();
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
                if (domKeys[iDom] != 'autoBtn' && domKeys[iDom] != 'housenumberAdditionWrapper') {
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
                '<div class="field" id="pcm2_autocomplete_postcode_wrapper">' +
                '  <label class="label" for="pcm2_autocomplete_postcode"><span>Postcode</span></label>' +
                '  <div class="control"><input id="pcm2_autocomplete_postcode" name="pcm2_autocomplete_postcode" type="text" class="input-text" required /></div>' +
                '</div>' +
                '<div class="field" id="pcm2_autocomplete_housenumber_wrapper">' +
                '  <label class="label" for="pcm2_autocomplete_housenumber"><span>' + (pcm2_config.provider.includes('postcodenl') ? 'huisnummer' : 'huisnummer + toevoeging') + '</span></label>' +
                '  <div class="control"><input id="pcm2_autocomplete_housenumber" name="pcm2_autocomplete_housenumber" type="text" class="input-text" required /></div>' +
                '</div>' +
                '<div class="field" id="pcm2_autocomplete_housenumber_addition_wrapper" style="display: none;">' +
                '   <label class="label">Toevoeging</label>' +
                '   <div class="control"><select class="form-control form-control-select" type="select" class="input-text" name="pcm2_autocomplete_housenumber_addition" id="pcm2_autocomplete_housenumber_addition" value=""></select></div>' +
                '</div>' +
                '<div class="field" id="pcm2_autocomplete_result_wrapper">' +
                '<label class="label" for="pcm2_autocomplete_result"></label>' +
                '<div class="control" id="pcm2_autocomplete_result"></div>' +
                '</div>' +
                '<div class="field">' +
                '  <label class="label" for="pcm2_autocomplete_buttons"></label>' +
                '<div class="control" id="pcm2_autocomplete_buttons">' +
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
        if (defaultForm) {

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
            address_2: document.getElementById('street_2').closest('div.field'),
            postcode: document.getElementById('zip').closest('div.field'),
            city: document.getElementById('city').closest('div.field'),
            region: document.getElementById('region').closest('div.field'),
            country: document.getElementById('country').closest('div.field'),
        };

        return elements;
    }

    function pcm2_getValidationFields() {
        var validationFields = {
            postcodeWrapper: document.getElementById('pcm2_autocomplete_postcode_wrapper'),
            housenumberWrapper: document.getElementById('pcm2_autocomplete_housenumber_wrapper'),
            housenumberAdditionWrapper: document.getElementById('pcm2_autocomplete_housenumber_addition_wrapper'),
            housenumberAddition: document.getElementById('pcm2_autocomplete_housenumber_addition'),
            resultWrapper: document.getElementById('pcm2_autocomplete_result_wrapper'),
            resultInit: document.getElementById('pcm2_autocomplete_result'),
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
        if (pcm2_config.debug_mode == 1) {
            console.log('PCM2:', msg);
            if (data) console.dir(data);
        }
    }

    // Public API
    return {
        pcm2_init: function () {
            // Check if dom is ready
            if (typeof pcm2_config !== 'undefined' && pcm2_config.enabled == 1) {

                // Add check if it is the checkout shipping form or the address form
                // var isCheckoutAddress = document.getElementById('#shipping-new-address-form');

                // if ( isCheckoutAddress ) {

                console.log('PCM2 national init with the config:', pcm2_config);

                pcm2_addLookup();
                // }

            } else {
                console.log('PCM2 national not enabled');
            }
        }

    };
}));