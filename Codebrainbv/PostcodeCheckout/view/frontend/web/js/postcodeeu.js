define([], function () {
    'use strict';

    // Configuration and state variables
    var pcm2_SupportedCountries = config.pcm2_config.supported_countries;
    var pcm2_oDomElementsFields = null;
    var debugEnabled = config.pcm2_config.debug_mode === '1';
    var randSuffix = Math.random().toString(36).substring(2, 10);
    var disableAutocomplete = typeof config.pcm2_config !== 'undefined' ? config.pcm2_config.pcm2_autocomplete_off === '1' : false;
    var pcm2_aCeckoutSection = ['shipping', 'billing'];


    var IDS = {
        searchWrap: 'pcm2_autocomplete_search_wrapper',
        resultWrap: 'pcm2_autocomplete_result_wrapper',
        search: 'pcm2_autocomplete_search',
        result: 'pcm2_autocomplete_result',
        manualBtn: 'pcm2_autocomplete_manualbtn',
        autoBtn: 'pcm2_autocomplete_autobtn'
    };

    // Debug logging function
    function logDebug(msg, data) {
        if (debugEnabled) {
            console.log('pcm2: ', msg);
            if (data) console.dir(data);
        }
    }

    function pcm2_getCountryCode() {
        var oParentObject = pcm2_getParentElement();
        var sCountryCode = jQuery(oParentObject).find('select[name="country_id"]').val();

        if (pcm2_SupportedCountries.find(country => country.iso2 === sCountryCode)) {
            return sCountryCode;
        }
        else {
            return false;
        }
    }

    function pcm2_getParentElement() {
        // #co-shipping-form
        var oParentElementShipping = oElement.closest('#co-shipping-form');

        // .payment-method
        var oParentElementBilling = oElement.closest('.payment-method');

        // #checkout-billing-address
        var oParentShippingAsBilling = oElement.closest('#checkout-billing-address');

        if (oParentElementShipping) {
            return oParentElementShipping;
        } else if (oParentElementBilling) {
            return oParentElementBilling;
        } else if (oParentShippingAsBilling) {
            return oParentShippingAsBilling;
        } else {
            logDebug('No PARENT was found.');
            return false;
        }
    }

    function pcm2_isSupportedCountry() {
        let sCountryCode = pcm2_getCountryCode();

        if (pcm2_SupportedCountries.find(country => country.iso2 === sCountryCode)) {
            return true;
        }
        logDebug('No supported country found.', sCountryCode);

        return false;
    }

    // Show the postcode form
    function pcm2_showForm() {
        logDebug('place our form');
        pcm2_hideOriginalFields();

        var html =
            '<div class="field" id="' + IDS.searchWrap + '">' +
            '  <label class="label"><span>Address lookup</span></label>' +
            '  <div class="control"><input id="' + IDS.search + '" name="' + IDS.search + '" type="text" class="input-text" required /></div>' +
            '</div>' +
            '<div class="field" id="' + IDS.resultWrap + '">' +
            '  <label class="label"><span></span></label>' +
            '  <div class="control" id="' + IDS.result + '"></div>' +
            '</div>' +
            '<div class="field"><div class="control">' +
            '  <button type="button" class="action primary" id="' + IDS.manualBtn + '">Enter manually</button> ' +
            '  <button type="button" class="action secondary" id="' + IDS.autoBtn + '" style="display:none;">Enter automatically</button>' +
            '</div></div>';

        // Check if the original fields are hidden; if they are, place the var html above the element with the name country_id
        var countryElement = document.querySelector('[name="country_id"]');
        if (countryElement) {
            var wrapper = document.createElement('div');
            wrapper.innerHTML = html;
            countryElement.parentNode.insertBefore(wrapper, countryElement);
        }

    }

    // Restore the original form
    function pcm2_restoreForm() {
        logDebug('restore original form');
        pcm2_ShowOriginalFields();
    }

    function pcm2_convertIso2ToIso3(sIso2Code) {
        // Find country by ISO2 and return ISO3
        return pcm2_SupportedCountries.find(country => country.iso2 === sIso2Code).iso3;
    }

    // Add address lookup functionality
    function pcm2_addLookup() {
        oElements = pcm2_getElements();
        var sIso3Code = pcm2_convertIso2ToIso3(pcm2_getCountryCode());

        logDebug('Country code ' + sIso3Code);
        logDebug('add lookup functionality');
    }

    function pcm2_hideOriginalFields() {
        pcm2_oDomElementsFields = {
            'postcode': document.querySelector('input[name="postcode"]'),
            'city': document.querySelector('input[name="city"]'),
            'street': document.querySelector('input[name="street[0]"]'),
            'street_number': document.querySelector('input[name="street[1]"]'),
            'addition': document.querySelector('input[name="street[2]"]'),
            'region': document.querySelector('input[name="region"]')
        };

        Object.keys(pcm2_oDomElementsFields).forEach(function (key) {
            var element = pcm2_oDomElementsFields[key];
            if (element) {
                logDebug('hide field: ' + key, element);
                element.style.display = 'none';
            }
        });
    }

    function pcm2_ShowOriginalFields() {
        pcm2_oDomElementsFields = {
            'postcode': document.querySelector('input[name="postcode"]'),
            'city': document.querySelector('input[name="city"]'),
            'street': document.querySelector('input[name="street[0]"]'),
            'street_number': document.querySelector('input[name="street[1]"]'),
            'addition': document.querySelector('input[name="street[2]"]'),
            'region': document.querySelector('input[name="region"]')
        };

        Object.keys(pcm2_oDomElementsFields).forEach(function (key) {
            var element = pcm2_oDomElementsFields[key];
            if (element) {
                element.style.display = 'block';
            }
        });
    }

    function pcm2_getElements() {
        pcm2_oDomElements =
        {
            'postcode': document.querySelector('input[name="postcode"]'),
            'city': document.querySelector('input[name="city"]'),
            'street': document.querySelector('input[name="street[0]"]'),
            'street_number': document.querySelector('input[name="street[1]"]'),
            'addition': document.querySelector('input[name="street[2]"]'),
            'region': document.querySelector('input[name="region"]')
        };

        return pcm2_oDomElements;
    }

    // Public API
    return {
        pcm2_init: function () {
            if (typeof config.pcm2_config !== 'undefined' && config.pcm2_config.enabled === true) {
                if (pcm2_isSupportedCountry()) {
                    setTimeout(function () {
                        pcm2_showForm();
                        pcm2_addLookup();
                        logDebug(config.pcm2_config);
                    }, 100);
                } else {
                    pcm2_restoreForm();
                }
            }
        }
    };
});