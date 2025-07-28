var pcm2_oDomElementsFields = null;
var pcm2_oDomElements = null;
var pcm2_speed = 400;
var sOldAddition = null;
// var pcm2_SupportedCountries = pcm2_countries;
// var debugEnabled = (pcm2_config.pc_debugMode === 'yes');

console.log

function pc_prestaConsoleLogs(msg, data) {
    if (debugEnabled == 'yes') {
        console.log('PCAV:', msg);
        if (data) console.dir(data);
    }
}

// Initial load of the checkout address step
addEventListener("DOMContentLoaded", (event) => {
    // Check for address step and active
    if (jQuery('#checkout-addresses-step').length > 0 && jQuery('#checkout-addresses-step').hasClass('-current')) {
        pc_prestaConsoleLogs('Checkout addresses step is active, adding address lookup');
        pcm2_addLookup();
    }
});

document.addEventListener('DOMContentLoaded', function () {
    if (typeof prestashop !== 'undefined' && prestashop.on) {
        prestashop.on('updatedAddressForm', function (params) {
            if (jQuery('#checkout-addresses-step').length > 0 && jQuery('#checkout-addresses-step').hasClass('-current')) {
                pc_prestaConsoleLogs('Checkout addresses step is active, adding address lookup');
                pcm2_addLookup();
            }
        });
    }
});

