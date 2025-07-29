define([
    'jquery',
    'postcodenl-autocomplete'
], function ($, autocomplete) {
	console.log('Postcode Checkout JS Loaded');

	var iTimeout = 10; // Tries
	var iShippingTimeout = 0;
	var iBillingTimeout = 0;
	var postcodecheckout_Autocomplete = []; 

	jQuery(document).ready(function () {
		if (jQuery('#checkout').length) {

			postcodecheckout_initShipping();
		}
	});

	function postcodecheckout_initShipping(bReset) {
		if (bReset) {
			iShippingTimeout = 0;
		}

		if (jQuery('#checkout-step-shipping').length) {
			// Shipment block available
			console.log('Shipment block available');
			postcodecheckout_initFunctions(jQuery('#checkout-step-shipping'));

			var oContinueButton = jQuery('.button.action.continue.primary');

			if (jQuery(oContinueButton).length) {
				console.log('LINE 40');

				console.log('Add init to the Submit Button.');
				jQuery(oContinueButton).on('click', function () { postcodecheckout_initBilling(true); });
			}
			else {
				var oShipmentAsBilling = jQuery('.checkout-billing-address');

				if (jQuery(oShipmentAsBilling).length) {
					jQuery(oShipmentAsBilling).attr('id', 'checkout-billing-address');

					console.log('Add init to the Shipping as Billing Button.');
					postcodecheckout_initFunctions(oShipmentAsBilling);
				}
			}
		}
		else {
			// Shipment block not available
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

		if (jQuery('#checkout-step-payment').length && (jQuery('.no-payments-block').length < 1)) {
			console.log('LINE 75');

			// Payments block available
			console.log('Payments block available');
			postcodecheckout_initFunctions(jQuery('#checkout-step-payment'));
		}
		else {
			// Payments block not available
			iBillingTimeout++;

			if (iBillingTimeout < iTimeout) {
				console.log('Payments block not available (Tries: ' + iBillingTimeout + ')');
				setTimeout(function () { postcodecheckout_initBilling(); }, 2000);
			}
		}
	}

	/** Functions **/

	function postcodecheckout_initFunctions(oElement) {
		var sId = jQuery(oElement).attr('id');

		var aElements = [];
		var iIndex = 0;
		jQuery('#' + sId + ' .pcpostcode_autocomplete_input input').each(function () { aElements[iIndex] = jQuery(this).attr('id'); iIndex++; });

		if (jQuery(aElements).length) {
			jQuery(aElements).each(function () { postcodecheckout_createInteractiveFunctions(this); })
		}
		else {
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
		// Add Postcode AutoComplete
		var oAutoComplete = document.querySelector('#' + sId);

		if (jQuery(oAutoComplete).length) {
			console.log('oAutoComplete(' + sId + ') *initiated*');

			postcodecheckout_Autocomplete[sId] = new PostcodeNl.AutocompleteAddress(oAutoComplete, {
				autocompleteUrl: '/postcodecheckout/proxy/suggestions?type=autocomplete',
                addressDetailsUrl: '/postcodecheckout/proxy/details?type=address',
			});

			oAutoComplete.addEventListener('autocomplete-select', function (event) { postcodecheckout_fillInFields(postcodecheckout_Autocomplete[sId], jQuery('#' + sId), event); });
		}
	}

	function postcodecheckout_addCountryFunctions(sId) {
		console.log('postcodecheckout_addCountryFunctions(' + sId + ')');
		var oParentObject = postcodecheckout_getParentElement(jQuery('#' + sId));
		var oSelectElement = jQuery(oParentObject).find('select[name="country_id"]');

		jQuery(oSelectElement).on('change', function () { postcodecheckout_toggleCountry(this); });
		postcodecheckout_toggleCountry(oSelectElement);
	}

	function postcodecheckout_addDisableManualFunctions(sId) {
		console.log('postcodecheckout_addDisableManualFunctions(' + sId + ')');
		var oParentObject = postcodecheckout_getParentElement(jQuery('#' + sId));
		var oDisableElement = jQuery(oParentObject).find('input[name="pcpostcode_autocomplete_disable"]');

		jQuery(oDisableElement).on('change', function () { postcodecheckout_checkDisable(this); });
		postcodecheckout_checkDisable(oDisableElement);
	}

	function postcodecheckout_checkDisable(oElement) {
		var sDisabled = jQuery(oElement).prop('checked');

		if (postcodecheckout_returnCountry(oElement)) {
			console.log('postcodecheckout_checkDisable(Country says show.)');

			if (sDisabled === true) {
				console.log('postcodecheckout_checkDisable(not checked)');
				postcodecheckout_enableFields(oElement);
			}
			else {
				console.log('postcodecheckout_checkDisable(checked)');
				postcodecheckout_disableFields(oElement);
			}
		}
		else {
			console.log('postcodecheckout_checkDisable(Fields need to be enabled)');
			postcodecheckout_enableFields(oElement);
		}
	}

	function postcodecheckout_disableFields(oElement) {
		console.log('postcodecheckout_disableFields()');
		var oParentObject = postcodecheckout_getParentElement(oElement);

		jQuery(oParentObject).find('[name="street[0]"]').prop('readonly', true);
		jQuery(oParentObject).find('[name="street[1]"]').prop('readonly', true);
		jQuery(oParentObject).find('[name="street[2]"]').prop('readonly', true);
		jQuery(oParentObject).find('[name="city"]').prop('readonly', true);
		jQuery(oParentObject).find('[name="postcode"]').prop('readonly', true);
	}

	function postcodecheckout_enableFields(oElement) {
		console.log('postcodecheckout_enableFields()');
		var oParentObject = postcodecheckout_getParentElement(oElement);

		jQuery(oParentObject).find('[name="street[0]"]').removeAttr('readonly');
		jQuery(oParentObject).find('[name="street[1]"]').removeAttr('readonly');
		jQuery(oParentObject).find('[name="street[2]"]').removeAttr('readonly');
		jQuery(oParentObject).find('[name="city"]').removeAttr('readonly');
		jQuery(oParentObject).find('[name="postcode"]').removeAttr('readonly');
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

					if (sStreet) {
						var sAddress = sStreet;

						if (sHouseNumber) {
							if (aSettings.useStreet2AsHouseNumber) {
								var sHouseNumber2 = sHouseNumber;

								if (!aSettings.useStreet3AsHouseNumberAddition && sHouseNumberAddition) {
									sHouseNumber2 += ' ' + sHouseNumberAddition;
								}
							}
							else {
								sAddress += ' ' + sHouseNumber;
							}

							if (sHouseNumberAddition && !aSettings.useStreet3AsHouseNumberAddition && !aSettings.useStreet2AsHouseNumber) {
								sAddress += ' ' + sHouseNumberAddition;
							}
						}
					}

					if (sAddress) {
						jQuery(oParentObject).find('[name="street[0]"]').val(sAddress).trigger('keyup');
					}

					if (sHouseNumber2 && aSettings.useStreet2AsHouseNumber) {
						jQuery(oParentObject).find('[name="street[1]"]').val(sHouseNumber2).trigger('keyup');
					}

					if (sHouseNumberAddition && aSettings.useStreet3AsHouseNumberAddition) {
						jQuery(oParentObject).find('[name="street[2]"]').val(sHouseNumberAddition).trigger('keyup');
					}
					else {
						jQuery(oParentObject).find('[name="street[2]"]').val('').trigger('keyup');
					}

					if (sPostcode) {
						jQuery(oParentObject).find('[name="postcode"]').val(sPostcode).trigger('keyup');
					}

					if (sCity) {
						jQuery(oParentObject).find('[name="city"]').val(sCity).trigger('keyup');
					}
				else {
					console.log('Process seems to have failed, object given:');
					console.log(oResult);
				}
			});
		}
	}

	function getSettings() {
		var settings = window.checkoutConfig.pcpostcode_autocomplete.settings;
		return settings;
	}

	function postcodecheckout_getParentElement(oElement) {
		// #co-shipping-form
		var oParentElementShipping = jQuery(oElement).closest('#co-shipping-form');

		// .payment-method
		var oParentElementBilling = jQuery(oElement).closest('.payment-method');

		// .checkout-billing-address
		var oParentShippingAsBilling = jQuery(oElement).closest('#checkout-billing-address');

		if (jQuery(oParentElementShipping).length) {
			return jQuery(oParentElementShipping);
		}
		else if (jQuery(oParentElementBilling).length) {
			return jQuery(oParentElementBilling);
		}
		else if (jQuery(oParentShippingAsBilling).length) {
			return jQuery(oParentShippingAsBilling);
		}
		else {
			console.log('No PARENT was found found.');
			return false;
		}
	}

	function postcodecheckout_hideFields(oElement) {
		console.log('postcodecheckout_hideFields()');

		var oParentObject = postcodecheckout_getParentElement(oElement);

		if (oParentObject) {
			jQuery(oParentObject).find('.pcpostcode_autocomplete_input').hide();
			jQuery(oParentObject).find('.pcpostcode_autocomplete_disable').hide();

			var oDisableElement = jQuery(oParentObject).find('input[name="pcpostcode_autocomplete_disable"]');
			postcodecheckout_checkDisable(oDisableElement);
		}
	}

	function postcodecheckout_showFields(oElement) {
		console.log('postcodecheckout_showFields()');

		var oParentObject = postcodecheckout_getParentElement(oElement);

		if (oParentObject) {
			jQuery(oParentObject).find('.pcpostcode_autocomplete_input').show();
			jQuery(oParentObject).find('.pcpostcode_autocomplete_disable').show();

			var oDisableElement = jQuery(oParentObject).find('input[name="pcpostcode_autocomplete_disable"]');
			postcodecheckout_checkDisable(oDisableElement);

			jQuery(oParentObject).find('[name="street[0]"]').val('').trigger('keyup');
			jQuery(oParentObject).find('[name="street[1]"]').val('').trigger('keyup');
			jQuery(oParentObject).find('[name="street[2]"]').val('').trigger('keyup');
			jQuery(oParentObject).find('[name="postcode"]').val('').trigger('keyup');
			jQuery(oParentObject).find('[name="city"]').val('').trigger('keyup');

			var sId = jQuery(oParentObject).find('.pcpostcode_autocomplete_input input').attr('id');

			var sCountryCodeIso3 = postcodecheckout_convertIso2ToIso3(postcodecheckout_returnCountry(oElement));

			console.log(sCountryCodeIso3);

			postcodecheckout_Autocomplete[sId].setCountry(sCountryCodeIso3);
		}
	}

	function postcodecheckout_returnCountry(oElement) {
		var aCountries = magento2_countries;
		var oParentObject = postcodecheckout_getParentElement(oElement);
		var sCountryCode = jQuery(oParentObject).find('select[name="country_id"]').val();

		if (jQuery.inArray(sCountryCode, aCountries) > -1) {
			return sCountryCode;
		}
		else {
			return false;
		}
	}

	function postcodecheckout_toggleCountry(oElement) {
		var bValidCountry = postcodecheckout_returnCountry(oElement);

		if (bValidCountry) {
			console.log('Country Supported');
			postcodecheckout_showFields(oElement);
		}
		else {
			console.log('Country Not Supported');
			postcodecheckout_hideFields(oElement);
		}
	}

	function postcodecheckout_convertIso2ToIso3(sIso2Code){

		return pc4woo_SupportedCountries.find(country => country.iso2 === sIso2Code).iso3;
}


	function postcodecheckout_isSupportedCountry(sSection) {
		let sCountryCode = postcodecheckout_getCountryCode(sSection);

		if (pc4woo_SupportedCountries.find(country => country.iso2 === sCountryCode)) {
			return true;
		}

		return false;
	}
});