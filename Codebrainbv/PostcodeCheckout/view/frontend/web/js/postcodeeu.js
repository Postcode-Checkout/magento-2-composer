
define([], function () {
    'use strict';

    // Configuration and state variables
    var pcm2_SupportedCountries = config.pcm2_config.supported_countries;
    var pcm2_aCeckoutSection = ['shipping', 'billing'];
    var pcm2_oDomElementsFields = null;
    var debugEnabled = config.pcm2_config.debug_mode === '1';
    var randSuffix = Math.random().toString(36).substring(2, 10);
    var disableAutocomplete = typeof config.pcm2_config !== 'undefined' ? config.pcm2_config.pcm2_autocomplete_off === '1' : false;


    // Debug logging function
    function logDebug(msg, data) {
        if (debugEnabled) {
            console.log('pcm2: ', msg);
            if (data) console.dir(data);
        }
    }

    function pcm2_init(pcm2_sSection) {
        if (typeof config.pcm2_config !== 'undefined' && config.pcm2_config.enabled === true) {
            if (pcm2_isSupportedCountry(pcm2_sSection)) {
                setTimeout(function () {
                    pcm2_showForm(pcm2_sSection);
                    pcm2_addLookup(pcm2_sSection);
                    logDebug(config.pcm2_config);
                }, 100);
            } else {
                pcm2_restoreForm(pcm2_sSection);
            }
        }
    }

    // Show the postcode form
    function pcm2_showForm() {
        logDebug('place our form');

        var IDS = {
            searchWrap: 'pcm2_autocomplete_search_wrapper',
            resultWrap: 'pcm2_autocomplete_result_wrapper',
            search: 'pcm2_autocomplete_search',
            result: 'pcm2_autocomplete_result',
            manualBtn: 'pcm2_autocomplete_manualbtn',
            autoBtn: 'pcm2_autocomplete_autobtn'
        };

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
            countryElement.insertAdjacentHTML('beforebegin', html);
        }
    }


    // Restore the original form
    function pcm2_restoreForm() {
        logDebug('restore original form');
    }

    // Add address lookup functionality
    function pcm2_addLookup() {
        oElements = pcm2_getElements();
        var sIso3Code = pcm2_convertIso2ToIso3(pcm2_getCountryCode());

        logDebug('Country code ' + sIso3Code);
        logDebug('add lookup functionality');
    }

    function pcm2_updatePreview(pcm2_sSection) {
        var resultElem = document.getElementById('pcm2_' + pcm2_sSection + '_result');
        if (!resultElem || !pcm2_oDomElements) return;

        var address1 = pcm2_oDomElements.address_1 ? pcm2_oDomElements.address_1.value : '';
        var address2 = pcm2_oDomElements.address_2 ? pcm2_oDomElements.address_2.value : '';
        var postcode = pcm2_oDomElements.postcode ? pcm2_oDomElements.postcode.value : '';
        var city = pcm2_oDomElements.city ? pcm2_oDomElements.city.value : '';

        if (pcm2_config.pcm2_housenumber_and_addition_line_2 > 1) {
            resultElem.innerHTML = address1 + ' ' + address2 + '<br>' + postcode + ' ' + city;
        } else {
            resultElem.innerHTML = address1 + address2 + '<br>' + postcode + ' ' + city;
        }
    }

    function pcm2_getDomElementsFields(pcm2_sSection) {
        pcm2_oDomElementsFields = {
            address_1: document.getElementById(pcm2_sSection + '_address_1_field'),
            address_2: document.getElementById(pcm2_sSection + '_address_2_field'),
            postcode: document.getElementById(pcm2_sSection + '_postcode_field'),
            city: document.getElementById(pcm2_sSection + '_city_field'),
            state: document.getElementById(pcm2_sSection + '_state_field'),
            country: document.getElementById(pcm2_sSection + '_country_field')
        };

        return pcm2_oDomElementsFields;
    }

    function pcm2_getElements(pcm2_sSection) {
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

    function pcm2_getCountryCode(pcm2_sSection) {
        let sCountryCode = pcm2_aCeckoutSection[pcm2_sSection];

        console.log('Country code is ' + sCountryCode);
        return sCountryCode;
    }

    function pcm2_convertIso2ToIso3(sIso2Code) {
        console.log('iso 3 is: ' + $country);
        // Find country by ISO2 and return ISO3
        return pcm2_SupportedCountries.find(country => country.iso2 === sIso2Code).iso3;

    }

    function pcm2_isSupportedCountry(pcm2_sSection) {
        let sCountryCode = pcm2_getCountryCode(pcm2_sSection);

        console.log('Checking if ' + sCountryCode + ' is supported');

        if (pcm2_SupportedCountries.find(country => country.iso2 === sCountryCode)) {
            return true;
        }

        return false;
    }

    function pcm2_setCountryCode(countyElement, pcm2_sSection) {
        let sCountryCode = countyElement && countyElement.value ? countyElement.value : '';
        pcm2_aCeckoutSection[pcm2_sSection] = sCountryCode;

        return sCountryCode;
    }


    // Public API
    return {
        pcm2_detectSectionFromUrl: function (pcm2_sSection) {
            var countyElement = null;
            var selectedCountry = null;

            if (window.location.hash.indexOf('shipping') !== -1) {
                pcm2_sSection = 'shipping';
                countyElement = document.getElementsByName('country_id');

                if (countyElement && countyElement.length && countyElement[0].tagName === 'SELECT') {
                    var selectedCountry = countyElement[0].options[countyElement[0].selectedIndex].value;
                }

                pcm2_setCountryCode(selectedCountry);
                pcm2_init(pcm2_sSection);

            } else if (window.location.hash.indexOf('billing') !== -1) {
                pcm2_sSection = 'billing';
                countyElement = document.getElementsByName('country_id');
                if (countyElement && countyElement.length && countyElement[0].tagName === 'SELECT') {
                    var selectedCountry = countyElement[0].options[countyElement[0].selectedIndex].value;
                }

                pcm2_setCountryCode(selectedCountry);
                pcm2_init(pcm2_sSection);
            }
            return pcm2_sSection;
        }
    };
});
