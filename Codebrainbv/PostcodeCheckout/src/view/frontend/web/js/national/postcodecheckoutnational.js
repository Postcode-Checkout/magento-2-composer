define('Codebrainbv_PostcodeCheckout/js/national/postcodecheckoutnational', [], function () {
    'use strict';

    var debugEnabled = window.pcm2_config && window.pcm2_config.debug_mode ? true : false;
    var iTimeout = 10;
    var iShippingTimeout = 0;
    var iBillingTimeout = 0;
    var sOldAddition = null;
    var pc4m2_speed = 200;
    var aSettings = getSettings();

    function pcm2_ConsoleLogs(msg, data) {
            if (debugEnabled) {
                console.log('PCM2:', msg);
                if (data) console.dir(data);
            }
        }


    function closestParent(element, selector) {
        while (element && element !== document) {
            if (element.matches(selector)) return element;
            element = element.parentElement;
        }
        return null;
    }

    function postcodecheckout_getParentElement(oElement) {
        var shipping = closestParent(oElement, '#co-shipping-form');
        if (shipping) return shipping;
        var billing = closestParent(oElement, '.payment-method');
        if (billing) return billing;
        var billingAddress = closestParent(oElement, '#checkout-billing-address');
        if (billingAddress) return billingAddress;
        return null;
    }

    var delay = (function () {
        var timer = 0;
        return function (callback, ms) {
            clearTimeout(timer);
            timer = setTimeout(callback, ms);
        };
    })();

    function postcodecheckout_initShipping(bReset) {
        if (bReset) iShippingTimeout = 0;
        var url = /[^/]*$/.exec(window.location.href)[0];
        var shippingStep = document.getElementById('checkout-step-shipping');
        if (shippingStep) {
            postcodecheckout_initFunctions(shippingStep);
            var oContinueButton = document.querySelector('.button.action.continue.primary');
            if (url === '#payment') {
                postcodecheckout_initBilling(true);
            } else if (oContinueButton) {
                oContinueButton.addEventListener('click', function () {
                    postcodecheckout_initBilling(true);
                });
            } else {
                var oShipmentAsBilling = document.querySelector('.checkout-billing-address');
                if (oShipmentAsBilling) {
                    oShipmentAsBilling.id = 'checkout-billing-address';
                    postcodecheckout_initFunctions(oShipmentAsBilling);
                }
            }
        } else {
            iShippingTimeout++;
            if (iShippingTimeout < iTimeout) {
                setTimeout(function () { postcodecheckout_initShipping(); }, 3000);
            }
        }
    }

    function postcodecheckout_initBilling(bReset) {
        if (bReset) iBillingTimeout = 0;
        var paymentStep = document.getElementById('checkout-step-payment');
        var noPaymentsBlock = document.querySelector('.no-payments-block');
        if (paymentStep && !noPaymentsBlock) {
            postcodecheckout_initFunctions(paymentStep);
        } else {
            iBillingTimeout++;
            if (iBillingTimeout < iTimeout) {
                setTimeout(function () { postcodecheckout_initBilling(); }, 3000);
            }
        }
    }

    function postcodecheckout_initFunctions(oElement) {
        var pcPostcodeFields = oElement.querySelectorAll('.pc_postcode [name="pc_postcode_postcode"]');
        if (pcPostcodeFields.length) {
            pcPostcodeFields.forEach(function (el) {
                postcodecheckout_createInteractiveFunctions(el.id);
            });
        } else {
            setTimeout(function () { postcodecheckout_initFunctions(oElement); }, 500);
        }
    }

    function postcodecheckout_createInteractiveFunctions(sInputId) {
        postcodecheckout_addAutocompleteFunctions(sInputId);
        postcodecheckout_addCountryFunctions(sInputId);
        postcodecheckout_addDisableManualFunctions(sInputId);
    }

    function postcodecheckout_addAutocompleteFunctions(sId) {
        var oPostcode = document.getElementById(sId);
        if (oPostcode) {
            var oParent = closestParent(oPostcode, '.fieldset.address');
            var oPostcodeField = oParent.querySelector('[name="pc_postcode_postcode"]');
            var oHousenumberField = oParent.querySelector('[name="pc_postcode_housenumber"]');
            var oHousenumberAdditionField = oParent.querySelector('[name="pc_postcode_housenumber_addition"]');
            var oHousenumberFreeAdditionField = oParent.querySelector('[name="pc_postcode_free_addition"]');

            oPostcodeField.setAttribute("autocomplete", "postcode");
            oHousenumberField.setAttribute("autocomplete", "housenumber");

            postcodecheckout_keyUp(oPostcodeField, oHousenumberField, true);

            oPostcodeField.addEventListener('keyup', function () {
                postcodecheckout_keyUp(oPostcodeField, oHousenumberField);
            });
            oHousenumberField.addEventListener('keyup', function () {
                postcodecheckout_keyUp(oPostcodeField, oHousenumberField);
            });

            oHousenumberAdditionField.addEventListener('change', function () {
                var sNewAdditionValue = oHousenumberAdditionField.value;
                postcodecheckout_changeHousenumberAddition(oHousenumberAdditionField, sNewAdditionValue);
            });

            oHousenumberFreeAdditionField.addEventListener('keyup', function () {
                var sNewAdditionValue = oHousenumberFreeAdditionField.value;
                setTimeout(function () { postcodecheckout_changeHousenumberAddition(oHousenumberFreeAdditionField, sNewAdditionValue); }, 200);
            });
        }
    }

    function postcodecheckout_keyUp(oPostcodeField, oHousenumberField, fast = false) {
        var sPostcode = oPostcodeField.value.replace(/\s/g, "");
        var iHousenumber = oHousenumberField.value.replace(/(^\d+)(.*?$)/i, '$1');
        var timeoutTime = fast ? 0 : 600;

        if (sPostcode.length >= 6 && iHousenumber.length != 0) {
            delay(function () {
                var xhr = new XMLHttpRequest();
                xhr.open('POST', '/postcodecheckout/proxy/address', true);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        var data = JSON.parse(xhr.responseText);
                        postcodecheckout_fillInFields(oPostcodeField, data);
                    }
                };
                var params = 'sPostcode=' + encodeURIComponent(sPostcode) +
                    '&iHousenumber=' + encodeURIComponent(iHousenumber) +
                    '&xAddition=';
                xhr.send(params);
            }, timeoutTime);
        }
    }

    function postcodecheckout_addCountryFunctions(sId) {
        var oParentObject = postcodecheckout_getParentElement(document.getElementById(sId));
        var oSelectElement = oParentObject.querySelector('select[name="country_id"]');
        oSelectElement.addEventListener('change', function () { postcodecheckout_toggleCountry(this); });
        postcodecheckout_toggleCountry(oSelectElement);
    }

    function postcodecheckout_addDisableManualFunctions(sId) {
        var oParentObject = postcodecheckout_getParentElement(document.getElementById(sId));
        var oDisableElement = oParentObject.querySelector('input[name="pc_postcode_disable"]');
        oDisableElement.addEventListener('change', function () { postcodecheckout_checkDisable(this); });
        postcodecheckout_checkDisable(oDisableElement);
    }

    function postcodecheckout_checkDisable(oElement) {
        var sDisabled = oElement.checked;
        if (postcodecheckout_returnCountry(oElement)) {
            if (sDisabled == true) {
                postcodecheckout_enableFields(oElement);
            } else {
                postcodecheckout_disableFields(oElement);
            }
        } else {
            postcodecheckout_enableFields(oElement);
        }
    }

    function postcodecheckout_disableFields(oElement) {
        var oParentObject = postcodecheckout_getParentElement(oElement);
        showHideField(oParentObject, '[name="pc_postcode_postcode"]', true);
        showHideField(oParentObject, '[name="pc_postcode_housenumber"]', true);

        setReadonly(oParentObject, '[name="street[0]"]', true);
        setReadonly(oParentObject, '[name="street[1]"]', true);
        setReadonly(oParentObject, '[name="street[2]"]', true);
        setReadonly(oParentObject, '[name="city"]', true);
        setReadonly(oParentObject, '[name="region"]', true);
        setReadonly(oParentObject, '[name="postcode"]', true);
    }

    function postcodecheckout_enableFields(oElement) {
        var oParentObject = postcodecheckout_getParentElement(oElement);
        showHideField(oParentObject, '[name="pc_postcode_postcode"]', false);
        showHideField(oParentObject, '[name="pc_postcode_housenumber"]', false);
        showHideField(oParentObject, '[name="pc_postcode_housenumber_addition"]', false);
        showHideField(oParentObject, '[name="pc_postcode_free_addition"]', false);

        clearField(oParentObject, '[name="pc_postcode_postcode"]');
        clearField(oParentObject, '[name="pc_postcode_housenumber"]');
        clearField(oParentObject, '[name="pc_postcode_housenumber_addition"]');
        clearField(oParentObject, '[name="pc_postcode_free_addition"]');

        setReadonly(oParentObject, '[name="street[0]"]', false);
        setReadonly(oParentObject, '[name="street[1]"]', false);
        setReadonly(oParentObject, '[name="street[2]"]', false);
        setReadonly(oParentObject, '[name="city"]', false);
        setReadonly(oParentObject, '[name="region"]', false);
        setReadonly(oParentObject, '[name="postcode"]', false);
    }

    function showHideField(parent, selector, show) {
        var el = parent.querySelector(selector);
        if (el) {
            var div = closestParent(el, 'div');
            if (div && div.parentElement) {
                div.parentElement.style.display = show ? '' : 'none';
            }
        }
    }

    function setReadonly(parent, selector, readonly) {
        var el = parent.querySelector(selector);
        if (el) el.readOnly = readonly;
    }

    function clearField(parent, selector) {
        var el = parent.querySelector(selector);
        if (el) {
            el.value = '';
            var event = new Event('keyup');
            el.dispatchEvent(event);
        }
    }

    function setField(parent, selector, value) {
        var el = parent.querySelector(selector);
        if (el) {
            el.value = value;
            var event = new Event('keyup');
            el.dispatchEvent(event);
        }
    }

    function removeError(parent, selector) {
        var el = parent.querySelector(selector);
        if (el) {
            var errorDiv = el.nextElementSibling;
            if (errorDiv && errorDiv.classList.contains('error-message')) {
                errorDiv.remove();
            }
        }
    }

    function addError(parent, selector, message) {
        var el = parent.querySelector(selector);
        if (el) {
            removeError(parent, selector);
            var errorDiv = document.createElement('div');
            errorDiv.className = 'error-message field-error';
            errorDiv.textContent = 'Error: ' + message;
            el.parentNode.insertBefore(errorDiv, el.nextSibling);
        }
    }

    function postcodecheckout_fillInFields(oElement, oResults) {
        var oParentObject = postcodecheckout_getParentElement(oElement);
        if (oResults.processed == 'success') {
            var oAddress = oResults.result;
            var sStreet = oAddress.street;
            var sHouseNumber = oAddress.housenumber;
            var sHouseNumberAddition = '';
            var aHouseNumberAdditions = oAddress.addition;
            var sPostcode = oAddress.postcode;
            var sRegion = oAddress.province;
            var sCity = oAddress.city;
            var aSettings = getSettings();

            var sAddress = sStreet || '';
            var sHouseNumber2;

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

            if (sAddress) setField(oParentObject, '[name="street[0]"]', sAddress);
            if (sHouseNumber2 && aSettings.useStreet2AsHouseNumber) setField(oParentObject, '[name="street[1]"]', sHouseNumber2);

            sOldAddition = null;
            if (aHouseNumberAdditions && aHouseNumberAdditions.length > 0 && oResults.provider !== 'postcodeapi') {
                postcodecheckout_setHouseNumberAdditions(oParentObject, aHouseNumberAdditions);
            } else {
                postcodecheckout_setHouseNumberAdditions(oParentObject, []);
                postcodecheckout_showHouseNumberFreeAdditions(oParentObject, []);
                var sAddition = oParentObject.querySelector('[name="pc_postcode_free_addition"]').value;
                var oHousenumberAdditionField = oParentObject.querySelector('[name="pc_postcode_housenumber_addition"]');
                if (sAddition && sAddition.length > 0) {
                    postcodecheckout_changeHousenumberAddition(oHousenumberAdditionField, sAddition);
                }
            }

            if (sHouseNumberAddition && aSettings.useStreet3AsHouseNumberAddition) {
                setField(oParentObject, '[name="street[2]"]', sHouseNumberAddition);
            } else {
                setField(oParentObject, '[name="street[2]"]', '');
            }
            if (sPostcode) setField(oParentObject, '[name="postcode"]', sPostcode);
            if (sRegion) setField(oParentObject, '[name="region"]', sRegion);
            if (sCity) setField(oParentObject, '[name="city"]', sCity);

            removeError(oParentObject, '[name="pc_postcode_housenumber"]');
        } else if (oResults.processed == 'failed') {
            removeError(oParentObject, '[name="pc_postcode_housenumber"]');
            addError(oParentObject, '[name="pc_postcode_housenumber"]', oResults.message);
        } else {
            pcm2_ConsoleLogs('Process seems to have failed, object given:', oResults);
        }
    }

    function postcodecheckout_setHouseNumberAdditions(oParentObject, aAdditions) {
        var oAdditionsField = oParentObject.querySelector('[name="pc_postcode_housenumber_addition"]');
        if (oAdditionsField) {
            oAdditionsField.innerHTML = '';
            if (aAdditions.length > 1) {
                var sAdditionValue = oAdditionsField.value;
                aAdditions.forEach(function (sAddition) {
                    var option = document.createElement('option');
                    option.value = sAddition;
                    option.textContent = sAddition;
                    oAdditionsField.appendChild(option);
                });
                oAdditionsField.parentElement.parentElement.style.display = '';
                oAdditionsField.value = sAdditionValue;
            } else {
                oAdditionsField.parentElement.parentElement.style.display = 'none';
            }
        }
    }

    function postcodecheckout_showHouseNumberFreeAdditions(oParentObject) {
        var oAdditionsField = oParentObject.querySelector('[name="pc_postcode_free_addition"]');
        if (oAdditionsField) {
            var sAdditionValue = oAdditionsField.value;
            oAdditionsField.parentElement.parentElement.style.display = '';
            oAdditionsField.value = sAdditionValue;
        }
    }

    function postcodecheckout_changeHousenumberAddition(oElement, sNewAdditionValue) {
        var oParentObject = postcodecheckout_getParentElement(oElement);
        var aSettings = getSettings();
        var sCurrentStreetValue = false;
        var sNewStreetvalue = false;
        var sAddition = false;

        if (typeof sNewAdditionValue === 'undefined') return;
        sNewAdditionValue = sNewAdditionValue.replace(/\s/g, '');

        var street0 = oParentObject.querySelector('[name="street[0]"]');
        sCurrentStreetValue = postcodecheckout_removeAdditionFromStreet(street0 ? street0.value : '');

        sAddition = (sNewAdditionValue) ? ' ' + sNewAdditionValue : '';
        sNewStreetvalue = sCurrentStreetValue + sAddition;

        if (aSettings.useStreet3AsHouseNumberAddition) {
            var street2 = oParentObject.querySelector('[name="street[2]"]');
            if (street2) {
                street2.value = sNewAdditionValue;
                street2.dispatchEvent(new Event('keyup'));
            }
        } else if (aSettings.useStreet2AsHouseNumber) {
            var street1 = oParentObject.querySelector('[name="street[1]"]');
            sCurrentStreetValue = postcodecheckout_removeAdditionFromStreet(street1 ? street1.value : '');
            sAddition = (sNewAdditionValue) ? ' ' + sNewAdditionValue : '';
            sNewStreetvalue = sCurrentStreetValue + sAddition;
            if (street1) {
                street1.value = sNewStreetvalue;
                street1.dispatchEvent(new Event('keyup'));
            }
        } else {
            if (street0) {
                street0.value = sNewStreetvalue;
                street0.dispatchEvent(new Event('keyup'));
            }
        }
        sOldAddition = sNewAdditionValue;
    }

    function postcodecheckout_removeAdditionFromStreet(sCurrentFieldValue) {
        if (sOldAddition !== null && sOldAddition && sCurrentFieldValue) {
            var aParts = ("" + sCurrentFieldValue).split(" ");
            if (aParts.length > 1) aParts.pop();
            sCurrentFieldValue = aParts.join(" ");
            return sCurrentFieldValue;
        }
        return sCurrentFieldValue;
    }

    function getSettings() {
        var settings = window.pcm2_config;
        return settings;
    }

    function postcodecheckout_hideFields(oElement) {
        var oParentObject = postcodecheckout_getParentElement(oElement);
        if (oParentObject) {
            var pcPostcode = oParentObject.querySelector('[name="pc_postcode_postcode"]');
            var pcHousenumber = oParentObject.querySelector('[name="pc_postcode_housenumber"]');
            if (pcPostcode) pcPostcode.required = false;
            if (pcHousenumber) pcHousenumber.required = false;

            var pcPostcodeDiv = oParentObject.querySelector('.pc_postcode');
            var pcPostcodeAdditionDiv = oParentObject.querySelector('.pc_postcode_addition');
            if (pcPostcodeDiv) pcPostcodeDiv.style.display = 'none';
            if (pcPostcodeAdditionDiv) pcPostcodeAdditionDiv.style.display = 'none';

            var oDisableElement = oParentObject.querySelector('input[name="pc_postcode_disable"]');
            postcodecheckout_checkDisable(oDisableElement);
        }
    }

    function postcodecheckout_showFields(oElement) {
        var oParentObject = postcodecheckout_getParentElement(oElement);
        if (oParentObject) {
            var pcPostcodeDiv = oParentObject.querySelector('.pc_postcode');
            var pcPostcodeDisableDiv = oParentObject.querySelector('.pc_postcode_disable');
            if (pcPostcodeDiv) pcPostcodeDiv.style.display = '';
            if (pcPostcodeDisableDiv) pcPostcodeDisableDiv.style.display = '';

            var pcPostcode = oParentObject.querySelector('[name="pc_postcode_postcode"]');
            var pcHousenumber = oParentObject.querySelector('[name="pc_postcode_housenumber"]');
            if (pcPostcode) pcPostcode.required = true;
            if (pcHousenumber) pcHousenumber.required = true;

            var oDisableElement = oParentObject.querySelector('input[name="pc_postcode_disable"]');
            postcodecheckout_checkDisable(oDisableElement);

            setField(oParentObject, '[name="street[0]"]', '');
            setField(oParentObject, '[name="street[1]"]', '');
            setField(oParentObject, '[name="street[2]"]', '');
            setField(oParentObject, '[name="postcode"]', '');
            setField(oParentObject, '[name="region"]', '');
            setField(oParentObject, '[name="city"]', '');
        }
    }

    function postcodecheckout_returnCountry(oElement) {
        var aCountries = ['NL'];
        var oParentObject = postcodecheckout_getParentElement(oElement);
        var oSelect = oParentObject.querySelector('select[name="country_id"]');
        var sCountryCode = oSelect ? oSelect.value : '';
        if (aCountries.indexOf(sCountryCode) > -1) {
            return sCountryCode;
        } else {
            return false;
        }
    }

    function postcodecheckout_toggleCountry(oElement) {
        var bValidCountry = postcodecheckout_returnCountry(oElement);
        if (bValidCountry) {
            postcodecheckout_showFields(oElement);
        } else {
            postcodecheckout_hideFields(oElement);
        }
    }

    function postcodecheckout_convertIso2ToIso3(sIso2) {
        var aIsoCountries = { /* ... same as before ... */ };
        return aIsoCountries[sIso2];
    }

    // You can call postcodecheckout_initShipping() and postcodecheckout_initBilling() as needed
});
