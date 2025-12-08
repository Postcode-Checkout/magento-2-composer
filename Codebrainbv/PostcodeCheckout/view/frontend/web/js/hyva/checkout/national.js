var validationFields, oldAddition; // Declare variables at module level
var placementHousenumberAdditions = pcm2_config.housenumber_addition_address2;
var sectionObservers = {}; // Track MutationObservers for each section

function pcm2_addLookup(pcm2_Section, countryElement) {
    if (!countryElement) {
        console.log("Country element not found for section: " + pcm2_Section);
        return;
    }

    countryCode = countryElement.value;

    console.log("Country set to: " + countryCode + " for section: " + pcm2_Section);

    // Add event listener to country field
    countryElement.addEventListener('change', function (event) {
        var newCountryCode = event.target.value;
        pcm2_log('country changed to:', newCountryCode);
        countryCode = newCountryCode;

        // Setup observer to watch for DOM rebuild after country change
        pcm2_setupSectionObserver(pcm2_Section, newCountryCode);

        // Check if country is supported
        if (pcm2_isSupportedCountry(countryCode)) {
            pcm2_log('country is supported, adding postcode lookup');
            pcm2_hideForm(pcm2_Section);
        } else {
            pcm2_log('country is not supported, no postcode lookup');
            // Show default fields again
            pcm2_showForm(pcm2_Section);
        }
    });

    // Check if country is supported
    if (pcm2_isSupportedCountry(countryCode)) {
        pcm2_log('country is supported, adding postcode lookup');

        // Add postcode lookup
        pcm2_hideForm(pcm2_Section);
    } else {
        pcm2_log('country is not supported, no postcode lookup');
        return;
    }

    // Add event listener to pcm2 buttons
    document.addEventListener('click', function (event) {
        if (event.target && event.target.id === 'pcm2_' + pcm2_Section + '_autocomplete_manualbtn') {
            pcm2_log('manual button clicked, showing default fields');

            pcm2_showForm(pcm2_Section, true);
        }

        if (event.target && event.target.id === 'pcm2_' + pcm2_Section + '_autocomplete_autobtn') {
            pcm2_log('auto button clicked, showing postcode lookup fields');

            pcm2_hideForm(pcm2_Section, true);
        }
    });

    // Initialize lookup functionality
    pcm2_initLookup(pcm2_Section);
}

function pcm2_initLookup(pcm2_Section) {
    pcm2_log('PCM2 initializing lookup functionality with event delegation');

    document.addEventListener('input', function (event) {
        setTimeout(function () {
            if (event.target && (event.target.id === 'pcm2_' + pcm2_Section + '_autocomplete_postcode' ||
                event.target.id === 'pcm2_' + pcm2_Section + '_autocomplete_housenumber')) {
                pcm2_doLookup(pcm2_Section);
            }
        }, 250);
    });

    pcm2_log('PCM2 global event delegation setup complete');

    // Test if fields exist
    var postcode = document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_postcode');
    var housenumber = document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_housenumber');

    if (postcode && housenumber) {
        pcm2_log('PCM2 fields found - postcode:', postcode.value);
        pcm2_log('PCM2 fields found - housenumber:', housenumber.value);

        // If fields are pre-filled, do a lookup
        if (postcode.value.trim() !== '' && housenumber.value.trim() !== '') {
            pcm2_log('PCM2 fields are pre-filled, doing initial lookup');
            pcm2_doLookup(pcm2_Section);
        }
    } else {
        pcm2_log('PCM2 fields not found yet - will work when created');
    }
}

