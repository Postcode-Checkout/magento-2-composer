(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        root.PCM2_National = factory();
    }
}(this, function () {
    'use strict';

    var fields, elements, validationFields, oldAddition; // Declare variables at module level
    var initializedForms = []; // Track initialized forms to prevent duplicates

    function pcm2_addLookup() {

        // Get all country fields (shipping and billing)
        var countryFields = document.querySelectorAll('select[name="country_id"]');

        pcm2_log('Found country fields:', countryFields.length);

        if (countryFields.length === 0) {
            pcm2_log('PCM2 no country fields found');
            return;
        }

        // Process each country field
        countryFields.forEach(function (countryField, index) {
            // Create unique identifier for this form
            var formId = pcm2_getFormIdentifier(countryField);

            // Skip if already initialized
            if (initializedForms.indexOf(formId) !== -1) {
                pcm2_log('PCM2 form already initialized:', formId);
                return;
            }

            pcm2_log('PCM2 initializing form:', formId, 'country:', countryField.value);

            var countryCode = countryField.value;

            // Remove existing event listener if present to prevent duplicates
            if (countryField.pcm2ChangeHandler) {
                countryField.removeEventListener('change', countryField.pcm2ChangeHandler);
            }

            // Create new change handler
            countryField.pcm2ChangeHandler = function (event) {
                var newCountryCode = event.target.value;
                pcm2_log('PCM2 country changed to:', newCountryCode, 'in form:', formId);

                // Check if country is supported
                if (pcm2_isSupportedCountry(newCountryCode)) {
                    pcm2_log('PCM2 country is supported, adding postcode lookup');
                    pcm2_hideForm(event.target);
                } else {
                    pcm2_log('PCM2 country is not supported, no postcode lookup');
                    // Show default fields again
                    pcm2_showForm(event.target);
                }
            };

            // Add event listener to country field
            countryField.addEventListener('change', countryField.pcm2ChangeHandler);

            // Check if country is supported for initial load
            if (pcm2_isSupportedCountry(countryCode)) {
                pcm2_log('PCM2 country is supported, adding postcode lookup for:', formId);
                pcm2_hideForm(countryField);
            } else {
                pcm2_log('PCM2 country is not supported, no postcode lookup for:', formId);
            }

            // Mark form as initialized
            initializedForms.push(formId);
        });

        // Add event listener to pcm2 buttons
        document.addEventListener('click', function (event) {
            if (event.target && event.target.id.startsWith('pcm2_autocomplete_manualbtn')) {
                pcm2_log('PCM2 manual button clicked, showing default fields');
                // Find the related country field for this button
                var buttonId = event.target.id;
                var suffix = buttonId.replace('pcm2_autocomplete_manualbtn', '');
                var relatedCountryField = pcm2_findCountryFieldBySuffix(suffix);
                pcm2_showForm(relatedCountryField, true);
            }

            if (event.target && event.target.id.startsWith('pcm2_autocomplete_autobtn')) {
                pcm2_log('PCM2 auto button clicked, showing postcode lookup fields');
                // Find the related country field for this button
                var buttonId = event.target.id;
                var suffix = buttonId.replace('pcm2_autocomplete_autobtn', '');
                var relatedCountryField = pcm2_findCountryFieldBySuffix(suffix);
                pcm2_hideForm(relatedCountryField, true);

                pcm2_doLookup(relatedCountryField);
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
            if (event.target && (
                event.target.id.startsWith('pcm2_autocomplete_postcode') ||
                event.target.id.startsWith('pcm2_autocomplete_housenumber')
            )) {
                pcm2_log('PCM2 input detected on:', event.target.id, 'value:', event.target.value);
                debouncedHandleInput(event.target);
            }
        };

        // Add global event listener using delegation
        document.addEventListener('input', window.pcm2GlobalInputHandler);

        pcm2_log('PCM2 global event delegation setup complete');

        // Test if fields exist
        var postcode = document.getElementById('pcm2_autocomplete_postcode');
        var housenumber = document.getElementById('pcm2_autocomplete_housenumber');

        if (postcode && housenumber) {
            pcm2_log('PCM2 fields found - postcode:', postcode.value, 'housenumber:', housenumber.value);
        } else {
            pcm2_log('PCM2 fields not found yet - will work when created');
        }
    }

    // Check for input on our fields
    function pcm2_doLookup(contextElement) {
        pcm2_log('PCM2 lookup triggered');

        var contextCountryField = null;
        var suffix = '';

        // Determine context from the triggering element
        if (contextElement) {
            if (contextElement.id && contextElement.id.includes('pcm2_autocomplete_')) {
                // Extract suffix from field ID
                var fieldId = contextElement.id;
                var baseName = fieldId.replace(/_[a-zA-Z0-9]+addressform$/, '').replace(/pcm2_autocomplete_(postcode|housenumber)/, '');
                suffix = fieldId.replace('pcm2_autocomplete_postcode', '').replace('pcm2_autocomplete_housenumber', '');
                contextCountryField = pcm2_findCountryFieldBySuffix(suffix);
            } else if (contextElement.tagName === 'SELECT' && contextElement.name === 'country_id') {
                // Direct country field
                contextCountryField = contextElement;
                var formId = pcm2_getFormIdentifier(contextCountryField);
                suffix = formId !== 'default' ? '_' + formId.replace(/[^a-zA-Z0-9]/g, '') : '';
            }
        }

        // Get our input fields with suffix
        var postcodeField = document.getElementById('pcm2_autocomplete_postcode' + suffix);
        var housenumberField = document.getElementById('pcm2_autocomplete_housenumber' + suffix);

        // Exit if fields don't exist
        if (!postcodeField || !housenumberField) {
            pcm2_log('PCM2 fields not found, aborting lookup. Suffix:', suffix);
            return;
        }

        // Get validation fields
        validationFields = pcm2_getValidationFields(contextCountryField);

        // Clear previous results
        validationFields.resultWrapper.innerHTML = '';

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
                            var response = JSON.parse(this.responseText);
                            pcm2_log('PCM2 lookup response:', response);

                            // Handle the successful response
                            if (response && response.status === true && response.result.street) {
                                pcm2_fillAddressFields(response.result, contextCountryField, addition);
                            } else {
                                pcm2_log('PCM2 No address found for the given postcode and housenumber');
                                pcm2_updatePreview(true, contextCountryField);
                            }
                        } catch (e) {
                            pcm2_log('PCM2 Invalid JSON response', e);

                            // Update preview with error message
                            pcm2_updatePreview(true, contextCountryField);
                        }
                    } else {
                        pcm2_log('PCM2 Request failed:', this);
                        pcm2_updatePreview(true, contextCountryField);
                    }
                }
            };

            xhr.onerror = function () {
                pcm2_log('PCM2 Network error');

                pcm2_updatePreview(true, contextCountryField);

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

    function pcm2_fillAddressFields(result, contextCountryField, addition) {
        fields = pcm2_getFields(contextCountryField);
        validationFields = pcm2_getValidationFields(contextCountryField);

        pcm2_log('PCM2 filling address fields with result:', result);


        // Check if we have a result, empty array?
        if (!result || Object.keys(result).length === 0) {
            pcm2_log('PCM2 no result found');

            pcm2_updatePreview(true, contextCountryField);
        } else {
            // Check additions
            if (result.addition && Array.isArray(result.addition) && result.addition.length > 0 && result.addition !== '') {
                pcm2_log('Found additions to place in the select:', result.addition);
                pcm2_setHouseNumberAdditions(result.addition, contextCountryField);
            } else {
                result.addition = addition;
                pcm2_changeHousenumberAddition(result.addition, contextCountryField);
            }

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
        }


        if (fields.postcode) {
            fields.postcode.value = result.postcode;
            pcm2_log('PCM2 set postcode to:', result.postcode, 'for form');
        } else {
            pcm2_log('PCM2 postcode field not found');
        }

        if (fields.city) {
            fields.city.value = result.city;
            pcm2_log('PCM2 set city to:', result.city, 'for form');
        } else {
            pcm2_log('PCM2 city field not found');
        }

        if (fields.region && result.province) {
            fields.region.value = result.province;
            pcm2_log('PCM2 set region to:', result.province, 'for form');
        }

        // Trigger change events in case there are any listeners
        ['address_1', 'address_2', 'address_3', 'postcode', 'city', 'region'].forEach(function (fieldName) {
            if (fields[fieldName]) {
                var event = new Event('change', { bubbles: true });
                fields[fieldName].dispatchEvent(event);
            }
        });

        pcm2_updatePreview(false, contextCountryField);
    }


    function pcm2_updatePreview(errorMsg = false, contextCountryField = null) {

        var contextFields = pcm2_getFields(contextCountryField);
        var contextValidationFields = pcm2_getValidationFields(contextCountryField);

        if (errorMsg) {
            if (contextValidationFields.resultWrapper) {
                contextValidationFields.resultWrapper.innerHTML = '<p style="color:red;">Adres kon niet worden gevonden, controleer Postcode en Huisnummer of voer handmatig in.</p>';
            }
            return;
        }

        if (!contextFields.address_1 || !contextValidationFields.resultWrapper) {
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

        contextValidationFields.resultWrapper.innerHTML = html;
    }

    function pcm2_setHouseNumberAdditions(additions, contextCountryField) {

        console.log('PCM2 setting housenumber additions:', additions);

        // Get the correct validation fields for this context
        var contextValidationFields = pcm2_getValidationFields(contextCountryField);

        // Check if elements exist
        if (!contextValidationFields.housenumberAddition || !contextValidationFields.housenumberAdditionWrapper) {
            pcm2_log('PCM2 housenumber addition elements not found for context');
            return;
        }

        // Clear existing options
        contextValidationFields.housenumberAddition.innerHTML = '';

        // Show the wrapper
        contextValidationFields.housenumberAdditionWrapper.style.display = 'block';

        // Loop through additions and create options
        additions.forEach(function (addition, index) {

            if (index === 0 && addition === "") {

                var option = document.createElement('option');
                option.value = "";
                option.text = "Geen toevoeging";
                contextValidationFields.housenumberAddition.appendChild(option);
            } else {
                var option = document.createElement('option');
                option.value = addition;
                option.text = addition;
                contextValidationFields.housenumberAddition.appendChild(option);
            }
        });

        var defaultOption = additions.find(function (v, i) { return i > 0 && v !== ""; }) || additions[0] || "";

        console.log('PCM2 default housenumber addition option:', defaultOption);

        // Change select to the default option
        contextValidationFields.housenumberAddition.value = defaultOption;

        // Change housenumber addition in form
        pcm2_changeHousenumberAddition(defaultOption, contextCountryField);

        // Remove existing event listener to prevent duplicates
        if (contextValidationFields.housenumberAddition.pcm2ChangeHandler) {
            contextValidationFields.housenumberAddition.removeEventListener('change', contextValidationFields.housenumberAddition.pcm2ChangeHandler);
        }

        // Event listener for change
        contextValidationFields.housenumberAddition.pcm2ChangeHandler = function (event) {
            var selectedAddition = event.target.value;
            pcm2_log('PCM2 housenumber addition changed to:', selectedAddition);
            pcm2_changeHousenumberAddition(selectedAddition, contextCountryField);
            // Update preview after changing addition
            pcm2_updatePreview(false, contextCountryField);
        };

        contextValidationFields.housenumberAddition.addEventListener('change', contextValidationFields.housenumberAddition.pcm2ChangeHandler);

    }

    function pcm2_changeHousenumberAddition(value, contextCountryField) {

        var contextFields = pcm2_getFields(contextCountryField);
        var formId = pcm2_getFormIdentifier(contextCountryField);
        var suffix = formId !== 'default' ? '_' + formId.replace(/[^a-zA-Z0-9]/g, '') : '';

        var street = contextFields.address_1.value;
        var housenumberField = document.getElementById('pcm2_autocomplete_housenumber' + suffix);
        var housenumber = housenumberField ? housenumberField.value : '';
        var addition = value || '';

        var trimmedStreet = street.replace(/\s+\d+.*$/, '');

        if (pcm2_config.housenumber_addition_address2 == 0) {

            // Everything on street 1 field
            contextFields.address_1.value = trimmedStreet + ' ' + housenumber;
            if (addition) {
                contextFields.address_1.value += ' ' + addition;
            }
        } else if (pcm2_config.housenumber_addition_address2 == 1) {
            contextFields.address_2.value = addition;
        } else if (pcm2_config.housenumber_addition_address2 == 2) {
            if (addition) {
                // Remove addition from address_2 if it was previously set
                if (oldAddition) {
                    var regex = new RegExp('\\s*' + oldAddition + '$');
                    contextFields.address_2.value = contextFields.address_2.value.replace(regex, '').trim();
                }

                contextFields.address_2.value += ' ' + addition;
            }
        } else {

            if (addition) {
                contextFields.address_3.value = addition;
            } else {
                contextFields.address_3.value = '';
            }
        }

        oldAddition = addition;

        // Trigger change events on updated fields
        ['address_1', 'address_2', 'address_3'].forEach(function (fieldName) {
            if (contextFields[fieldName]) {
                var event = new Event('change', { bubbles: true });
                contextFields[fieldName].dispatchEvent(event);
            }
        });

        pcm2_updatePreview(false, contextCountryField);
    }

    function pcm2_hideForm(contextCountryField, defaultForm = false) {
        // Handle both old signature (boolean) and new signature (countryField, boolean)
        if (typeof contextCountryField === 'boolean') {
            defaultForm = contextCountryField;
            contextCountryField = document.querySelector('select[name="country_id"]');
        }

        fields = pcm2_getFields(contextCountryField);
        elements = pcm2_getElements(contextCountryField);
        validationFields = pcm2_getValidationFields(contextCountryField);

        // If checkbox, hide our fields and show default fields
        if (defaultForm) {
            pcm2_log('PCM2 checkbox is checked, hiding PCM2 fields and showing default fields');

            var domKeys = Object.keys(validationFields);

            for (var iDom = 0; iDom < domKeys.length; iDom++) {
                // Hide all fields, except the autoBtn, and addition fields
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
            // Create unique suffix for this form
            var formId = pcm2_getFormIdentifier(contextCountryField);
            var suffix = formId !== 'default' ? '_' + formId.replace(/[^a-zA-Z0-9]/g, '') : '';

            // Check if already exists to prevent duplicates
            if (document.getElementById('pcm2_autocomplete_postcode_wrapper' + suffix)) {
                pcm2_log('PCM2 form already exists for:', formId);
                return;
            }

            // Hide address fields
            var html =
                '<div class="field" id="pcm2_autocomplete_postcode_wrapper' + suffix + '">' +
                '  <label class="label" for="pcm2_autocomplete_postcode' + suffix + '"><span>Postcode</span></label>' +
                '  <div class="control"><input id="pcm2_autocomplete_postcode' + suffix + '" name="pcm2_autocomplete_postcode' + suffix + '" type="text" class="input-text" required /></div>' +
                '</div>' +
                '<div class="field" id="pcm2_autocomplete_housenumber_wrapper' + suffix + '">' +
                '  <label class="label" for="pcm2_autocomplete_housenumber' + suffix + '"><span>' + (pcm2_config.provider.includes('postcodenl') ? 'huisnummer' : 'huisnummer + toevoeging') + '</span></label>' +
                '  <div class="control"><input id="pcm2_autocomplete_housenumber' + suffix + '" name="pcm2_autocomplete_housenumber' + suffix + '" type="text" class="input-text" required /></div>' +
                '</div>' +
                '<div class="field" id="pcm2_autocomplete_housenumber_addition_wrapper' + suffix + '" style="display: none;">' +
                '   <label class="label" for="pcm2_autocomplete_housenumber_addition' + suffix + '">Toevoeging</label>' +
                '   <div class="control"><select class="form-control form-control-select" type="select" class="input-text" name="pcm2_autocomplete_housenumber_addition' + suffix + '" id="pcm2_autocomplete_housenumber_addition' + suffix + '" value=""></select></div>' +
                '</div>' +
                '<div class="field" id="pcm2_autocomplete_result_wrapper' + suffix + '">' +
                '  <label class="label"><span></span></label>' +
                '  <div class="control" id="pcm2_autocomplete_result' + suffix + '"></div>' +
                '</div>' +
                '<div class="field"><div class="control">' +
                '  <button type="button" class="action secondary" id="pcm2_autocomplete_manualbtn' + suffix + '">handmatig invoeren</button> ' +
                '  <button type="button" class="action secondary" id="pcm2_autocomplete_autobtn' + suffix + '" style="display:none;">Automatisch invoeren</button>' +
                '</div></div>';

            elements.country.insertAdjacentHTML('beforebegin', html);
        }

        // Hide address fields
        var domKeys = Object.keys(fields);

        for (var iDom = 0; iDom < domKeys.length; iDom++) {

            // Hide the element, and empty the value, except for country
            if (domKeys[iDom] != 'country') {

                if (pcm2_config.empty_default_address_fields == 1) {
                    fields[domKeys[iDom]].value = '';
                }

                // If its address_2 or address_3 we skip this step
                if (domKeys[iDom] != 'address_2' && domKeys[iDom] != 'address_3') {
                    elements[domKeys[iDom]].style.display = 'none';
                }
            }
        }
    }

    function pcm2_showForm(contextCountryField, defaultForm = false) {
        // Handle both old signature (boolean) and new signature (countryField, boolean)
        if (typeof contextCountryField === 'boolean') {
            defaultForm = contextCountryField;
            contextCountryField = document.querySelector('select[name="country_id"]');
        }

        fields = pcm2_getFields(contextCountryField);
        elements = pcm2_getElements(contextCountryField);

        var domKeys = Object.keys(fields);

        for (var iDom = 0; iDom < domKeys.length; iDom++) {

            // Hide the element, and empty the value, except for country
            if (domKeys[iDom] != 'country') {

                // If its address_2 or address_3 we skip this step
                if (domKeys[iDom] != 'address_2' && domKeys[iDom] != 'address_3' && elements[domKeys[iDom]]) {
                    elements[domKeys[iDom]].style.display = 'block';
                }
            }
        }

        validationFields = pcm2_getValidationFields(contextCountryField);

        // Checkbox to show default form
        if (defaultForm) {

            var domKeys = Object.keys(validationFields);

            for (var iDom = 0; iDom < domKeys.length; iDom++) {
                // Hide all fields, except the autoBtn
                if (validationFields[domKeys[iDom]] && domKeys[iDom] != 'autoBtn') {
                    validationFields[domKeys[iDom]].style.display = 'none';
                } else if (validationFields[domKeys[iDom]]) {
                    // Display the other button
                    validationFields[domKeys[iDom]].style.display = 'block';
                }
            }
        } else {
            // Remove postcode lookup fields
            var domKeys = Object.keys(validationFields);

            for (var iDom = 0; iDom < domKeys.length; iDom++) {
                if (validationFields[domKeys[iDom]] && validationFields[domKeys[iDom]].remove) {
                    validationFields[domKeys[iDom]].remove();
                }
            }
        }

    }

    function pcm2_getFields(contextCountryField) {
        // Find the form context for this country field
        var formContext = contextCountryField ?
            (contextCountryField.closest('form') ||
                contextCountryField.closest('.checkout-shipping-address') ||
                contextCountryField.closest('.checkout-billing-address') ||
                contextCountryField.closest('.payment-method') ||
                contextCountryField.closest('[data-role="checkout-billing-address"]') ||
                contextCountryField.closest('.address-form') ||
                document)
            : document;

        fields = {
            address_1: formContext.querySelector('input[name="street[0]"]'),
            address_2: formContext.querySelector('input[name="street[1]"]'),
            address_3: formContext.querySelector('input[name="street[2]"]'),
            postcode: formContext.querySelector('input[name="postcode"]'),
            city: formContext.querySelector('input[name="city"]'),
            region: formContext.querySelector('input[name="region"]'),
            country: contextCountryField || formContext.querySelector('select[name="country_id"]')
        };

        return fields;
    }

    function pcm2_getElements(contextCountryField) {
        // Get fields first for this context
        var contextFields = pcm2_getFields(contextCountryField);

        elements = {
            // Since street 0,1,2 have a single parent fieldset, we need to get the parent element once
            address_1: contextFields.address_1 ? contextFields.address_1.closest('fieldset.street') : null,
            postcode: contextFields.postcode ? contextFields.postcode.closest('div.field') : null,
            city: contextFields.city ? contextFields.city.closest('div.field') : null,
            region: contextFields.region ? contextFields.region.closest('div.field') : null,
            country: contextFields.country ? contextFields.country.closest('div.field') : null,
        };

        return elements;
    }

    function pcm2_getValidationFields(contextCountryField) {
        // Create unique suffix based on form context
        var formId = contextCountryField ? pcm2_getFormIdentifier(contextCountryField) : 'default';
        var suffix = formId !== 'default' ? '_' + formId.replace(/[^a-zA-Z0-9]/g, '') : '';

        var validationFields = {
            postcodeWrapper: document.getElementById('pcm2_autocomplete_postcode_wrapper' + suffix),
            housenumberWrapper: document.getElementById('pcm2_autocomplete_housenumber_wrapper' + suffix),
            housenumberAdditionWrapper: document.getElementById('pcm2_autocomplete_housenumber_addition_wrapper' + suffix),
            housenumberAddition: document.getElementById('pcm2_autocomplete_housenumber_addition' + suffix),
            resultWrapper: document.getElementById('pcm2_autocomplete_result_wrapper' + suffix),
            manualBtn: document.getElementById('pcm2_autocomplete_manualbtn' + suffix),
            autoBtn: document.getElementById('pcm2_autocomplete_autobtn' + suffix)
        };

        return validationFields;
    }

    function pcm2_getFormIdentifier(countryField) {
        // Create unique identifier based on form context
        var form = countryField.closest('form') || countryField.closest('.checkout-shipping-address') ||
            countryField.closest('.checkout-billing-address') || countryField.closest('.address-form') ||
            countryField.closest('.payment-method') || countryField.closest('[data-role="checkout-billing-address"]');

        var identifier = '';

        if (form) {
            // Use form ID if available
            if (form.id) {
                identifier = form.id;
            }

            // Check for payment method specific billing forms
            var paymentMethod = form.closest('.payment-method') || form.querySelector('.payment-method') ||
                countryField.closest('[id*="payment_form_"]') || countryField.closest('[class*="payment-method"]');

            if (paymentMethod) {
                // Extract payment method code from various possible patterns
                var paymentCode = null;

                // Try to get from ID attribute
                if (paymentMethod.id) {
                    var match = paymentMethod.id.match(/payment[_-]?form[_-]?([a-zA-Z0-9_]+)/);
                    if (match) {
                        paymentCode = match[1];
                    }
                }

                // Try to get from class attribute
                if (!paymentCode && paymentMethod.className) {
                    var classMatch = paymentMethod.className.match(/payment[_-]?method[_-]?([a-zA-Z0-9_]+)/);
                    if (classMatch) {
                        paymentCode = classMatch[1];
                    }
                }

                // Try to find payment radio button
                if (!paymentCode) {
                    var radioButton = paymentMethod.querySelector('input[type="radio"][name="payment[method]"]');
                    if (radioButton && radioButton.value) {
                        paymentCode = radioButton.value;
                    }
                }

                // Try data attributes
                if (!paymentCode) {
                    paymentCode = paymentMethod.getAttribute('data-payment-method') ||
                        paymentMethod.getAttribute('data-method');
                }

                if (paymentCode) {
                    identifier = 'billing-' + paymentCode + '-form';
                } else {
                    identifier = 'billing-payment-form';
                }
            }
            // Check for general billing/shipping context
            else if (form.classList.contains('checkout-billing-address') ||
                form.querySelector('[name*="billing"]') ||
                countryField.name.includes('billing')) {
                identifier = 'billing-address-form';
            }
            else if (form.classList.contains('checkout-shipping-address') ||
                form.querySelector('[name*="shipping"]') ||
                countryField.name.includes('shipping')) {
                identifier = 'shipping-address-form';
            }
        }

        // Fallback: check field names for context
        if (!identifier) {
            var fieldName = countryField.name;
            if (fieldName.includes('billing')) {
                identifier = 'billing-address-form';
            } else if (fieldName.includes('shipping')) {
                identifier = 'shipping-address-form';
            }
        }

        // Ultimate fallback
        if (!identifier) {
            identifier = 'address-form-' + Array.from(document.querySelectorAll('select[name="country_id"]')).indexOf(countryField);
        }

        pcm2_log('PCM2 identified form as:', identifier, 'for country field:', countryField);
        return identifier;
    }

    function pcm2_findCountryFieldBySuffix(suffix) {
        // If no suffix, return first country field
        if (!suffix) {
            return document.querySelector('select[name="country_id"]');
        }

        // Find country field that matches this suffix
        var countryFields = document.querySelectorAll('select[name="country_id"]');
        for (var i = 0; i < countryFields.length; i++) {
            var formId = pcm2_getFormIdentifier(countryFields[i]);
            var expectedSuffix = '_' + formId.replace(/[^a-zA-Z0-9]/g, '');
            if (expectedSuffix === suffix) {
                return countryFields[i];
            }
        }

        // Fallback to first country field
        return countryFields[0] || null;
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

    // Observer to watch for dynamically added forms
    var formObserver;

    function pcm2_observeFormChanges() {
        // Disconnect existing observer if present
        if (formObserver) {
            formObserver.disconnect();
        }

        // Create new MutationObserver
        formObserver = new MutationObserver(function (mutations) {
            var shouldReinit = false;
            var newCountryFields = [];

            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList') {
                    // Check if new address forms were added
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === 1) { // Element node
                            // Look for new country fields that haven't been initialized yet
                            var countryFields = [];

                            if (node.matches && node.matches('select[name="country_id"]')) {
                                countryFields.push(node);
                            } else if (node.querySelector) {
                                var foundFields = node.querySelectorAll('select[name="country_id"]');
                                countryFields = Array.from(foundFields);
                            }

                            // Also check for payment method forms being added/shown
                            var isPaymentMethodForm = node.matches && (
                                node.matches('.payment-method') ||
                                node.matches('[id*="payment_form_"]') ||
                                node.matches('[data-role="checkout-billing-address"]') ||
                                node.matches('.checkout-billing-address')
                            );

                            // If it's a payment method form, look for country fields inside it
                            if (isPaymentMethodForm && node.querySelector) {
                                var paymentCountryFields = node.querySelectorAll('select[name="country_id"]');
                                countryFields = countryFields.concat(Array.from(paymentCountryFields));
                            }

                            // Check if any of these country fields are new
                            countryFields.forEach(function (countryField) {
                                var formId = pcm2_getFormIdentifier(countryField);
                                if (initializedForms.indexOf(formId) === -1) {
                                    pcm2_log('PCM2 detected new uninitialized country field for form:', formId);
                                    newCountryFields.push(countryField);
                                    shouldReinit = true;
                                }
                            });
                        }
                    });
                }
            });

            if (shouldReinit) {
                // Debounce reinitializations to avoid multiple calls
                clearTimeout(window.pcm2ReinitTimeout);
                window.pcm2ReinitTimeout = setTimeout(function () {
                    pcm2_log('PCM2 reinitializing due to DOM changes, new fields:', newCountryFields.length);
                    // Only reinitialize for new fields, not all fields
                    pcm2_initializeNewFields(newCountryFields);
                }, 100);
            }
        });

        // Start observing
        formObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        pcm2_log('PCM2 form observer started');
    }

    function pcm2_initializeNewFields(countryFields) {
        pcm2_log('PCM2 initializing new fields:', countryFields.length);

        countryFields.forEach(function (countryField) {
            var formId = pcm2_getFormIdentifier(countryField);

            // Skip if already initialized
            if (initializedForms.indexOf(formId) !== -1) {
                pcm2_log('PCM2 form already initialized:', formId);
                return;
            }

            pcm2_log('PCM2 initializing new form:', formId, 'country:', countryField.value);

            var countryCode = countryField.value;

            // Remove existing event listener if present to prevent duplicates
            if (countryField.pcm2ChangeHandler) {
                countryField.removeEventListener('change', countryField.pcm2ChangeHandler);
            }

            // Create new change handler
            countryField.pcm2ChangeHandler = function (event) {
                var newCountryCode = event.target.value;
                pcm2_log('PCM2 country changed to:', newCountryCode, 'in form:', formId);

                // Check if country is supported
                if (pcm2_isSupportedCountry(newCountryCode)) {
                    pcm2_log('PCM2 country is supported, adding postcode lookup');
                    pcm2_hideForm(event.target);
                } else {
                    pcm2_log('PCM2 country is not supported, no postcode lookup');
                    // Show default fields again
                    pcm2_showForm(event.target);
                }
            };

            // Add event listener to country field
            countryField.addEventListener('change', countryField.pcm2ChangeHandler);

            // Check if country is supported for initial load
            if (pcm2_isSupportedCountry(countryCode)) {
                pcm2_log('PCM2 country is supported, adding postcode lookup for:', formId);
                pcm2_hideForm(countryField);
            } else {
                pcm2_log('PCM2 country is not supported, no postcode lookup for:', formId);
            }

            // Mark form as initialized
            initializedForms.push(formId);
        });
    }

    function pcm2_checkForNewForms() {
        // Check if we need to reinitialize for new forms
        var newCountryFields = Array.from(document.querySelectorAll('select[name="country_id"]')).filter(function (field) {
            var formId = pcm2_getFormIdentifier(field);
            return initializedForms.indexOf(formId) === -1;
        });

        if (newCountryFields.length > 0) {
            pcm2_log('PCM2 found new country fields, initializing:', newCountryFields.length);
            pcm2_initializeNewFields(newCountryFields);
            return true;
        } else {
            pcm2_log('PCM2 no new forms found');
            return false;
        }
    }

    function pcm2_detectPageContext() {
        var context = {
            isCheckout: false,
        };

        // Detect checkout page
        if (document.body.classList.contains('checkout-index-index') ||
            typeof window.checkoutConfig !== 'undefined' ||
            document.querySelector('.checkout-container') ||
            document.querySelector('[data-role="checkout"]')) {
            context.isCheckout = true;
        }

        pcm2_log('PCM2 detected page context:', context);
        return context;
    }

    // Public API
    return {
        pcm2_init: function () {
            // Check if dom is ready
            if (typeof pcm2_config !== 'undefined' && pcm2_config.enabled == 1) {

                console.log("DOM fully loaded and parsed");

                var pageContext = pcm2_detectPageContext();

                pcm2_addLookup();

                // Start observing for dynamically added forms (primarily for checkout)
                if (pageContext.isCheckout) {
                    pcm2_observeFormChanges();

                    // Listen for checkout navigation events and payment method changes
                    document.addEventListener('click', function (event) {
                        // Check for step navigation buttons
                        if (event.target && (
                            event.target.matches('.button.action.continue') ||
                            event.target.matches('.action.action-edit-address') ||
                            event.target.matches('[data-role="opc-continue"]') ||
                            event.target.closest('.step-title')
                        )) {
                            pcm2_log('PCM2 detected checkout navigation, will check for reinit');
                            setTimeout(function () {
                                pcm2_checkForNewForms();
                            }, 500);
                        }

                        // Check for payment method radio button changes
                        if (event.target &&
                            event.target.type === 'radio' &&
                            event.target.name === 'payment[method]') {
                            pcm2_log('PCM2 detected payment method change to:', event.target.value);
                            setTimeout(function () {
                                pcm2_checkForNewForms();
                            }, 200);
                        }
                    });

                    // Also listen for change events on payment method radio buttons
                    document.addEventListener('change', function (event) {
                        if (event.target &&
                            event.target.type === 'radio' &&
                            event.target.name === 'payment[method]') {
                            pcm2_log('PCM2 detected payment method change via change event to:', event.target.value);
                            setTimeout(function () {
                                pcm2_checkForNewForms();
                            }, 300);
                        }
                    });

                    // Periodic check for new forms (fallback for dynamic loading)
                    var checkAttempts = 0;
                    var consecutiveEmptyChecks = 0;
                    var maxCheckAttempts = 30; // Stop after 1 minute (30 * 2 seconds)
                    var maxConsecutiveEmpty = 5; // Stop after 5 consecutive empty checks

                    var formCheckInterval = setInterval(function () {
                        checkAttempts++;
                        var foundNewForms = pcm2_checkForNewForms();

                        if (foundNewForms) {
                            consecutiveEmptyChecks = 0; // Reset counter if we found forms
                        } else {
                            consecutiveEmptyChecks++;
                        }

                        if (checkAttempts >= maxCheckAttempts ||
                            consecutiveEmptyChecks >= maxConsecutiveEmpty ||
                            (checkAttempts > 10 && consecutiveEmptyChecks >= 3)) {
                            clearInterval(formCheckInterval);
                            pcm2_log('PCM2 stopped periodic form checking after', checkAttempts, 'attempts, consecutive empty:', consecutiveEmptyChecks);
                        }
                    }, 2000);
                }

            } else {
                console.log('PCM2 national not enabled');
            }
        }

    };
}));