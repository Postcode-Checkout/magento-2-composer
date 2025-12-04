var fields, elements, validationFields, pcm2_Autocomplete, countryCode; // Declare variables at module level
var placementHousenumberAdditions = pcm2_config.housenumber_addition_address2;

function pcm2_addLookup(pcm2_Section, oElement) {

    // Get country value
    var countryField = oElement;

    pcm2_log('Country field:', countryField);

    if (!countryField) {
        pcm2_log('country field not found');
        return;
    }


    if (pcm2_config.empty_default_address_fields == '1') {
        pcm2_clearAllAddressFields(pcm2_Section);
    }


    countryCode = countryField.value;
    pcm2_log('country code:', countryCode);

    // Add event listener to country field
    countryField.addEventListener('change', function (event) {
        var newCountryCode = event.target.value;
        pcm2_log('country changed to:', newCountryCode);
        countryCode = newCountryCode;

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


    var iso3Code = pcm2_convertIso2ToIso3(countryCode);

    pcm2_log('Converted country code to ISO3:', iso3Code);

    // Initialize autocomplete
    const searchField = document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_search');

    pcm2_Autocomplete = new PostcodeNl.AutocompleteAddress(searchField, {
        autocompleteUrl: pcm2_config.api_urls.international_suggest,
        addressDetailsUrl: pcm2_config.api_urls.international_details,
        autoFocus: true,
        autoSelect: true,
        showLogo: false,
        context: iso3Code
    });

    pcm2_Autocomplete.getSuggestions = function (context, term, response) {

        pcm2_log('Autocomplete getSuggestions called with context:', context);
        pcm2_log('Autocomplete getSuggestions called with term:', term);

        // Encode the term to binary to preserve whitespace
        // and then encode it to base64 for the URL.
        const encodedTerm = new TextEncoder().encode(term),
            binaryTerm = Array.from(encodedTerm, (byte) => String.fromCodePoint(byte)).join(''),
            url = this.options.autocompleteUrl.replace('${context}', encodeURIComponent(context)).replace('${term}', encodeURIComponent(btoa(binaryTerm)));

        return this.xhrGet(url, response);
    }

    pcm2_Autocomplete.getDetails = function (addressId, response) {
        pcm2_log('Autocomplete getDetails called with addressId:', addressId);

        const url = this.options.addressDetailsUrl.replace('${context}', encodeURIComponent(addressId));
        return this.xhrGet(url, response);
    };


    searchField.addEventListener('autocomplete-select', function (event) {

        // Set value of the search field to the selected address
        searchField.value = event.detail.label;
        pcm2_log('Autocomplete-select event: ', event);

        if (event.detail.precision === 'Address') {

            pcm2_Autocomplete.getDetails(event.detail.context, function (response) {

                if (response) {
                    var addressData = response.result;

                    pcm2_log('Address to be entered: ', addressData);
                    pcm2_fillAddressFields(addressData, pcm2_Section);
                } else {
                    pcm2_log('No address data found in response:', response);
                    pcm2_updatePreview(pcm2_Section, true);
                }
            });
        }
    });
}

function pcm2_clearAllAddressFields(pcm2_Section) {
    const fields = pcm2_getFields(pcm2_Section) || {};
    const validationFields = pcm2_getValidationFields(pcm2_Section) || {};

    // make the search field empty
    const searchField = document.getElementById(`pcm2_${pcm2_Section}_autocomplete_search`);
    if (searchField) {
        searchField.value = '';
    }

    // make result empty
    if (validationFields.resultWrapper) {
        validationFields.resultWrapper.innerHTML = '';
    } else {
        const fallbackWrapper = document.getElementById(`pcm2_${pcm2_Section}_autocomplete_result_wrapper`);
        if (fallbackWrapper) fallbackWrapper.innerHTML = '';
    }

    // empty default address fields
    const keysToClear = ['address_1', 'address_2', 'address_3', 'postcode', 'city'];
    keysToClear.forEach((key) => {
        if (fields[key]) {
            fields[key].value = '';
        }
    });

    pcm2_log('PCM2 cleared all address fields');
}

function pcm2_fillAddressFields(result, pcm2_Section) {
    fields = pcm2_getFields(pcm2_Section);
    validationFields = pcm2_getValidationFields(pcm2_Section);

    pcm2_log('filling address fields with result:', result);

    // Check if we have a result, empty array?
    if (!result || Object.keys(result).length === 0) {
        pcm2_log('no result found');
        pcm2_updatePreview(pcm2_Section, true);
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

        pcm2_updatePreview(pcm2_Section);
    }
}


function pcm2_updatePreview(pcm2_Section, errorMsg = false) {

    fields = pcm2_getFields(pcm2_Section);
    validationFields = pcm2_getValidationFields(pcm2_Section);

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

function pcm2_hideForm(pcm2_Section, defaultForm = false) {
    // Add param to find out if its the shipping or billing form
    fields = pcm2_getFields(pcm2_Section);
    elements = pcm2_getElements(pcm2_Section);
    validationFields = pcm2_getValidationFields(pcm2_Section);

    // If checkbox, hide our fields and show default fields
    if (defaultForm) {
        pcm2_log('checkbox is checked, hiding PCM2 fields and showing default fields');

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
            '<div class="col-span-12 md:col-span-12 field" id="pcm2_' + pcm2_Section + '_autocomplete_search_wrapper">' +
            '  <label class="label text-sm text-slate-700" for="pcm2_' + pcm2_Section + '_autocomplete_search"><span> ' + pcm2_translations.search + ' </span></label>' +
            '  <div class="flex">' +
            '    <input id="pcm2_' + pcm2_Section + '_autocomplete_search" name="pcm2_autocomplete_search" type="text" class="form-input w-full grow" required />' +
            '  </div>' +
            '</div>' +
            '<div class="col-span-12 md:col-span-12 field" id="pcm2_' + pcm2_Section + '_autocomplete_result_wrapper"></div>' +
            '<div class="col-span-12 md:col-span-12 field" id="pcm2_' + pcm2_Section + '_autocomplete_buttons">' +
            '  <div class="flex w-full">' +
            '    <button type="button" class="action btn btn-secondary w-full" id="pcm2_' + pcm2_Section + '_autocomplete_manualbtn">' + pcm2_translations.manual + '</button>' +
            '    <button type="button" class="btn btn-secondary w-full" id="pcm2_' + pcm2_Section + '_autocomplete_autobtn" style="display:none;">' + pcm2_translations.automatic + '</button>' +
            '  </div>' +
            '</div>';


        // Check if it doesnt already exists
        if (!document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_search_wrapper')) {
            pcm2_log('postcode lookup fields do not exist, adding them now');
            elements.country.insertAdjacentHTML('afterend', html);
        }
    }

    // Hide address fields
    var domKeys = Object.keys(fields);

    for (var iDom = 0; iDom < domKeys.length; iDom++) {

        // Hide the element, and empty the value, except for country
        if ((domKeys[iDom] != 'country') && (domKeys[iDom] != 'region')) {

            // If its address_2 or address_3 we skip this step
            if (domKeys[iDom] != 'address_2' && domKeys[iDom] != 'address_3') {
                elements[domKeys[iDom]].style.display = 'none';
            }
        }
    }

    pcm2_initLookup(pcm2_Section);
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
        var domKeys = Object.keys(validationFields);

        for (var iDom = 0; iDom < domKeys.length; iDom++) {
            validationFields[domKeys[iDom]].remove();
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
    console.log(pcm2_Section);

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
    validationFields = {
        searchWrapper: document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_search_wrapper'),
        resultWrapper: document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_result_wrapper'),
        manualBtn: document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_manualbtn'),
        autoBtn: document.getElementById('pcm2_' + pcm2_Section + '_autocomplete_autobtn')
    };

    return validationFields;
}

function pcm2_isSupportedCountry(countryCode) {

    // Check if country code is NL
    if (pcm2_config.supported_countries.find(country => country.iso2 === countryCode)) {

        return true;
    }

    return false;
}

function pcm2_convertIso2ToIso3(iso2) {
    return pcm2_config.supported_countries.find(country => country.iso2 === iso2).iso3;
}

function pcm2_log(msg, data) {
    if (pcm2_config.debug_mode == '1') {
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

    pcm2_log(pcm2_config);

    let pcm2_Section = '';
    let oElement = '';

    pcm2_Section = 'shipping';
    oElement = document.getElementById(pcm2_Section + '-country_id');

    if (oElement) {
        pcm2_addLookup(pcm2_Section, oElement);
        oElement.addEventListener('change', function () {
            pcm2_addLookup(pcm2_Section, oElement);
        });
    }

    var shippingToBillingCheckbox = document.getElementById('billing-as-shipping');

    // Run on load if checkbox is already unchecked
    if (!shippingToBillingCheckbox.checked) {
        pcm2_Section = 'billing';
        oElement = document.getElementById(pcm2_Section + '-country_id');

        if (oElement) {
            pcm2_addLookup(pcm2_Section, oElement);
            oElement.addEventListener('change', function () {
                pcm2_addLookup(pcm2_Section, oElement);
            });
        }
    }

    document.addEventListener('livewire:load', () => {
        Livewire.on('billing_as_shipping_address_updated', (data) => {
            console.log('Event caught:', data);
        });
    }); 


    // // Listen for changes to the "My billing and shipping address are the same" checkbox
    // // Livewire emits an event we can listen to
    // window.addEventListener('billing_as_shipping_address_updated', () => {

    //     console.log('billing_as_shipping_address_updated event detected');

    //     const billingAsShippingCheckbox = document.getElementById('billing-as-shipping');

    //     if (billingAsShippingCheckbox.checked) {
    //         pcm2_log('Checkbox is checked, skipping billing address lookup initialization');
    //         return;
    //     }

    //     console.log('Initializing billing address lookup');

    //     // const oElement = document.getElementById('billing-country_id');

    //     // if (oElement) {
    //     //     pcm2_addLookup('billing', oElement);
    //     //     oElement.addEventListener('change', function () {
    //     //         pcm2_addLookup('billing', oElement);
    //     //     });
    //     // }
    // });
}