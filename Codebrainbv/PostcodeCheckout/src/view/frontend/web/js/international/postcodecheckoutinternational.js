define('Codebrainbv_PostcodeCheckout/js/international/postcodecheckoutinternational', [], function () {
    'use strict';

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
                pcm2_removeDefaultAddressFields();
            }
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

        function pcm2_hideForm(sFormId, bCheckbox) {
            var dom = pcm2_getDomElements();

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
            if (!searchWrapper && dom.street && dom.street.parentNode) {
                var pcm2_trans = window.pcm2_trans || { field_label: 'Address lookup', enter_manually: 'Enter manually', enter_automatically: 'Enter automatically' };
                var sPcex4prestaSearchTemplate =
                    '<div class="form-group row" id="pcm2_' + sFormId + '_search_wrapper">' +
                    '<label class="col-md-3 form-control-label">' + pcm2_trans.field_label + '</label>' +
                    '<div class="col-md-6">' +
                    '<input id="pcm2_' + sFormId + '_search" name="pcm2_' + sFormId + '_search" class="form-control" type="text" required>' +
                    '</div>' +
                    '</div>' +
                    '<div class="form-group row" id="pcm2_' + sFormId + '_result_wrapper">' +
                    '<label class="col-md-3 form-control-label"></label>' +
                    '<div class="col-md-6" id="pcm2_' + sFormId + '_result"></div>' +
                    '</div>' +
                    '<div class="required form-group row">' +
                    '<label class="col-md-3 form-control-label"></label>' +
                    '<div class="col-md-3">' +
                    '<button type="button" class="btn btn-default button button-small" id="pcm2_' + sFormId + '_manualbtn">' +
                    '<span>' + pcm2_trans.enter_manually + '<i class="icon-chevron-right right"></i></span>' +
                    '</button>' +
                    '<button type="button" class="btn btn-default button button-small" id="pcm2_' + sFormId + '_autobtn" style="display: none;">' +
                    '<span>' + pcm2_trans.enter_automatically + '<i class="icon-chevron-right right"></i></span>' +
                    '</button>' +
                    '</div>' +
                    '</div>';

                dom.street.parentNode.insertAdjacentHTML('beforebegin', sPcex4prestaSearchTemplate);
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

        function pcm2_restoreForm(sFormId, bCheckbox) {
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
        }

        function pcm2_removeDefaultAddressFields() {
            var dom = pcm2_getDomElements();

            console.dir('Removing default address fields:', dom);
            Object.keys(dom).forEach(function (key) {
                // Do not hide the region field
                if (key === 'region') return;
                if (dom[key]) {
                    var fieldWrapper = dom[key].closest('.field') || dom[key].closest('.form-group');
                    if (fieldWrapper) {
                        fieldWrapper.classList.add('hidden');
                    } else {
                        dom[key].classList.add('hidden');
                    }
                }
            });
        }

        function pcm2_getCountryCodeFromId(iCountryId) {
            var aCountryCodes = { "231": "AF", "244": "AX", "230": "AL", "38": "DZ", "39": "AS", "40": "AD", "41": "AO", "42": "AI", "232": "AQ", "43": "AG", "44": "AR", "45": "AM", "46": "AW", "24": "AU", "2": "AT", "47": "AZ", "48": "BS", "49": "BH", "50": "BD", "51": "BB", "52": "BY", "3": "BE", "53": "BZ", "54": "BJ", "55": "BM", "56": "BT", "34": "BO", "233": "BA", "57": "BW", "234": "BV", "58": "BR", "235": "IO", "59": "BN", "236": "BG", "60": "BF", "61": "MM", "62": "BI", "63": "KH", "64": "CM", "4": "CA", "65": "CV", "237": "KY", "66": "CF", "67": "TD", "68": "CL", "5": "CN", "238": "CX", "239": "CC", "69": "CO", "70": "KM", "71": "CD", "72": "CG", "240": "CK", "73": "CR", "74": "HR", "75": "CU", "76": "CY", "16": "CZ", "20": "DK", "77": "DJ", "78": "DM", "79": "DO", "80": "TL", "81": "EC", "82": "EG", "83": "SV", "84": "GQ", "85": "ER", "86": "EE", "87": "ET", "88": "FK", "89": "FO", "90": "FJ", "7": "FI", "8": "FR", "241": "GF", "242": "PF", "243": "TF", "91": "GA", "92": "GM", "93": "GE", "1": "DE", "94": "GH", "97": "GI", "9": "GR", "96": "GL", "95": "GD", "98": "GP", "99": "GU", "100": "GT", "101": "GG", "102": "GN", "103": "GW", "104": "GY", "105": "HT", "106": "HM", "108": "HN", "22": "HK", "143": "HU", "109": "IS", "110": "IN", "111": "ID", "112": "IR", "113": "IQ", "26": "IE", "29": "IL", "10": "IT", "32": "CI", "115": "JM", "11": "JP", "116": "JE", "117": "JO", "118": "KZ", "119": "KE", "120": "KI", "121": "KP", "122": "KW", "123": "KG", "124": "LA", "125": "LV", "126": "LB", "127": "LS", "128": "LR", "129": "LY", "130": "LI", "131": "LT", "12": "LU", "132": "MO", "133": "MK", "134": "MG", "135": "MW", "136": "MY", "137": "MV", "138": "ML", "139": "MT", "114": "IM", "140": "MH", "141": "MQ", "142": "MR", "35": "MU", "144": "YT", "145": "MX", "146": "FM", "147": "MD", "148": "MC", "149": "MN", "150": "ME", "151": "MS", "152": "MA", "153": "MZ", "154": "NA", "155": "NR", "156": "NP", "13": "NL", "157": "AN", "158": "NC", "27": "NZ", "159": "NI", "160": "NE", "31": "NG", "161": "NU", "162": "NF", "163": "MP", "23": "NO", "164": "OM", "165": "PK", "166": "PW", "167": "PS", "168": "PA", "169": "PG", "170": "PY", "171": "PE", "172": "PH", "173": "PN", "14": "PL", "15": "PT", "174": "PR", "175": "QA", "176": "RE", "36": "RO", "177": "RU", "178": "RW", "179": "BL", "180": "KN", "181": "LC", "182": "MF", "183": "PM", "184": "VC", "185": "WS", "186": "SM", "187": "ST", "188": "SA", "189": "SN", "190": "RS", "191": "SC", "192": "SL", "25": "SG", "37": "SK", "193": "SI", "194": "SB", "195": "SO", "30": "ZA", "196": "GS", "28": "KR", "6": "ES", "197": "LK", "198": "SD", "199": "SR", "200": "SJ", "201": "SZ", "18": "SE", "19": "CH", "202": "SY", "203": "TW", "204": "TJ", "205": "TZ", "206": "TH", "33": "TG", "207": "TK", "208": "TO", "209": "TT", "210": "TN", "211": "TR", "212": "TM", "213": "TC", "214": "TV", "215": "UG", "216": "UA", "217": "AE", "17": "GB", "21": "US", "218": "UY", "219": "UZ", "220": "VU", "107": "VA", "221": "VE", "222": "VN", "223": "VG", "224": "VI", "225": "WF", "226": "EH", "227": "YE", "228": "ZM", "229": "ZW" };

            return aCountryCodes[iCountryId];
        }
        function pcm2_getCountryCode(sCountryIso2) {
            return sCountryIso2;
        }

        function pcm2_convertIso2ToIso3(sIso2Code) {
            return pcm2_SupportedCountries.find(country => country.iso2 === sIso2Code).iso3;
        }

        function pcm2_isSupportedCountry(sSection) {
            let sCountryCode = pcm2_getCountryCode(sSection);


            if (pcm2_SupportedCountries.find(country => country.iso2 === sCountryCode)) {

                return true;
            }
            return false;
        }
});