function pcm2_addLookup() {

    var CountryId = jQuery('[name="country_id"]').val();

    var countryCode = pcm2_getCountryCodeFromId(CountryId);

    if (pcm2_getCountryCodeFromId(countryCode)) {
        // Does the form already have the fields
        if (jQuery('#pcm2_checkout-addresses-step_search_wrapper').length === 0) {
            pc_prestaConsoleLogs('Adding address lookup fields to the checkout form');
            pcm2_hideForm('checkout-addresses-step');
        }
        else {
            return;
        }
    }
    else {
        return;
    }

    if (pcm2_config.user_logged) {

        var sAddress1 = pcm2_oDomElements.address_1.val();
        var sPostcode = pcm2_oDomElements.postcode.val();
        var sCity = pcm2_oDomElements.city.val();

        // Fields filled in?
        if ((sAddress1.length > 0) && (sPostcode.length >= 6) && (sCity.length > 0)) {
            pcm2_restoreForm('checkout-addresses-step', true);
        }
    }

    jQuery('#pcm2_checkout-addresses-step_manualbtn').click(function () {
        pcm2_restoreForm('checkout-addresses-step', true);
    });

    jQuery('#pcm2_checkout-addresses-step_autobtn').click(function () {
        pcm2_hideForm('checkout-addresses-step', true);
    });

    var iso3Code = pcm2_convertIso2ToIso3(countryCode);

    const searchId = document.querySelector('#pcm2_checkout-addresses-step_search'),
        pcm2_Autocomplete = new PostcodeNl.AutocompleteAddress(searchId, {
            autocompleteUrl: "/postcodecheckout/proxy/suggestions?type=autocomplete",
            addressDetailsUrl: "/postcodecheckout/proxy/details?type=address",
            autoFocus: true,
            autoSelect: true,
            context: iso3Code
        });

    searchId.addEventListener('autocomplete-select', function (event) {
        if (event.detail.precision === 'Address') {

            pcm2_Autocomplete.getDetails(event.detail.context, function (result) {
                pcm2_consoleLogs(result);

                if (typeof result.address.street !== 'undefined' && typeof result.address.buildingNumber !== 'undefined' && typeof result.address.locality !== 'undefined') {

                    if (pcm2_config.address_2 == 2) {
                        pcm2_oDomElements.address_1.val(result.address.street);
                        pcm2_oDomElements.address_2.val(result.address.buildingNumber + ' ' + (result.address.buildingNumberAddition ? result.address.buildingNumberAddition : ''));
                    } else if (pcm2_config.address_2 == 1) {
                        pcm2_oDomElements.address_1.val(result.address.street + ' ' + result.address.buildingNumber);
                        pcm2_oDomElements.address_2.val(result.address.buildingNumberAddition ? result.address.buildingNumberAddition : '');
                    } else {
                        pcm2_oDomElements.address_1.val(result.address.street + ' ' + result.address.buildingNumber + ' ' + (result.address.buildingNumberAddition ? result.address.buildingNumberAddition : ''));
                    }

                    pcm2_oDomElements.postcode.val(pcm2_formatPostcode(result.address.postcode, sCountryCode));
                    pcm2_oDomElements.city.val(result.address.locality);

                    if (pcm2_config.hide_fields === 'true') {
                        pcm2_updatePreview('checkout-addresses-step');
                    }

                } else {
                    pcm2_restoreForm('checkout-addresses-step');
                }
            });
        }
    });

    function pcm2_formatPostcode(sPostcode, sCountryCode) {
        if (sCountryCode == 'NL') {
            sPostcode = sPostcode.replace(/(\d{4})/g, '$1 ').replace(/(^\s+|\s+$)/, '');
        }
        return sPostcode;
    }

    function pcm2_updatePreview(sFormId) {
        jQuery('#pcm2_' + sFormId + '_result').html(
            pcm2_oDomElements.address_1.val() + ' ' + pcm2_oDomElements.address_2.val() + '<br>' + pcm2_oDomElements.postcode.val() + ' ' + pcm2_oDomElements.city.val());
    }

    function pcm2_getDomElementsFields() {
        pcm2_oDomElementsFields =
        {
            address_1: jQuery('[name="address1"]').closest('.form-group'),
            address_2: jQuery('[name="address2"]').closest('.form-group'),
            postcode: jQuery('[name="postcode"]').closest('.form-group'),
            city: jQuery('[name="city"]').closest('.form-group'),
            country: jQuery('[name="id_country"]').closest('.form-group')
        };

        return pcm2_oDomElementsFields;
    }

    function pcm2_getElements() {
        pcm2_oDomElements =
        {
            address_1: jQuery('[name="address1"]'),
            address_2: jQuery('[name="address2"]'),
            postcode: jQuery('[name="postcode"]'),
            city: jQuery('[name="city"]'),
            country: jQuery('[name="id_country"]')
        };

        return pcm2_oDomElements;
    }

    function pcm2_hideForm(sFormId, bCheckbox) {
        oFields = pcm2_getDomElementsFields();
        oElements = pcm2_getElements();

        if (typeof bCheckbox !== 'undefined') {
            // Field wrappers
            jQuery('#pcm2_' + sFormId + '_search_wrapper').show(pcm2_speed);
            jQuery('#pcm2_' + sFormId + '_result_wrapper').show(pcm2_speed);

            // Buttons
            jQuery('#pcm2_' + sFormId + '_manualbtn').show(pcm2_speed);
            jQuery('#pcm2_' + sFormId + '_autobtn').hide(pcm2_speed);


            // Add required property
            jQuery('#pcm2_' + sFormId + '_search').prop('required', true);
            jQuery('#pcm2_' + sFormId + '_result').prop('required', true);
        }
        else {

            // Add our template to the checkout
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

            jQuery(oFields.address_1).before(sPcex4prestaSearchTemplate);
        }

        if (pcm2_config.hide_fields === 'true') {
            var domKeys = Object.keys(oFields);

            for (var iDom = 0; iDom < domKeys.length; iDom++) {
                if (domKeys[iDom] != 'country') {
                    jQuery(oElements[domKeys[iDom]]).val('');
                    jQuery(oFields[domKeys[iDom]]).hide(pcm2_speed);
                }
            }
        }
        else {
            // Disable the input fields
            var domKeys = Object.keys(oElements);

            for (var iDom = 0; iDom < domKeys.length; iDom++) {
                if (domKeys[iDom] != 'country') {
                    jQuery(oElements[domKeys[iDom]]).val('');
                    jQuery(oElements[domKeys[iDom]]).attr('readonly', '');
                }
            }
        }
    }

    function pcm2_restoreForm(sFormId, bCheckbox) {
        oFields = pcm2_getDomElementsFields();
        oElements = pcm2_getElements();

        if (pcm2_config.hide_fields === 'true') {
            var domKeys = Object.keys(oFields);

            for (var iDom = 0; iDom < domKeys.length; iDom++) {
                if (domKeys[iDom] != 'country') {
                    jQuery(oFields[domKeys[iDom]]).show(pcm2_speed);
                }
            }
        }
        else {
            // Enable the input fields
            var domKeys = Object.keys(oElements);

            for (var iDom = 0; iDom < domKeys.length; iDom++) {
                if (domKeys[iDom] != 'country') {
                    jQuery(oElements[domKeys[iDom]]).removeAttr('readonly');
                    pc_prestaConsoleLogs('PC CB int 4 PRESTA: DISABLE FIELD', oElements[domKeys[iDom]]);
                }
            }
        }

        if (typeof bCheckbox !== 'undefined') {
            //Field wrappers
            jQuery('#pcm2_' + sFormId + '_search_wrapper').hide(pcm2_speed);
            jQuery('#pcm2_' + sFormId + '_result_wrapper').hide(pcm2_speed);

            // Buttons
            jQuery('#pcm2_' + sFormId + '_manualbtn').hide(pcm2_speed);
            jQuery('#pcm2_' + sFormId + '_autobtn').show(pcm2_speed);

            // Remove required property
            jQuery('#pcm2_' + sFormId + '_search').prop('required', false);
            jQuery('#pcm2_' + sFormId + '_result').prop('required', false);
        }
        else {
            // Field wrappers
            jQuery('#pcm2_' + sFormId + '_search_wrapper').remove();
            jQuery('#pcm2_' + sFormId + '_result_wrapper').remove();

            // Buttons
            jQuery('#pcm2_' + sFormId + '_manualbtn').remove();
            jQuery('#pcm2_' + sFormId + '_autobtn').remove();
        }
    }

    function pcm2_getCountryCodeFromId(iCountryId) {
        var aCountryCodes = { "231": "AF", "244": "AX", "230": "AL", "38": "DZ", "39": "AS", "40": "AD", "41": "AO", "42": "AI", "232": "AQ", "43": "AG", "44": "AR", "45": "AM", "46": "AW", "24": "AU", "2": "AT", "47": "AZ", "48": "BS", "49": "BH", "50": "BD", "51": "BB", "52": "BY", "3": "BE", "53": "BZ", "54": "BJ", "55": "BM", "56": "BT", "34": "BO", "233": "BA", "57": "BW", "234": "BV", "58": "BR", "235": "IO", "59": "BN", "236": "BG", "60": "BF", "61": "MM", "62": "BI", "63": "KH", "64": "CM", "4": "CA", "65": "CV", "237": "KY", "66": "CF", "67": "TD", "68": "CL", "5": "CN", "238": "CX", "239": "CC", "69": "CO", "70": "KM", "71": "CD", "72": "CG", "240": "CK", "73": "CR", "74": "HR", "75": "CU", "76": "CY", "16": "CZ", "20": "DK", "77": "DJ", "78": "DM", "79": "DO", "80": "TL", "81": "EC", "82": "EG", "83": "SV", "84": "GQ", "85": "ER", "86": "EE", "87": "ET", "88": "FK", "89": "FO", "90": "FJ", "7": "FI", "8": "FR", "241": "GF", "242": "PF", "243": "TF", "91": "GA", "92": "GM", "93": "GE", "1": "DE", "94": "GH", "97": "GI", "9": "GR", "96": "GL", "95": "GD", "98": "GP", "99": "GU", "100": "GT", "101": "GG", "102": "GN", "103": "GW", "104": "GY", "105": "HT", "106": "HM", "108": "HN", "22": "HK", "143": "HU", "109": "IS", "110": "IN", "111": "ID", "112": "IR", "113": "IQ", "26": "IE", "29": "IL", "10": "IT", "32": "CI", "115": "JM", "11": "JP", "116": "JE", "117": "JO", "118": "KZ", "119": "KE", "120": "KI", "121": "KP", "122": "KW", "123": "KG", "124": "LA", "125": "LV", "126": "LB", "127": "LS", "128": "LR", "129": "LY", "130": "LI", "131": "LT", "12": "LU", "132": "MO", "133": "MK", "134": "MG", "135": "MW", "136": "MY", "137": "MV", "138": "ML", "139": "MT", "114": "IM", "140": "MH", "141": "MQ", "142": "MR", "35": "MU", "144": "YT", "145": "MX", "146": "FM", "147": "MD", "148": "MC", "149": "MN", "150": "ME", "151": "MS", "152": "MA", "153": "MZ", "154": "NA", "155": "NR", "156": "NP", "13": "NL", "157": "AN", "158": "NC", "27": "NZ", "159": "NI", "160": "NE", "31": "NG", "161": "NU", "162": "NF", "163": "MP", "23": "NO", "164": "OM", "165": "PK", "166": "PW", "167": "PS", "168": "PA", "169": "PG", "170": "PY", "171": "PE", "172": "PH", "173": "PN", "14": "PL", "15": "PT", "174": "PR", "175": "QA", "176": "RE", "36": "RO", "177": "RU", "178": "RW", "179": "BL", "180": "KN", "181": "LC", "182": "MF", "183": "PM", "184": "VC", "185": "WS", "186": "SM", "187": "ST", "188": "SA", "189": "SN", "190": "RS", "191": "SC", "192": "SL", "25": "SG", "37": "SK", "193": "SI", "194": "SB", "195": "SO", "30": "ZA", "196": "GS", "28": "KR", "6": "ES", "197": "LK", "198": "SD", "199": "SR", "200": "SJ", "201": "SZ", "18": "SE", "19": "CH", "202": "SY", "203": "TW", "204": "TJ", "205": "TZ", "206": "TH", "33": "TG", "207": "TK", "208": "TO", "209": "TT", "210": "TN", "211": "TR", "212": "TM", "213": "TC", "214": "TV", "215": "UG", "216": "UA", "217": "AE", "17": "GB", "21": "US", "218": "UY", "219": "UZ", "220": "VU", "107": "VA", "221": "VE", "222": "VN", "223": "VG", "224": "VI", "225": "WF", "226": "EH", "227": "YE", "228": "ZM", "229": "ZW" };

        return aCountryCodes[iCountryId];
    }
}

function pcm2_getCountryCode(countryIso2) {
    return countryIso2;
}

function pcm2_convertIso2ToIso3(iso2Code) {
    return pcm2_SupportedCountries.find(country => country.iso2 === iso2Code).iso3;
}

function pcm2_isSupportedCountry(sSection) {
    let countryCode = pcm2_getCountryCode(sSection);


    if (pcm2_SupportedCountries.find(country => country.iso2 === countryCode)) {

        return true;
    }
    return false;
}