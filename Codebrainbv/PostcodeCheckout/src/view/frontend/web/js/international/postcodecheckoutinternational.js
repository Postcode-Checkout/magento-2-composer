var iTimeout = 10;
var iShippingTimeout = 0;
var iBillingTimeout = 0;
var postcodecheckout_Autocomplete = [];

// Document ready
document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('checkout')) {
        postcodecheckout_initShipping();
    }
});

function postcodecheckout_initShipping(bReset) {
    if (bReset) {
        iShippingTimeout = 0;
    }

    if (document.getElementById('checkout-step-shipping')) {
        console.log('Shipment block available');
        postcodecheckout_initFunctions(document.getElementById('checkout-step-shipping'));

        var oContinueButton = document.querySelector('.button.action.continue.primary');
        if (oContinueButton) {
            console.log('Add init to the Submit Button.');
            oContinueButton.addEventListener('click', function () { postcodecheckout_initBilling(true); });
        } else {
            var oShipmentAsBilling = document.querySelector('.checkout-billing-address');
            if (oShipmentAsBilling) {
                oShipmentAsBilling.id = 'checkout-billing-address';
                console.log('Add init to the Shipping as Billing Button.');
                postcodecheckout_initFunctions(oShipmentAsBilling);
            }
        }
    } else {
        iShippingTimeout++;
        if (iShippingTimeout < iTimeout) {
            console.log('Shipment block not available (Tries: ' + iShippingTimeout + ')');
            setTimeout(function () { postcodecheckout_initShipping(); }, 2000);
        }
    }
}

function postcodecheckout_initBilling(bReset) {
    if (bReset) {
        iBillingTimeout = 0;
    }

    var paymentStep = document.getElementById('checkout-step-payment');
    var noPaymentsBlock = document.querySelectorAll('.no-payments-block').length;

    if (paymentStep && (noPaymentsBlock < 1)) {
        console.log('Payments block available');
        postcodecheckout_initFunctions(paymentStep);
    } else {
        iBillingTimeout++;
        if (iBillingTimeout < iTimeout) {
            console.log('Payments block not available (Tries: ' + iBillingTimeout + ')');
            setTimeout(function () { postcodecheckout_initBilling(); }, 2000);
        }
    }
}

function postcodecheckout_initFunctions(oElement, sSection) {
    var sId = oElement.id;
    var inputs = oElement.querySelectorAll('.pcpostcode_autocomplete_input input');
    var aElements = [];
    inputs.forEach(function(input) {
        aElements.push(input.id);
    });

    if (aElements.length) {
        aElements.forEach(function (id) {
            postcodecheckout_createInteractiveFunctions(id);
        });
    } else {
        console.log('No Elements Found, try again');
        setTimeout(function () { postcodecheckout_initFunctions(oElement); }, 500);
    }
}

function postcodecheckout_createInteractiveFunctions(sInputId) {
    postcodecheckout_addAutocompleteFunctions(sInputId);
    postcodecheckout_addCountryFunctions(sInputId);
    postcodecheckout_addDisableManualFunctions(sInputId);
}

function postcodecheckout_addAutocompleteFunctions(sId) {
    var oAutoComplete = document.getElementById(sId);
    if (oAutoComplete) {
        console.log('oAutoComplete(' + sId + ') *initiated*');
        postcodecheckout_Autocomplete[sId] = new PostcodeNl.AutocompleteAddress(oAutoComplete, {
            autocompleteUrl: '/postcodecheckout/proxy/suggestions?type=autocomplete',
            addressDetailsUrl: '/postcodecheckout/proxy/details?type=address'
        });

        oAutoComplete.addEventListener('autocomplete-select', function (event) {
            postcodecheckout_fillInFields(postcodecheckout_Autocomplete[sId], oAutoComplete, event);
        });
    }
}

function postcodecheckout_addCountryFunctions(sId) {
    console.log('postcodecheckout_addCountryFunctions(' + sId + ')');
    var oParentObject = postcodecheckout_getParentElement(document.getElementById(sId));
    var oSelectElement = oParentObject ? oParentObject.querySelector('select[name="country_id"]') : null;

    if (oSelectElement) {
        oSelectElement.addEventListener('change', function () { postcodecheckout_toggleCountry(this); });
        postcodecheckout_toggleCountry(oSelectElement);
    }
}

function postcodecheckout_addDisableManualFunctions(sId) {
    console.log('postcodecheckout_addDisableManualFunctions(' + sId + ')');
    var oParentObject = postcodecheckout_getParentElement(document.getElementById(sId));
    var oDisableElement = oParentObject ? oParentObject.querySelector('input[name="pcpostcode_autocomplete_disable"]') : null;

    if (oDisableElement) {
        oDisableElement.addEventListener('change', function () { postcodecheckout_checkDisable(this); });
        postcodecheckout_checkDisable(oDisableElement);
    }
}

