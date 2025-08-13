define('Codebrainbv_PostcodeCheckout/js/international/postcodecheckoutinternational', [
    'autocompleteaddress',
    'css!Codebrainbv_PostcodeCheckout/css/autocompleteaddress'
], function () {
    'use strict';

    if (window.pcm2_config.enabled === true && window.pcm2_config.configured_provider === 'postcodenlext') {
        var pcm2_SupportedCountries = window.pcm2_config.countries;
        var debugEnabled = window.pcm2_config.debug_mode ? true : false;
        var config = window.pcm2_config;
        var pcm2_oDomElements = {};
        var oElement;
        var sId = document.getElementById('pcm2_autocomplete_search');

        pcm2_ConsoleLogs(config);

        function pcm2_onDomReady() {
            var checkoutDiv = document.getElementById('checkout');
            var isShippingStep = window.location.hash === '#shipping';
            if (checkoutDiv && isShippingStep) {
                pcm2_waitForAddressFields(function () {
                    pcm2_getDomElements();
                    pcm2_hideForm();
                    pcm2_removeDefaultAddressFields();
                    pcm2_addLookup(oElement);
                });
            }
        }

        function pcm2_waitForAddressFields(callback, maxTries = 20) {
            var tries = 0;
            function check() {
                var dom = pcm2_getDomElements();
                if (dom && dom.postcode) {
                    callback();
                } else if (tries < maxTries) {
                    tries++;
                    setTimeout(check, 200);
                } else if (debugEnabled) {
                    console.warn('PCM2: Address fields niet gevonden na wachten!');
                }
            }
            check();
        }


        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', pcm2_onDomReady);
        } else {
            pcm2_onDomReady();
        }

        function pcm2_ConsoleLogs(msg, data) {
            if (debugEnabled) {
                console.log('PCM2:', msg);
                if (data) console.dir(data);
            }
        }

        function pcm2_addLookup(oElement) {
            var root = (function () {
                if (typeof oElement === 'string') return document.getElementById(oElement);
                if (oElement && oElement.nodeType === 1) return oElement;

                var candidates = [
                    'form[data-role="shipping-address-form"]',
                    '#shipping-new-address-form',
                    'form[data-role="billing-address-form"]',
                    '#billing-new-address-form',
                    '#checkout'
                ];
                for (var i = 0; i < candidates.length; i++) {
                    var el = document.querySelector(candidates[i]);
                    if (el) return el;
                }
                return null;
            })();

            if (!root) {
                setTimeout(function () { pcm2_addLookup(oElement); }, 300);
                return;
            }

            var inputs = root.querySelectorAll('.pcpostcode_autocomplete_input input, #pcm2_autocomplete_search');

            if (!inputs.length) {
                setTimeout(function () { pcm2_addLookup(root); }, 300);
                return;
            }

            for (var i = 0; i < inputs.length; i++) {
                if (!inputs[i].id) inputs[i].id = 'pcpostcode_input_' + i;
                pcm2_createInteractiveFunctions(inputs[i].id);
            }
        }

        function pcm2_createInteractiveFunctions(sInputId) {
            pcm2_addAutocompleteFunctions(sInputId);
            pcm2_addCountryFunctions(sInputId);
            pcm2_addDisableManualFunctions(sInputId);
        }

        function pcm2_addAutocompleteFunctions(inputOrId) {
            var el = (typeof inputOrId === 'string')
                ? document.getElementById(inputOrId)
                : inputOrId;

            if (!el) {
                pcm2_ConsoleLogs('pcm2_addAutocompleteFunctions: input element not found for', inputOrId);
                return;
            }
            if (typeof el.addEventListener !== 'function') {
                pcm2_ConsoleLogs('pcm2_addAutocompleteFunctions: element has no addEventListener', el);
                return;
            }

            if (!window.PostcodeNl || !PostcodeNl.AutocompleteAddress) {
                pcm2_ConsoleLogs('PostcodeNl.AutocompleteAddress not available yet; retrying…');
                setTimeout(function () { pcm2_addAutocompleteFunctions(el); }, 300);
                return;
            }

            pcm2_ConsoleLogs('fields loaded ready for the call');

            pcm2_Autocomplete[el.id] = new PostcodeNl.AutocompleteAddress(el, {
                autocompleteUrl: 'postcodecheckout/proxy/suggestions?type=autocomplete',
                addressDetailsUrl: 'postcodecheckout/proxy/details?type=address'
            });

            el.addEventListener('autocomplete-select', function (event) {
                pcm2_fillInFields(pcm2_Autocomplete[el.id], el, event);
            });
        }


        function pcm2_addCountryFunctions(sId) {
            pcm2_ConsoleLogs('pcm2_addCountryFunctions(' + sId + ')');
            var oParentObject = pcm2_getParentElement(document.getElementById(sId));
            var oSelectElement = oParentObject ? oParentObject.querySelector('select[name="country_id"]') : null;

            if (oSelectElement) {
                oSelectElement.addEventListener('change', function () {
                    pcm2_toggleCountry(this);
                });
                pcm2_toggleCountry(oSelectElement);
            }
        }

        function pcm2_addDisableManualFunctions() {
            var manualBtn = document.getElementById('pcm2_autocomplete_manualbtn');
            var autoBtn = document.getElementById('pcm2_autocomplete_autobtn');

            if (manualBtn) {
                manualBtn.addEventListener('click', function () {
                    pcm2_restoreForm();
                    var searchWrapper = document.getElementById('pcm2_autocomplete_search_wrapper');
                    var resultWrapper = document.getElementById('pcm2_autocomplete_result_wrapper');
                    if (searchWrapper) searchWrapper.style.display = 'none';
                    if (resultWrapper) resultWrapper.style.display = 'none';
                    manualBtn.style.display = 'none';
                    if (autoBtn) autoBtn.style.display = '';
                });
            }

            if (autoBtn) {
                autoBtn.addEventListener('click', function () {
                    pcm2_hideForm();
                    if (manualBtn) manualBtn.style.display = '';
                    autoBtn.style.display = 'none';
                    pcm2_addLookup(null);
                });
            }
        }


        function pcm2_disableFields(oElement) {
            pcm2_ConsoleLogs('pcm2_disableFields()');
            var oParentObject = pcm2_getParentElement(oElement);

            ['street[0]', 'street[1]', 'street[2]', 'city', 'postcode'].forEach(function (name) {
                var field = oParentObject ? oParentObject.querySelector('[name="' + name + '"]') : null;
                if (field) field.setAttribute('readonly', true);
            });
        }

        function pcm2_enableFields(oElement) {
            pcm2_ConsoleLogs('pcm2_enableFields()');
            var oParentObject = pcm2_getParentElement(oElement);

            ['street[0]', 'street[1]', 'street[2]', 'city', 'postcode'].forEach(function (name) {
                var field = oParentObject ? oParentObject.querySelector('[name="' + name + '"]') : null;
                if (field) field.removeAttribute('readonly');
            });
        }

        function pcm2_fillInFields(oAutoComplete, oElement, oResults) {
            pcm2_ConsoleLogs('pcm2_fillInFields()');
            var putAdditionInStreet2 = !!(window.pcm2_config && window.pcm2_config.housenumber_addition_address2);
            var oParentObject = pcm2_getParentElement(oElement);

            if (oResults.detail.precision === 'Address') {
                oAutoComplete.getDetails(oResults.detail.context, function (oResult) {
                    pcm2_ConsoleLogs(oResult);

                    if (oResult.processed == 'success') {
                        var oAddress = oResult.matches.address;

                        var sStreet = oAddress.street;
                        var sHouseNumber = oAddress.buildingNumber;
                        var sHouseNumberAddition = oAddress.buildingNumberAddition;
                        var sPostcode = oAddress.postcode;
                        var sRegion = oAddress.locality;
                        var sCity = oAddress.locality;

                        var sAddress = '';
                        var sHouseNumber2 = '';

                        var street0Val = '';
                        if (sStreet) {
                            street0Val = sStreet;
                            if (sHouseNumber) {
                                street0Val += ' ' + sHouseNumber;
                            }
                            if (!putAdditionInStreet2 && sHouseNumberAddition) {
                                street0Val += ' ' + sHouseNumberAddition;
                            }
                        }


                        var street0 = oParentObject ? oParentObject.querySelector('[name="street[0]"]') : null;
                        var street1 = oParentObject ? oParentObject.querySelector('[name="street[1]"]') : null;
                        var street2 = oParentObject ? oParentObject.querySelector('[name="street[2]"]') : null;
                        var postcode = oParentObject ? oParentObject.querySelector('[name="postcode"]') : null;
                        var city = oParentObject ? oParentObject.querySelector('[name="city"]') : null;

                        if (street0 && street0Val) {
                            street0.value = street0Val;
                            street0.dispatchEvent(new Event('keyup'));
                        }

                        // toevoeging naar Address 2 of leegmaken
                        if (putAdditionInStreet2) {
                            if (street1) { street1.value = sHouseNumberAddition || ''; street1.dispatchEvent(new Event('keyup')); }
                            if (street2) { street2.value = ''; street2.dispatchEvent(new Event('keyup')); }
                        } else {
                            if (street1) { street1.value = ''; street1.dispatchEvent(new Event('keyup')); }
                            if (street2) { street2.value = ''; street2.dispatchEvent(new Event('keyup')); }
                        }

                        if (postcode && sPostcode) { postcode.value = sPostcode; postcode.dispatchEvent(new Event('keyup')); }
                        if (city && sCity) { city.value = sCity; city.dispatchEvent(new Event('keyup')); }
                    }
                });
            }
        }


        function pcm2_getDomElements() {

            pcm2_oDomElements = {
                street: document.querySelector('[name="street[0]"]'),
                housenumber: document.querySelector('[name="street[1]"]'),
                addition: document.querySelector('[name="street[2]"]'),
                postcode: document.querySelector('[name="postcode"]'),
                city: document.querySelector('[name="city"]'),
                country: document.querySelector('[name="country_id"]'),
                region: document.querySelector('[name="region"]'),
            };

            return pcm2_oDomElements;
        }

        function pcm2_hideForm() {
            var dom = pcm2_getDomElements();

            var country = document.querySelector('[name="country_id"]');
            var countryWrapper = country ? country.closest('.field') : null;

            // Field wrappers
            var searchWrapper = document.getElementById('pcm2_autocomplete_search_wrapper');
            var resultWrapper = document.getElementById('pcm2_autocomplete_result_wrapper');
            if (searchWrapper) searchWrapper.style.display = '';
            if (resultWrapper) resultWrapper.style.display = '';

            // Buttons
            var manualBtn = document.getElementById('pcm2_autocomplete_manualbtn');
            var autoBtn = document.getElementById('pcm2_autocomplete_autobtn');
            if (manualBtn) manualBtn.style.display = '';
            if (autoBtn) autoBtn.style.display = 'none';

            // Add required property
            var searchInput = document.getElementById('pcm2_autocomplete_search');
            var resultDiv = document.getElementById('pcm2_autocomplete_result');
            if (searchInput) searchInput.required = true;
            if (resultDiv) resultDiv.required = true;

            // Add our template to the checkout if not present
            if (!searchWrapper && dom.country) {
                var countryWrapper = dom.country.closest('.field');
                var pcm2_trans = window.pcm2_trans || {
                    field_label: 'Address lookup',
                    enter_manually: 'Enter manually',
                    enter_automatically: 'Enter automatically'
                };
                var pcm2_SearchTemplate =
                    '<div class="field" id="pcm2_autocomplete_search_wrapper">' +
                    '<label class="form-control-label">' + pcm2_trans.field_label + '</label>' +
                    '<div class="col-md-6">' +
                    '<input id="pcm2_autocomplete_search" name="pcm2_autocomplete_search" class="form-control" type="text" required>' +
                    '</div>' +
                    '</div>' +
                    '<div class="field" id="pcm2_autocomplete_result_wrapper">' +
                    '<label class="label"></label>' +
                    '<div class="col-md-6" id="pcm2_autocomplete_result"></div>' +
                    '</div>' +
                    '<div class="required form-group row">' +
                    '<div class="field">' +
                    '<button type="button" class="btn btn-default button button-small" id="pcm2_autocomplete_manualbtn">' +
                    '<span>' + pcm2_trans.enter_manually + '<i class="icon-chevron-right right"></i></span>' +
                    '</button>' +
                    '<button type="button" class="btn btn-default button button-small" id="pcm2_autocomplete_autobtn" style="display: none;">' +
                    '<span>' + pcm2_trans.enter_automatically + '<i class="icon-chevron-right right"></i></span>' +
                    '</button>' +
                    '</div>' +
                    '</div>';

                if (countryWrapper) {
                    countryWrapper.insertAdjacentHTML('afterend', pcm2_SearchTemplate);
                } else if (dom.country.parentNode) {
                    // fallback: direct onder country input
                    dom.country.parentNode.insertAdjacentHTML('afterend', pcm2_SearchTemplate);
                }
            }

            if (window.pcm2_config.hide_fields === 'true') {
                ['street', 'housenumber', 'addition', 'postcode', 'city'].forEach(function (key) {
                    if (dom[key]) {
                        dom[key].value = '';
                        dom[key].style.display = 'none';
                    }
                });
            } else {
                ['street', 'housenumber', 'addition', 'postcode', 'city'].forEach(function (key) {
                    if (dom[key]) {
                        dom[key].value = '';
                        dom[key].setAttribute('readonly', '');
                    }
                });
            }
        }


        function pcm2_restoreForm() {
            var dom = pcm2_getDomElements();

            if (window.pcm2_config.hide_fields === 'true') {
                ['street', 'housenumber', 'addition', 'postcode', 'city'].forEach(function (key) {
                    if (dom[key]) dom[key].style.display = '';
                });
            } else {
                ['street', 'housenumber', 'addition', 'postcode', 'city'].forEach(function (key) {
                    if (dom[key]) dom[key].removeAttribute('readonly');
                });
            }

            if (typeof bCheckbox !== 'undefined') {
                var searchWrapper = document.getElementById('pcm2_autocomplete_search_wrapper');
                var resultWrapper = document.getElementById('pcm2_autocomplete_result_wrapper');
                if (searchWrapper) searchWrapper.style.display = 'none';
                if (resultWrapper) resultWrapper.style.display = 'none';

                var manualBtn = document.getElementById('pcm2_autocomplete_manualbtn');
                var autoBtn = document.getElementById('pcm2_autocomplete_autobtn');
                if (manualBtn) manualBtn.style.display = 'none';
                if (autoBtn) autoBtn.style.display = '';

                var searchInput = document.getElementById('pcm2_autocomplete_search');
                var resultDiv = document.getElementById('pcm2_autocomplete_result');
                if (searchInput) searchInput.required = false;
                if (resultDiv) resultDiv.required = false;
            } else {
                var searchWrapper = document.getElementById('pcm2_autocomplete_search_wrapper');
                var resultWrapper = document.getElementById('pcm2_autocomplete_result_wrapper');
                if (searchWrapper && searchWrapper.parentNode) searchWrapper.parentNode.removeChild(searchWrapper);
                if (resultWrapper && resultWrapper.parentNode) resultWrapper.parentNode.removeChild(resultWrapper);

                var manualBtn = document.getElementById('pcm2_autocomplete_manualbtn');
                var autoBtn = document.getElementById('pcm2_autocomplete_autobtn');
                if (manualBtn && manualBtn.parentNode) manualBtn.parentNode.removeChild(manualBtn);
                if (autoBtn && autoBtn.parentNode) autoBtn.parentNode.removeChild(autoBtn);
            }
        };

        function pcm2_removeDefaultAddressFields() {
            var dom = pcm2_getDomElements();
            Object.keys(dom).forEach(function (key) {
                if (key === 'region' || key === 'country') return;
                if (dom[key]) {
                    dom[key].style.display = 'none';
                    var label = dom[key].closest('label');
                    if (!label) {
                        var id = dom[key].id;
                        if (id) {
                            label = document.querySelector('label[for="' + id + '"]');
                        }
                    }
                    if (label) {
                        label.style.display = 'none';
                    }
                    var streetFieldset = dom[key].closest('fieldset.street');
                    if (streetFieldset) {
                        streetFieldset.style.display = 'none';
                    }
                }
            });
        }

        // Helper to get country code (identity function)
        function pcm2_getCountryCode(sCountryIso2) {
            return sCountryIso2;
        }

        // Convert ISO2 to ISO3 using supported countries
        function pcm2_convertIso2ToIso3(sIso2Code) {
            var country = pcm2_SupportedCountries.find(function (country) {
                return country.iso2 === sIso2Code;
            });
            return country ? country.iso3 : undefined;
        }

        // Check if country is supported
        function pcm2_isSupportedCountry(sSection) {
            var sCountryCode = pcm2_getCountryCode(sSection);
            return !!pcm2_SupportedCountries.find(function (country) {
                return country.iso2 === sCountryCode;
            });
        }
    }
});
