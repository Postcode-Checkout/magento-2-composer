define('Codebrainbv_PostcodeCheckout/js/international/postcodecheckoutinternational', [], function () {
    'use strict';

    if (window.pcm2_config.enabled === true) {
        // Config from global window object
        var pcm2_SupportedCountries = window.pcm2_config.countries;
        var debugEnabled = window.pcm2_config.debug_mode ? true : false;
        var config = window.pcm2_config;
        var pcm2_oDomElements = {};



        pcm2ConsoleLogs(config);

        function pcm2_onDomReady() {
            var checkoutDiv = document.getElementById('checkout');
            var isShippingStep = window.location.hash === '#shipping';
            if (checkoutDiv && isShippingStep) {
                pcm2_waitForAddressFields(function () {
                    pcm2_getDomElements();
                    pcm2_removeDefaultAddressFields();
                    pcm2_hideForm();
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

        function pcm2ConsoleLogs(msg, data) {
            if (debugEnabled) {
                console.log('PCM2:', msg);
                if (data) console.dir(data);
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

        function pcm2_hideForm(sFormId) {
            var dom = pcm2_getDomElements();

            var country = document.querySelector('[name="country_id"]');
            var countryWrapper = country ? country.closest('.field') : null;

            // Field wrappers
            var searchWrapper = document.getElementById('pcm2_' + sFormId + '_search_wrapper');
            var resultWrapper = document.getElementById('pcm2_' + sFormId + '_result_wrapper');
            if (searchWrapper) searchWrapper.style.display = '';
            if (resultWrapper) resultWrapper.style.display = '';

            // Buttons
            var manualBtn = document.getElementById('pcm2_' + sFormId + '_manualbtn');
            var autoBtn = document.getElementById('pcm2_' + sFormId + '_autobtn');
            if (manualBtn) manualBtn.style.display = '';
            if (autoBtn) autoBtn.style.display = 'none';

            // Add required property
            var searchInput = document.getElementById('pcm2_' + sFormId + '_search');
            var resultDiv = document.getElementById('pcm2_' + sFormId + '_result');
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
                var sPcex4prestaSearchTemplate =
                    '<div class="form-group row margin_buttons" id="pcm2_' + sFormId + '_search_wrapper">' +
                    '<label class="col-md-3 form-control-label">' + pcm2_trans.field_label + '</label>' +
                    '<div class="col-md-6">' +
                    '<input id="pcm2_' + sFormId + '_search" name="pcm2_' + sFormId + '_search" class="form-control" type="text" required>' +
                    '</div>' +
                    '</div>' +
                    '<div class="form-group row margin_buttons" id="pcm2_' + sFormId + '_result_wrapper">' +
                    '<label class="col-md-3 form-control-label"></label>' +
                    '<div class="col-md-6" id="pcm2_' + sFormId + '_result"></div>' +
                    '</div>' +
                    '<div class="required form-group row">' +
                    '<label class="col-md-3 form-control-label"></label>' +
                    '<div class="col-md-3 margin_buttons">' +
                    '<button type="button" class="btn btn-default button button-small" id="pcm2_' + sFormId + '_manualbtn">' +
                    '<span>' + pcm2_trans.enter_manually + '<i class="icon-chevron-right right"></i></span>' +
                    '</button>' +
                    '<button type="button" class="btn btn-default button button-small" id="pcm2_' + sFormId + '_autobtn" style="display: none;">' +
                    '<span>' + pcm2_trans.enter_automatically + '<i class="icon-chevron-right right"></i></span>' +
                    '</button>' +
                    '</div>' +
                    '</div>';

                if (countryWrapper) {
                    countryWrapper.insertAdjacentHTML('afterend', sPcex4prestaSearchTemplate);
                } else if (dom.country.parentNode) {
                    // fallback: direct onder country input
                    dom.country.parentNode.insertAdjacentHTML('afterend', sPcex4prestaSearchTemplate);
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


        window.pcm2_restoreForm = function (sFormId, bCheckbox) {
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
                var searchWrapper = document.getElementById('pcm2_' + sFormId + '_search_wrapper');
                var resultWrapper = document.getElementById('pcm2_' + sFormId + '_result_wrapper');
                if (searchWrapper) searchWrapper.style.display = 'none';
                if (resultWrapper) resultWrapper.style.display = 'none';

                var manualBtn = document.getElementById('pcm2_' + sFormId + '_manualbtn');
                var autoBtn = document.getElementById('pcm2_' + sFormId + '_autobtn');
                if (manualBtn) manualBtn.style.display = 'none';
                if (autoBtn) autoBtn.style.display = '';

                var searchInput = document.getElementById('pcm2_' + sFormId + '_search');
                var resultDiv = document.getElementById('pcm2_' + sFormId + '_result');
                if (searchInput) searchInput.required = false;
                if (resultDiv) resultDiv.required = false;
            } else {
                var searchWrapper = document.getElementById('pcm2_' + sFormId + '_search_wrapper');
                var resultWrapper = document.getElementById('pcm2_' + sFormId + '_result_wrapper');
                if (searchWrapper && searchWrapper.parentNode) searchWrapper.parentNode.removeChild(searchWrapper);
                if (resultWrapper && resultWrapper.parentNode) resultWrapper.parentNode.removeChild(resultWrapper);

                var manualBtn = document.getElementById('pcm2_' + sFormId + '_manualbtn');
                var autoBtn = document.getElementById('pcm2_' + sFormId + '_autobtn');
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
                    // Hide label for the field
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