function postcodecheckout_checkDisable(oElement) {
    var sDisabled = oElement.checked;

    if (postcodecheckout_returnCountry(oElement)) {
        console.log('postcodecheckout_checkDisable(Country says show.)');
        if (sDisabled === true) {
            console.log('postcodecheckout_checkDisable(not checked)');
            postcodecheckout_enableFields(oElement);
        } else {
            console.log('postcodecheckout_checkDisable(checked)');
            postcodecheckout_disableFields(oElement);
        }
    } else {
        console.log('postcodecheckout_checkDisable(Fields need to be enabled)');
        postcodecheckout_enableFields(oElement);
    }
}

function postcodecheckout_disableFields(oElement) {
    console.log('postcodecheckout_disableFields()');
    var oParentObject = postcodecheckout_getParentElement(oElement);

    if (!oParentObject) return;
    ['street[0]', 'street[1]', 'street[2]', 'city', 'postcode'].forEach(function(name) {
        var field = oParentObject.querySelector('[name="' + name + '"]');
        if (field) field.readOnly = true;
    });
}

function postcodecheckout_enableFields(oElement) {
    console.log('postcodecheckout_enableFields()');
    var oParentObject = postcodecheckout_getParentElement(oElement);

    if (!oParentObject) return;
    ['street[0]', 'street[1]', 'street[2]', 'city', 'postcode'].forEach(function(name) {
        var field = oParentObject.querySelector('[name="' + name + '"]');
        if (field) field.removeAttribute('readonly');
    });
}

function postcodecheckout_fillInFields(oAutoComplete, oElement, oResults) {
    console.log('postcodecheckout_fillInFields()');
    var oParentObject = postcodecheckout_getParentElement(oElement);

    if (oResults.detail.precision === 'Address') {
        oAutoComplete.getDetails(oResults.detail.context, function (oResult) {
            console.log(oResult);

            if (oResult.processed == 'success') {
                var oAddress = oResult.matches.address;
                var sStreet = oAddress.street;
                var sHouseNumber = oAddress.buildingNumber;
                var sHouseNumberAddition = oAddress.buildingNumberAddition;
                var sPostcode = oAddress.postcode;
                var sRegion = oAddress.locality;
                var sCity = oAddress.locality;
                var aSettings = getSettings();
                var sAddress = '';
                var sHouseNumber2 = '';

                if (sStreet) {
                    sAddress = sStreet;

                    if (sHouseNumber) {
                        if (aSettings.useStreet2AsHouseNumber) {
                            sHouseNumber2 = sHouseNumber;
                            if (!aSettings.useStreet3AsHouseNumberAddition && sHouseNumberAddition) {
                                sHouseNumber2 += ' ' + sHouseNumberAddition;
                            }
                        } else {
                            sAddress += ' ' + sHouseNumber;
                        }

                        if (sHouseNumberAddition && !aSettings.useStreet3AsHouseNumberAddition && !aSettings.useStreet2AsHouseNumber) {
                            sAddress += ' ' + sHouseNumberAddition;
                        }
                    }
                }

                var field;

                if (sAddress) {
                    field = oParentObject.querySelector('[name="street[0]"]');
                    if (field) { field.value = sAddress; field.dispatchEvent(new Event('keyup')); }
                }

                if (sHouseNumber2 && aSettings.useStreet2AsHouseNumber) {
                    field = oParentObject.querySelector('[name="street[1]"]');
                    if (field) { field.value = sHouseNumber2; field.dispatchEvent(new Event('keyup')); }
                }

                if (sHouseNumberAddition && aSettings.useStreet3AsHouseNumberAddition) {
                    field = oParentObject.querySelector('[name="street[2]"]');
                    if (field) { field.value = sHouseNumberAddition; field.dispatchEvent(new Event('keyup')); }
                } else {
                    field = oParentObject.querySelector('[name="street[2]"]');
                    if (field) { field.value = ''; field.dispatchEvent(new Event('keyup')); }
                }

                if (sPostcode) {
                    field = oParentObject.querySelector('[name="postcode"]');
                    if (field) { field.value = sPostcode; field.dispatchEvent(new Event('keyup')); }
                }

                if (sCity) {
                    field = oParentObject.querySelector('[name="city"]');
                    if (field) { field.value = sCity; field.dispatchEvent(new Event('keyup')); }
                }
            } else {
                console.log('Process seems to have failed, object given:');
                console.log(oResult);
            }
        });
    }
}

function getSettings() {
    if (window.checkoutConfig && window.checkoutConfig.pcpostcode_autocomplete && window.checkoutConfig.pcpostcode_autocomplete.settings) {
        return window.checkoutConfig.pcpostcode_autocomplete.settings;
    }
    return {};
}