// Check for input on our fields
function pcm2_doLookup(pcm2_Section) {
    pcm2_log('PCM2 lookup triggered');

    // Get our input fields
    var postcodeField = document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_postcode');
    var housenumberField = document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_housenumber');

    // Exit if fields don't exist
    if (!postcodeField || !housenumberField) {
        pcm2_log('PCM2 fields not found, aborting lookup');
        return;
    }

    // Get values from our 2 validation fields
    validationFields = pcm2_getValidationFields(pcm2_Section);

    // Clear previous results
    if (validationFields.resultWrapper) {
        validationFields.resultWrapper.innerHTML = '';
    }

    var postcode = postcodeField.value.trim().toUpperCase().replace(/\s+/g, '');
    var housenumber = housenumberField.value.trim();

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
                        sOldAddition = null;
                        var response = JSON.parse(this.responseText);
                        pcm2_log('PCM2 lookup response:', response);

                        // Handle the successful response
                        if (response && response.status === true && response.result.street) {
                            pcm2_fillAddressFields(pcm2_Section, response.result);
                        } else {
                            pcm2_log('PCM2 No address found for the given postcode and housenumber');
                            pcm2_updatePreview(pcm2_Section, true);
                        }
                    } catch (e) {
                        pcm2_log('PCM2 Invalid JSON response', e);

                        // Update preview with error message
                        pcm2_updatePreview(pcm2_Section, true);
                    }
                } else {
                    pcm2_log('PCM2 Request failed:', this);
                    pcm2_updatePreview(pcm2_Section, true);
                }
            }
        };

        xhr.onerror = function () {
            pcm2_log('PCM2 Network error');

            pcm2_updatePreview(pcm2_Section, true);
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

function pcm2_fillAddressFields(pcm2_Section, result) {
    fields = pcm2_getFields(pcm2_Section);
    validationFields = pcm2_getValidationFields(pcm2_Section);

    pcm2_log('PCM2 filling address fields with result:', result);

    // Check if we have a result, empty array?
    if (!result || Object.keys(result).length === 0) {
        pcm2_log('PCM2 no result found');

        pcm2_updatePreview(pcm2_Section, true);
    } else {

        // Fill address fields based on configuration
        if (placementHousenumberAdditions == 0) {
            setValue(fields.address_1, result.street);
            setValue(fields.address_1, fields.address_1.value + ' ' + result.housenumber);
        } else if (placementHousenumberAdditions == 1) {
            setValue(fields.address_1, result.street + ' ' + result.housenumber);
            setValue(fields.address_2, '');
        } else if (placementHousenumberAdditions == 2) {
            setValue(fields.address_1, result.street);
            setValue(fields.address_2, result.housenumber);
        } else if (placementHousenumberAdditions == 3) {
            setValue(fields.address_1, result.street);
            setValue(fields.address_2, result.housenumber);
        }

        // Check additions
        if (result.addition && Array.isArray(result.addition) && result.addition.length > 0) {
            pcm2_log('Found additions to place in the select:', result.addition);
            pcm2_setHouseNumberAdditions(pcm2_Section, result.addition);
        } else {
            pcm2_changeHousenumberAddition(pcm2_Section, result.addition);
        }

        setValue(fields.postcode, result.postcode);
        setValue(fields.city, result.city);

        pcm2_updatePreview(pcm2_Section);
    }
}

function setValue(field, value) {
    if (!field) return;

    field.value = value;
    field.defaultValue = value;

    if (field._x_model) {
        field._x_model.set(value);
    }

    if (field.magewire) {
        const model = field.getAttribute("wire:model.defer") || field.getAttribute("wire:model");
        if (model) {
            field.magewire.$entangle(model).set(value);
        }
    }
}

function pcm2_updatePreview(pcm2_Section, errorMsg = false) {

    fields = pcm2_getFields(pcm2_Section);
    validationFields = pcm2_getValidationFields(pcm2_Section);

    validationFields.resultWrapper.style.display = 'block';

    if (errorMsg) {
        validationFields.resultWrapper.innerHTML = '<p style="color:red;">Adres kon niet worden gevonden, controleer Postcode en Huisnummer of voer handmatig in.</p>';
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
    html += '</p>';
    html += '<p>' + fields.postcode.value + ' ' + fields.city.value + '</p>';

    validationFields.resultWrapper.innerHTML = html;
}

function pcm2_setHouseNumberAdditions(pcm2_Section, aAdditions) {
    // Ensure validation fields exist
    if (!validationFields || !validationFields.housenumberAddition) {
        validationFields = pcm2_getValidationFields(pcm2_Section);
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
            pcm2_changeHousenumberAddition(pcm2_Section, defaultValue);
        }
    } else if (validAdditions.length > 1) {
        // Multiple options: show wrapper, preselect default, and bind change
        wrapper.style.display = 'block';
    }

    // Add event listener to the select field
    validationFields.housenumberAddition.addEventListener('change', function (event) {
        var selectedValue = event.target.value;
        pcm2_log('PCM2 housenumber addition changed to:', selectedValue);
        pcm2_changeHousenumberAddition(pcm2_Section, selectedValue);
    });
}

function pcm2_changeHousenumberAddition(pcm2_Section, selectedValue) {
    // Normalize/guard
    if (typeof selectedValue === 'undefined' || selectedValue === null) {
        return;
    }

    fields = pcm2_getFields(pcm2_Section);

    var street = fields.address_1.value;
    var housenumber = document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_housenumber').value;
    var addition = selectedValue || '';

    var trimmedStreet = street.replace(/\s+\d+.*$/, '');

    if (placementHousenumberAdditions == 0) {

        // Everything on street 1 field
        let val = trimmedStreet + ' ' + housenumber;

        if (addition) {
            val += ' ' + addition;
        }

        setValue(fields.address_1, val);

    } else if (placementHousenumberAdditions == 1) {
        fields.address_2.value = addition;
    } else if(placementHousenumberAdditions == 2) {
        if (addition) {
            // Remove addition from address_2 if it was previously set
            if (oldAddition) {
                var regex = new RegExp('\\s*' + oldAddition + '$');
                fields.address_2.value = fields.address_2.value.replace(regex, '').trim();
            }

            fields.address_2.value += ' ' + addition;
        }

        if (addition) {
            val = (val + ' ' + addition).trim();
        }

        oldAddition = addition;

        pcm2_updatePreview(pcm2_Section);
    }
}

function pcm2_hideForm(pcm2_Section, defaultForm = false) {
    // Add param to find out if its the shipping or billing form
    fields = pcm2_getFields(pcm2_Section);
    elements = pcm2_getElements(pcm2_Section);
    validationFields = pcm2_getValidationFields(pcm2_Section);

    // If checkbox, hide our fields and show default fields
    if (defaultForm) {
        pcm2_log('PCM2 checkbox is checked, hiding PCM2 fields and showing default fields');

        var domKeys = Object.keys(validationFields);

        for (var iDom = 0; iDom < domKeys.length; iDom++) {
            // Hide all fields, except the autoBtn
            if (domKeys[iDom] != 'autoBtn' && domKeys[iDom] != 'housenumberAdditionWrapper' && domKeys[iDom] != 'freeAdditionWrapper') {
                validationFields[domKeys[iDom]].style.display = 'block';
            } else {
                // Display the other button
                validationFields[domKeys[iDom]].style.display = 'none';
            }
        }

        // Re-initialize event listeners after showing elements
        pcm2_initLookup(pcm2_Section);

    } else {
        // Hide address fields
        var html =
            '<div class="col-span-12 md:col-span-6 field field-reserved" id="pcm2_' + pcm2_Section + '_autocomplete_postcode_wrapper">' +
            '<label class="label" for="pcm2_' + pcm2_Section + '_autocomplete_postcode"><span>Postcode</span></label>' +
            '<div class="control"><input id="pcm2_' + pcm2_Section + '_autocomplete_postcode" name="pcm2_' + pcm2_Section + '_autocomplete_postcode" type="text" class="form-input w-full" required /></div>' +
            '</div>' +
            '<div class="col-span-12 md:col-span-6 field field-reserved" id="pcm2_' + pcm2_Section + '_autocomplete_housenumber_wrapper">' +
            '<label class="label" for="pcm2_' + pcm2_Section + '_autocomplete_housenumber"><span>Huisnummer</span></label>' +
            '<div class="control"><input id="pcm2_' + pcm2_Section + '_autocomplete_housenumber" name="pcm2_' + pcm2_Section + '_autocomplete_housenumber" type="text" class="form-input w-full" required /></div>' +
            '</div>' +
            '<div class="col-span-12 md:col-span-12 field field-reserved" id="pcm2_' + pcm2_Section + '_autocomplete_housenumber_addition_wrapper" style="display: none;">' +
            '<label for="pcm2_' + pcm2_Section + '_autocomplete_housenumber_addition" class="label">Toevoeging</label>' +
            '<div class="control"><select class="form-control form-control-select" type="select" class="form-input w-full" name="pcm2_' + pcm2_Section + '_autocomplete_housenumber_addition" id="pcm2_' + pcm2_Section + '_autocomplete_housenumber_addition" value=""></select></div>' +
            '</div>' +
            '<div class="col-span-12 md:col-span-12 field field-reserved " id="pcm2_' + pcm2_Section + '_autocomplete_free_addition_wrapper" style="display: none;">' +
            '<label for="pcm2_' + pcm2_Section + '_autocomplete_free_addition" class="col-md-3 form-control-label">Toevoeging</label>' +
            '<div class="control"><input id="pcm2_' + pcm2_Section + '_autocomplete_free_addition" name="pcm2_' + pcm2_Section + '_autocomplete_free_addition" class="form-control" type="text" placeholder="AB"></div>' +
            '</div>' +
            '<div class="col-span-12 md:col-span-12 field field-reserved " id="pcm2_' + pcm2_Section + '_autocomplete_result_wrapper" style="display: none;">' +
            '</div>' +
            '<div class="col-span-12 md:col-span-12 field field-reserved"><div class="control">' +
            '<button type="button" class="action btn btn-secondary" id="pcm2_' + pcm2_Section + '_autocomplete_manualbtn">Enter manually</button> ' +
            '<button type="button" class="action btn btn-secondary" id="pcm2_' + pcm2_Section + '_autocomplete_autobtn" style="display:none;">Enter automatically</button>' +
            '</div></div>';

        elements.country.insertAdjacentHTML('beforebegin', html);
    }

    // Hide address fields
    var domKeys = Object.keys(fields);

    for (var iDom = 0; iDom < domKeys.length; iDom++) {

        // Hide the element, and empty the value, except for country
        if ((domKeys[iDom] != 'country') && (domKeys[iDom] != 'region')) {

            fields[domKeys[iDom]].value = '';

            // If its address_2 or address_3 we skip this step
            if (domKeys[iDom] != 'address_2' && domKeys[iDom] != 'address_3') {
                elements[domKeys[iDom]].style.display = 'none';
            }
        }
    }
}

function pcm2_showForm(pcm2_Section, defaultForm = false) {
    fields = pcm2_getFields(pcm2_Section);
    elements = pcm2_getElements(pcm2_Section);

    var domKeys = Object.keys(fields);

    for (var iDom = 0; iDom < domKeys.length; iDom++) {

        // Hide the element, and empty the value, except for country
        if ((domKeys[iDom] != 'country') && (domKeys[iDom] != 'region')) {
            // If its address_2 or address_3 we skip this step
            if (domKeys[iDom] != 'address_2' && domKeys[iDom] != 'address_3') {
                elements[domKeys[iDom]].style.display = 'block';
            }
        }
    }

    validationFields = pcm2_getValidationFields(pcm2_Section);

    // Checkbox to show default form
    if (defaultForm) {

        var domKeys = Object.keys(validationFields);

        for (var iDom = 0; iDom < domKeys.length; iDom++) {

            console.log('Showing default field:', domKeys[iDom]);

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
        // Do we need to empty the value?
        emptyDefaultAddressFields(pcm2_Section);

        for (var iDom = 0; iDom < domKeys.length; iDom++) {
            if (validationFields[domKeys[iDom]]) {
                validationFields[domKeys[iDom]].remove();
            }
        }
    }
}


function emptyDefaultAddressFields(pcm2_Section) {
    if (pcm2_config.empty_default_address_fields == '1') {
        addressFields = pcm2_getFields(pcm2_Section);

        // Empty all fields except country
        for (var key in addressFields) {
            if (key !== 'country') {
                addressFields[key].value = '';
            }
        }
    }
}

function pcm2_getFields(pcm2_Section) {

    fields = {
        address_1: document.getElementById(pcm2_Section + '-street-0'),
        address_2: document.getElementById(pcm2_Section + '-street-1'),
        address_3: document.getElementById(pcm2_Section + '-street-2'),
        postcode: document.getElementById(pcm2_Section + '-postcode'),
        city: document.getElementById(pcm2_Section + '-city'),
    };

    return fields;
}

function pcm2_getElements(pcm2_Section) {

    elements = {
        // Since street 0,1,2 have a single parent fieldset, we need to get the parent element once
        address_1: document.getElementById(pcm2_Section + '-street-0').closest('div.group-street'),
        postcode: document.getElementById(pcm2_Section + '-postcode').closest('div.field-postcode'),
        city: document.getElementById(pcm2_Section + '-city').closest('div.field-city'),
        country: document.getElementById(pcm2_Section + '-country_id').closest('div.field-country_id'),
    };

    return elements;
}

function pcm2_getValidationFields(pcm2_Section) {
    var validationFields = {
        postcodeWrapper: document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_postcode_wrapper'),
        housenumberWrapper: document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_housenumber_wrapper'),
        housenumberAdditionWrapper: document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_housenumber_addition_wrapper'),
        housenumberAddition: document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_housenumber_addition'),
        freeAdditionWrapper: document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_free_addition_wrapper'),
        freeAddition: document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_free_addition'),
        resultWrapper: document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_result_wrapper'),
        manualBtn: document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_manualbtn'),
        autoBtn: document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_autobtn')
    };

    return validationFields;
}



function pcm2_setupSectionObserver(pcm2_Section, countryCode) {
    pcm2_log('Setting up observer for section:', pcm2_Section);

    // Disconnect existing observer for this section if it exists
    if (sectionObservers[pcm2_Section]) {
        sectionObservers[pcm2_Section].disconnect();
        pcm2_log('Disconnected existing observer for:', pcm2_Section);
    }

    // Find the parent container for this section
    var sectionContainer = document.querySelector('#' + pcm2_Section);
    if (!sectionContainer) {
        // Try to find by looking for the country field's parent
        var countryField = document.getElementById(pcm2_Section + '-country_id');
        if (countryField) {
            sectionContainer = countryField.closest('fieldset, form, [class*="address"]') || countryField.parentElement;
        }
    }

    if (!sectionContainer) {
        pcm2_log('Could not find container for section:', pcm2_Section);
        return;
    }

    pcm2_log('Observing container for section:', pcm2_Section);

    // Create new observer
    var observer = new MutationObserver(function (mutations) {
        // Check if our custom fields still exist
        var postcodeWrapper = document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_postcode_wrapper');
        var countryField = document.getElementById(pcm2_Section + '-country_id');

        // If country field exists but our custom fields are gone, DOM was rebuilt
        if (countryField && !postcodeWrapper) {
            pcm2_log('DOM rebuild detected for ' + pcm2_Section + ', re-initializing postcode fields');

            // Small delay to ensure Magento/Hyva finished rebuilding
            setTimeout(function () {
                var currentCountry = document.getElementById(pcm2_Section + '-country_id');
                if (currentCountry && pcm2_isSupportedCountry(currentCountry.value)) {
                    pcm2_log('Re-adding postcode lookup after DOM rebuild');
                    pcm2_hideForm(pcm2_Section);
                }
            }, 50);
        }
    });

    // Start observing
    observer.observe(sectionContainer, {
        childList: true,
        subtree: true
    });

    // Store observer reference
    sectionObservers[pcm2_Section] = observer;
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

    pcm2_log(pcm2_config);

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
        if (!shippingToBillingCheckbox.checked) {
            var billingCountry = document.getElementById(pcm2_Section + '-country_id');
            if (billingCountry) {
                pcm2_addLookup(pcm2_Section, billingCountry);
            }
        }

        shippingToBillingCheckbox.addEventListener('change', function () {
            if (this.checked) {
                console.log("Shipping to billing address checkbox checked");
                // Re-initialize or update the PostcodeEU module as needed
                // initializePostcodeEUCheckout();
            } else {
                console.log("Shipping to billing address checkbox unchecked");

                // Use interval to wait for billing form to be rendered
                var attempts = 0;
                var maxAttempts = 20; // Try for 2 seconds (20 * 100ms)

                var checkBillingField = setInterval(function () {
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