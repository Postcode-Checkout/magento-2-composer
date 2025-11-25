(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['Codebrainbv_PostcodeCheckout/js/vendor/autocompleteaddress'], factory);
    } else {
        root.PCM2_PostcodeEU = factory(root.PostcodeNl && root.PostcodeNl.AutocompleteAddress);
    }
}(this, function (AutocompleteAddress) {
    'use strict';

    var fields, elements, validationFields, countryCode; // Declare variables at module level
    var initializedForms = []; // Track initialized forms to prevent duplicates
    var autocompleteInstances = {};

    var placementHousenumberAdditions;// Track autocomplete instances per form

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
                countryCode = newCountryCode;

                // Check if country is supported
                if (pcm2_isSupportedCountry(countryCode)) {
                    pcm2_log('PCM2 country is supported, adding postcode lookup');
                    pcm2_hideForm(event.target);
                    pcm2_initLookup(event.target);
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
                pcm2_initLookup(countryField);
            } else {
                pcm2_log('PCM2 country is not supported, no postcode lookup for:', formId);
            }

            // Mark form as initialized
            initializedForms.push(formId);
        });

        // Add event listener to pcm2 buttons
        document.addEventListener('click', function (event) {
            if (event.target && event.target.id.startsWith('pcm2_autocomplete_manualbtn')) {
                var suffix = event.target.id.replace('pcm2_autocomplete_manualbtn', '');
                var relatedCountryField = pcm2_findCountryFieldBySuffix(suffix);

                pcm2_showForm(relatedCountryField, true);
            }

            if (event.target && event.target.id.startsWith('pcm2_autocomplete_autobtn')) {
                var suffix = event.target.id.replace('pcm2_autocomplete_autobtn', '');
                var relatedCountryField = pcm2_findCountryFieldBySuffix(suffix);

                pcm2_hideForm(relatedCountryField, false);
                pcm2_initLookup(relatedCountryField);
            }
        });
    }

    function pcm2_initLookup(contextCountryField) {
        if (!contextCountryField) {
            pcm2_log('PCM2 initLookup: No country field provided');
            return;
        }

        var countryCode = contextCountryField.value;
        var iso3Code = pcm2_convertIso2ToIso3(countryCode);
        var formId = pcm2_getFormIdentifier(contextCountryField);
        var suffix = formId !== 'default' ? '_' + formId.replace(/[^a-zA-Z0-9]/g, '') : '';

        pcm2_log('PCM2 initLookup for form:', formId, 'ISO3:', iso3Code);

        // Initialize autocomplete for international addresses
        const searchField = document.getElementById('pcm2_autocomplete_search' + suffix);

        if (!searchField) {
            pcm2_log('PCM2 search field not found:', 'pcm2_autocomplete_search' + suffix);
            return;
        }

        if (!AutocompleteAddress) {
            pcm2_log('PCM2 AutocompleteAddress not available');
            return;
        }

        // Create new autocomplete instance for this form
        var autocomplete = new AutocompleteAddress(searchField, {
            autocompleteUrl: config.pcm2_config.api_urls.international_suggest,
            addressDetailsUrl: config.pcm2_config.api_urls.international_details,
            autoFocus: true,
            autoSelect: true,
            showLogo: false,
            context: iso3Code
        });

        // Custom getSuggestions method with proper encoding
        autocomplete.getSuggestions = function (context, term, response) {
            pcm2_log('PCM2 Autocomplete getSuggestions called with context:', context);
            pcm2_log('PCM2 Autocomplete getSuggestions called with term:', term);

            // Encode the term to binary to preserve whitespace
            // and then encode it to base64 for the URL.
            const encodedTerm = new TextEncoder().encode(term),
                binaryTerm = Array.from(encodedTerm, (byte) => String.fromCodePoint(byte)).join(''),
                url = this.options.autocompleteUrl.replace('${context}', encodeURIComponent(context)).replace('${term}', encodeURIComponent(btoa(binaryTerm)));

            return this.xhrGet(url, response);
        };

        // Custom getDetails method
        autocomplete.getDetails = function (addressId, response) {
            pcm2_log('PCM2 Autocomplete getDetails called with addressId:', addressId);

            const url = this.options.addressDetailsUrl.replace('${context}', encodeURIComponent(addressId));
            return this.xhrGet(url, response);
        };

        // Handle address selection
        searchField.addEventListener('autocomplete-select', function (event) {
            // Set value of the search field to the selected address
            searchField.value = event.detail.label;

            pcm2_log('Autocomplete-select event: ', event);

            if (event.detail.precision === 'Address') {
                autocomplete.getDetails(event.detail.context, function (response) {
                    if (response) {
                        var addressData = response.result;
                        pcm2_log('Address to be entered: ', addressData);
                        pcm2_fillAddressFields(addressData, contextCountryField);
                    } else {
                        pcm2_log('No address data found in response:', response);
                        pcm2_updatePreview(true, contextCountryField);
                    }
                });
            }
        });

        // Store autocomplete instance for this form
        autocompleteInstances[formId] = autocomplete;
    }

    function pcm2_hideForm(contextCountryField, defaultForm = false) {
        if (typeof contextCountryField === 'boolean') {
            defaultForm = contextCountryField;
            contextCountryField = document.querySelector('select[name="country_id"]');
        }

        fields = pcm2_getFields(contextCountryField);
        elements = pcm2_getElements(contextCountryField);

        var formId = pcm2_getFormIdentifier(contextCountryField);
        var suffix = formId !== 'default' ? '_' + formId.replace(/[^a-zA-Z0-9]/g, '') : '';

        validationFields = pcm2_getValidationFields(contextCountryField);
        if (!validationFields.searchWrapper) {
            var html =
                '<div class="field" id="pcm2_autocomplete_search_wrapper' + suffix + '">' +
                '  <label class="label" for="pcm2_autocomplete_search' + suffix + '"><span>' + translate.pcm2_translations.search +'</span></label>' +
                '  <div class="control">' +
                '    <input id="pcm2_autocomplete_search' + suffix + '" name="pcm2_autocomplete_search' + suffix + '" type="text" class="input-text" placeholder="' + translate.pcm2_translations.placeholder_search +'" required />' +
                '  </div>' +
                '</div>' +
                '<div class="field" id="pcm2_autocomplete_result_wrapper' + suffix + '">' +
                '  <label class="label"><span></span></label>' +
                '  <div class="control" id="pcm2_autocomplete_result' + suffix + '"></div>' +
                '</div>' +
                '<div class="field"><div class="control">' +
                '  <button type="button" class="action secondary" id="pcm2_autocomplete_manualbtn' + suffix + '"> ' + translate.pcm2_translations.manual + ' </button> ' +
                '  <button type="button" class="action secondary" id="pcm2_autocomplete_autobtn' + suffix + '" style="display:none;"> ' + translate.pcm2_translations.automatic + ' </button>' +
                '</div></div>';
            elements.country.insertAdjacentHTML('beforebegin', html);
            validationFields = pcm2_getValidationFields(contextCountryField); 
        }

        if (validationFields.searchWrapper) validationFields.searchWrapper.style.display = 'block';
        if (validationFields.resultWrapper) validationFields.resultWrapper.style.display = 'block';
        if (validationFields.manualBtn) validationFields.manualBtn.style.display = 'inline-block';
        if (validationFields.autoBtn) validationFields.autoBtn.style.display = 'none';

        var keys = Object.keys(fields);
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (k === 'country') continue;
            if (k === 'address_2' || k === 'address_3') continue;
            var form = elements[k];
            if (form) form.style.display = 'none';
        }

        if (!autocompleteInstances[formId]) {
            pcm2_initLookup(contextCountryField);
        }
    }

    function pcm2_clearAllAddressFields(contextCountryField) {
        const suffix = pcm2_getSuffix(contextCountryField);
        const fields = pcm2_getFields(contextCountryField);

        const dispatchInputAndChange = (addressfield) => {
            // alleen als er echt een element is met een value-achtige eigenschap
            if (!addressfield) return;
            addressfield.dispatchEvent(new Event('input', { bubbles: true }));
            addressfield.dispatchEvent(new Event('change', { bubbles: true }));
        };

        // zoekveld leegmaken
        const searchField = document.getElementById(`pcm2_autocomplete_search${suffix}`);
        if (searchField) {
            searchField.value = '';
            dispatchInputAndChange(searchField);
        }

        // resultaten leegmaken
        const resultElement = document.getElementById(`pcm2_autocomplete_result${suffix}`);
        if (resultElement) {
            resultElement.innerHTML = '';
        }

        // adresvelden leegmaken
        const keysToClear = ['address_1', 'address_2', 'address_3', 'postcode', 'city', 'region'];
        for (const key of keysToClear) {
            const addressfield = fields?.[key];
            if (addressfield) {
                addressfield.value = '';
                dispatchInputAndChange(addressfield);
            }
        }

        // logging
        const countryEl = fields?.country || contextCountryField;
        pcm2_log(
            `PCM2 cleared all address fields for form: ${pcm2_getFormIdentifier(countryEl)}`
        );
    }

    function pcm2_getSuffix(contextCountryField) {
        var formId = pcm2_getFormIdentifier(contextCountryField);
        return formId !== 'default' ? '_' + formId.replace(/[^a-zA-Z0-9]/g, '') : '';
    }

    function pcm2_fillAddressFields(result, contextCountryField) {
        fields = pcm2_getFields(contextCountryField);
        validationFields = pcm2_getValidationFields(contextCountryField);

        pcm2_log('PCM2 filling address fields with result:', result);

        // Check if we have a result, empty array?
        if (!result || Object.keys(result).length === 0) {
            pcm2_log('PCM2 no result found');
            pcm2_updatePreview(true, contextCountryField);
        } else {

            // Fill address fields based on configuration
            if (placementHousenumberAdditions == 0) {
                fields.address_1.value = result.street;
                fields.address_1.value += ' ' + result.housenumber + (result.addition ? ' ' + result.addition : '');
            } else if (placementHousenumberAdditions == 1) {
                fields.address_1.value = result.street + ' ' + result.housenumber;
                fields.address_2.value = (result.addition ? ' ' + result.addition : '');

            } else if (placementHousenumberAdditions == 2) {
                fields.address_1.value = result.street;
                fields.address_2.value = result.housenumber + (result.addition ? ' ' + result.addition : '');
            } else if (placementHousenumberAdditions == 3) {
                fields.address_1.value = result.street;
                fields.address_2.value = result.housenumber;
                fields.address_3.value = (result.addition ? ' ' + result.addition : '');
            }

            fields.postcode.value = result.postcode;
            fields.city.value = result.city;


            // Trigger change events in case there are any listeners
            ['address_1', 'address_2', 'address_3', 'postcode', 'city', 'region'].forEach(function(fieldName) {
                if (fields[fieldName]) {
                    var event = new Event('change', { bubbles: true });
                    fields[fieldName].dispatchEvent(event);
                }   
            });

            pcm2_updatePreview(false, contextCountryField);
        }
    }

    function pcm2_updatePreview(errorMsg = false, contextCountryField) {
        fields = pcm2_getFields(contextCountryField);
        validationFields = pcm2_getValidationFields(contextCountryField);

        var suffix = pcm2_getSuffix(contextCountryField);
        var resultElement = document.getElementById('pcm2_autocomplete_result' + suffix);

        if (!resultElement) {
            pcm2_log('PCM2 result element not found');
            return;
        }

        if (errorMsg) {
            resultElement.innerHTML = '<p style="color:red;">Address could not be found, please check or enter manually.</p>';
            return;
        }

        var html = '';
        html += '<p>' + fields.address_1.value;

        if (fields.address_2 && fields.address_2.value) {
            html += ' ' + fields.address_2.value;
        }

        if (fields.address_3 && fields.address_3.value) {
            html += ' ' + fields.address_3.value;
        }

        html += '<br>' + fields.postcode.value + ' ' + fields.city.value + '</p>';

        resultElement.innerHTML = html;
    }

    function pcm2_showForm(contextCountryField, defaultForm = false) {
        if (typeof contextCountryField === 'boolean') {
            defaultForm = contextCountryField;
            contextCountryField = document.querySelector('select[name="country_id"]');
        }

        fields = pcm2_getFields(contextCountryField);
        elements = pcm2_getElements(contextCountryField);
        validationFields = pcm2_getValidationFields(contextCountryField);

        var keys = Object.keys(fields);
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (k === 'country') continue;
            if (k === 'address_2' || k === 'address_3') continue;
            var form = elements[k];
            if (form) form.style.display = 'block';
        }

        if (validationFields.searchWrapper) validationFields.searchWrapper.style.display = 'none';
        if (validationFields.resultWrapper) validationFields.resultWrapper.style.display = 'none';
        if (validationFields.manualBtn) validationFields.manualBtn.style.display = 'none';
        if (validationFields.autoBtn) validationFields.autoBtn.style.display = 'inline-block';
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
            address_2: contextFields.address_2 ? contextFields.address_2.closest('fieldset.street') : null,
            address_3: contextFields.address_3 ? contextFields.address_3.closest('fieldset.street') : null,
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

            searchWrapper: document.getElementById('pcm2_autocomplete_search_wrapper' + suffix),
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
            if (typeof config.pcm2_config !== 'undefined' && config.pcm2_config.enabled === true) {

                pcm2_log(config.pcm2_config);

                placementHousenumberAdditions = config.pcm2_config.housenumber_addition_address2;

                pcm2_log("DOM fully loaded and parsed");

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
                    var maxConsecutiveEmpty = 1; // Stop after 5 consecutive empty checks

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
                console.warn('PCM2 international not enabled');
            }
        }

    };
}));