function postcodecheckout_getParentElement(oElement) {
    if (!oElement) return false;
    var shipping = oElement.closest('#co-shipping-form');
    var billing = oElement.closest('.payment-method');
    var billing2 = oElement.closest('#checkout-billing-address');

    if (shipping) {
        return shipping;
    } else if (billing) {
        return billing;
    } else if (billing2) {
        return billing2;
    } else {
        console.log('No PARENT was found found.');
        return false;
    }
}

function postcodecheckout_hideFields(oElement) {
    console.log('postcodecheckout_hideFields()');
    var oParentObject = postcodecheckout_getParentElement(oElement);

    if (oParentObject) {
        var inputs = oParentObject.querySelectorAll('.pcpostcode_autocomplete_input');
        inputs.forEach(function(input){ input.style.display = 'none'; });
        var disables = oParentObject.querySelectorAll('.pcpostcode_autocomplete_disable');
        disables.forEach(function(disable){ disable.style.display = 'none'; });

        var oDisableElement = oParentObject.querySelector('input[name="pcpostcode_autocomplete_disable"]');
        if (oDisableElement) postcodecheckout_checkDisable(oDisableElement);
    }
}

function postcodecheckout_showFields(oElement) {
    console.log('postcodecheckout_showFields()');
    var oParentObject = postcodecheckout_getParentElement(oElement);

    if (oParentObject) {
        var inputs = oParentObject.querySelectorAll('.pcpostcode_autocomplete_input');
        inputs.forEach(function(input){ input.style.display = ''; });
        var disables = oParentObject.querySelectorAll('.pcpostcode_autocomplete_disable');
        disables.forEach(function(disable){ disable.style.display = ''; });

        var oDisableElement = oParentObject.querySelector('input[name="pcpostcode_autocomplete_disable"]');
        if (oDisableElement) postcodecheckout_checkDisable(oDisableElement);

        ['street[0]', 'street[1]', 'street[2]', 'postcode', 'city'].forEach(function(name) {
            var field = oParentObject.querySelector('[name="' + name + '"]');
            if (field) { field.value = ''; field.dispatchEvent(new Event('keyup')); }
        });

        var autocompleteInput = oParentObject.querySelector('.pcpostcode_autocomplete_input input');
        var sId = autocompleteInput ? autocompleteInput.id : null;
        var sCountryCodeIso3 = postcodecheckout_convertIso2ToIso3(postcodecheckout_returnCountry(oElement));
        console.log(sCountryCodeIso3);

        if (sId && postcodecheckout_Autocomplete[sId] && sCountryCodeIso3) {
            postcodecheckout_Autocomplete[sId].setCountry(sCountryCodeIso3);
        }
    }
}

function postcodecheckout_returnCountry(oElement) {
    var aCountries = (typeof magento2_countries !== 'undefined') ? magento2_countries : [];
    var oParentObject = postcodecheckout_getParentElement(oElement);
    var oSelect = oParentObject ? oParentObject.querySelector('select[name="country_id"]') : null;
    var sCountryCode = oSelect ? oSelect.value : null;

    if (aCountries.indexOf(sCountryCode) > -1) {
        return sCountryCode;
    } else {
        return false;
    }
}

function postcodecheckout_toggleCountry(oElement) {
    var bValidCountry = postcodecheckout_returnCountry(oElement);

    if (bValidCountry) {
        console.log('Country Supported');
        postcodecheckout_showFields(oElement);
    } else {
        console.log('Country Not Supported');
        postcodecheckout_hideFields(oElement);
    }
}

function postcodecheckout_convertIso2ToIso3(sIso2Code) {
    if (typeof pc4woo_SupportedCountries !== 'undefined') {
        var found = pc4woo_SupportedCountries.find(function (country) {
            return country.iso2 === sIso2Code;
        });
        return found ? found.iso3 : '';
    }
    return '';
}

function postcodecheckout_isSupportedCountry(sSection) {
    let sCountryCode = postcodecheckout_getCountryCode(sSection);

    if (typeof pc4woo_SupportedCountries !== 'undefined' && pc4woo_SupportedCountries.find(function (country) { return country.iso2 === sCountryCode; })) {
        return true;
    }
    return false;
}


function postcodecheckout_getCountryCodeFromId(iCountryId) {
    var aCountryCodes = {
        "231": "AF", "244": "AX", "230": "AL", "38": "DZ", "39": "AS", "40": "AD", "41": "AO", "42": "AI", "232": "AQ", "43": "AG", "44": "AR", "45": "AM", "46": "AW", "24": "AU", "2": "AT", "47": "AZ", "48": "BS", "49": "BH", "50": "BD", "51": "BB", "52": "BY", "3": "BE", "53": "BZ", "54": "BJ", "55": "BM", "56": "BT", "34": "BO", "233": "BA", "57": "BW", "234": "BV", "58": "BR", "235": "IO", "59": "BN", "236": "BG", "60": "BF", "61": "MM", "62": "BI", "63": "KH", "64": "CM", "4": "CA", "65": "CV", "237": "KY", "66": "CF", "67": "TD", "68": "CL", "5": "CN", "238": "CX", "239": "CC", "69": "CO", "70": "KM", "71": "CD", "72": "CG", "240": "CK", "73": "CR", "74": "HR", "75": "CU", "76": "CY", "16": "CZ", "20": "DK", "77": "DJ", "78": "DM", "79": "DO", "80": "TL", "81": "EC", "82": "EG", "83": "SV", "84": "GQ", "85": "ER", "86": "EE", "87": "ET", "88": "FK", "89": "FO", "90": "FJ", "7": "FI", "8": "FR", "241": "GF", "242": "PF", "243": "TF", "91": "GA", "92": "GM", "93": "GE", "1": "DE", "94": "GH", "97": "GI", "9": "GR", "96": "GL", "95": "GD", "98": "GP", "99": "GU", "100": "GT", "101": "GG", "102": "GN", "103": "GW", "104": "GY", "105": "HT", "106": "HM", "108": "HN", "22": "HK", "143": "HU", "109": "IS", "110": "IN", "111": "ID", "112": "IR", "113": "IQ", "26": "IE", "29": "IL", "10": "IT", "32": "CI", "115": "JM", "11": "JP", "116": "JE", "117": "JO", "118": "KZ", "119": "KE", "120": "KI", "121": "KP", "122": "KW", "123": "KG", "124": "LA", "125": "LV", "126": "LB", "127": "LS", "128": "LR", "129": "LY", "130": "LI", "131": "LT", "12": "LU", "132": "MO", "133": "MK", "134": "MG", "135": "MW", "136": "MY", "137": "MV", "138": "ML", "139": "MT", "114": "IM", "140": "MH", "141": "MQ", "142": "MR", "35": "MU", "144": "YT", "145": "MX", "146": "FM", "147": "MD", "148": "MC", "149": "MN", "150": "ME", "151": "MS", "152": "MA", "153": "MZ", "154": "NA", "155": "NR", "156": "NP", "13": "NL", "157": "AN", "158": "NC", "27": "NZ", "159": "NI", "160": "NE", "31": "NG", "161": "NU", "162": "NF", "163": "MP", "23": "NO", "164": "OM", "165": "PK", "166": "PW", "167": "PS", "168": "PA", "169": "PG", "170": "PY", "171": "PE", "172": "PH", "173": "PN", "14": "PL", "15": "PT", "174": "PR", "175": "QA", "176": "RE", "36": "RO", "177": "RU", "178": "RW", "179": "BL", "180": "KN", "181": "LC", "182": "MF", "183": "PM", "184": "VC", "185": "WS", "186": "SM", "187": "ST", "188": "SA", "189": "SN", "190": "RS", "191": "SC", "192": "SL", "25": "SG", "37": "SK", "193": "SI", "194": "SB", "195": "SO", "30": "ZA", "196": "GS", "28": "KR", "6": "ES", "197": "LK", "198": "SD", "199": "SR", "200": "SJ", "201": "SZ", "18": "SE", "19": "CH", "202": "SY", "203": "TW", "204": "TJ", "205": "TZ", "206": "TH", "33": "TG", "207": "TK", "208": "TO", "209": "TT", "210": "TN", "211": "TR", "212": "TM", "213": "TC", "214": "TV", "215": "UG", "216": "UA", "217": "AE", "17": "GB", "21": "US", "218": "UY", "219": "UZ", "220": "VU", "107": "VA", "221": "VE", "222": "VN", "223": "VG", "224": "VI", "225": "WF", "226": "EH", "227": "YE", "228": "ZM", "229": "ZW"
    };
    return aCountryCodes[iCountryId];
}

function postcodecheckout_getCountryCode(sCountryIso2) {
    return sCountryIso2;
}

function postcodecheckout_convertIso2ToIso3(sIso2Code) {
    if (typeof pc4woo_SupportedCountries !== 'undefined') {
        var found = pc4woo_SupportedCountries.find(function (country) {
            return country.iso2 === sIso2Code;
        });
        return found ? found.iso3 : '';
    }
    return '';
}

function postcodecheckout_isSupportedCountry(sSection) {
    var sCountryCode = postcodecheckout_getCountryCode(sSection);
    if (typeof pc4woo_SupportedCountries !== 'undefined' && pc4woo_SupportedCountries.find(function (country) { return country.iso2 === sCountryCode; })) {
        return true;
    }
    return false;
}

