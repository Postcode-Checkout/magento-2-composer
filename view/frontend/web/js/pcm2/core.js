(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([
            'Codebrainbv_PostcodeCheckout/js/vendor/autocompleteaddress',
            'Codebrainbv_PostcodeCheckout/js/vendor/pro6pp'
        ], factory);
    } else {
        root.PCM2Core = factory(
            root.PostcodeNl && root.PostcodeNl.AutocompleteAddress,
            root.Pro6PP
        );
    }
}(this, function (AutocompleteAddress, Pro6PP) {
    'use strict';
    var fields, elements, validationFields, countryCode;
    var initializedForms = [];
    var autocompleteInstances = {};
    var placementHousenumberAdditions;
    var _pcm2AutocompleteRand = null;

    // Coalesces identical, overlapping API requests into a single XHR. If more than
    // one PostcodeNl widget gets bound to the same field (e.g. on re-init), or the
    // vendor triggers the same suggest/details lookup twice, both would otherwise
    // fire a separate request; with PHP session locking the second one stalls behind
    // the first. Keying by URL guarantees only one network call is ever in flight.
    var pcm2InFlightRequests = {};

    function pcm2XhrGetDeduped(instance, url, response) {
        var existing = pcm2InFlightRequests[url];
        if (existing) {
            existing.callbacks.push(response);
            return existing.xhr;
        }

        var entry = { xhr: null, callbacks: [response] };
        pcm2InFlightRequests[url] = entry;

        entry.xhr = instance.xhrGet(url, function (result) {
            delete pcm2InFlightRequests[url];
            entry.callbacks.forEach(function (cb) {
                if (typeof cb === 'function') { cb(result); }
            });
        });

        return entry.xhr;
    }

    function pcm2_getAutocompleteRand() {
        if (!_pcm2AutocompleteRand) {
            var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            _pcm2AutocompleteRand = Array.from({length: 10}, function () {
                return chars[Math.floor(Math.random() * chars.length)];
            }).join('');
        }
        return _pcm2AutocompleteRand;
    }

    function pcm2_injectHidingCSS() {
        if (document.getElementById('pcm2-hide-fields-css')) { return; }
        var style = document.createElement('style');
        style.id = 'pcm2-hide-fields-css';
        style.textContent = '.pcm2-hide-fields .field-street,.pcm2-hide-fields .field-postcode,.pcm2-hide-fields .field-city,.pcm2-hide-fields .field.street,.pcm2-hide-fields .field.zip,.pcm2-hide-fields .field.city{display:none!important;}';
        document.head.appendChild(style);
    }

    function pcm2_applyAutocompleteOff(formContext, fieldMap) {
        if (String((window.pcm2_config || {}).autocomplete_off) !== '1') { return; }
        var rand = pcm2_getAutocompleteRand();
        if (fieldMap) {
            ['address_1', 'address_2', 'address_3', 'postcode', 'city', 'region'].forEach(function (k) {
                if (fieldMap[k]) { fieldMap[k].setAttribute('autocomplete', rand); }
            });
        }
    }

    function log() {
        if (window.pcm2_config && window.pcm2_config.debug_mode == 1 && window.console) {
            console.log('[PCM2]', ...arguments);
        }
    }

    function getProvider() {
        var provider = (window.pcm2_config && window.pcm2_config.provider || '').toLowerCase();
        log('Provider:', provider);
        return provider;
    }

    function encodeTerm(term) {
        var encoded = new TextEncoder().encode(term);
        var binary = Array.from(encoded, (byte) => String.fromCharCode(byte)).join('');
        return window.btoa(binary);
    }

    function pcm2_addLookup() {
        log('pcm2_addLookup: start');
        pcm2_bindManualAutoButtons();
        var countryFields = document.querySelectorAll('select[name="country_id"]');
        log('Found country fields:', countryFields.length, countryFields);
        if (countryFields.length === 0) {
            log('No country fields found');
            return;
        }
        countryFields.forEach(function (countryField, index) {
            var formId = pcm2_getFormIdentifier(countryField);
            log('Processing country field', index, 'formId:', formId, 'value:', countryField.value);
            if (initializedForms.indexOf(formId) !== -1) {
                log('Form already initialized:', formId);
                return;
            }
            var countryCode = countryField.value;
            if (countryField.pcm2ChangeHandler) {
                countryField.removeEventListener('change', countryField.pcm2ChangeHandler);
            }
            countryField.pcm2ChangeHandler = function (event) {
                var newCountryCode = event.target.value;
                log('Country changed to:', newCountryCode, 'in form:', formId);
                countryCode = newCountryCode;

                if (pcm2_isSupportedCountry(countryCode)) {
                    log('Country is supported, adding postcode lookup');
                    pcm2_hideForm(event.target);
                    pcm2_initLookup(event.target);
                } else {
                    log('Country is not supported, showing default fields');
                    pcm2_clearAllAddressFields(event.target);
                    pcm2_showForm(event.target, true);
                }
            };
            countryField.addEventListener('change', countryField.pcm2ChangeHandler);
            if (pcm2_isSupportedCountry(countryCode)) {
                log('Country is supported, adding postcode lookup for:', formId);
                pcm2_hideForm(countryField);
                pcm2_initLookup(countryField);
            } else {
                log('Country is not supported, showing default fields for:', formId);
                pcm2_showForm(countryField, true);
            }
            initializedForms.push(formId);
        });
    }

    var _pcm2ManualAutoBound = false;
    function pcm2_bindManualAutoButtons() {
        if (_pcm2ManualAutoBound) { return; }
        _pcm2ManualAutoBound = true;
        document.addEventListener('click', function (event) {
            if (event.target && event.target.id.startsWith('pcm2_autocomplete_manualbtn')) {
                var suffix = event.target.id.replace('pcm2_autocomplete_manualbtn', '');
                var relatedCountryField = pcm2_findCountryFieldBySuffix(suffix);
                log('Manual button clicked, showing default fields for', suffix);
                pcm2_showForm(relatedCountryField, true);
            }
            if (event.target && event.target.id.startsWith('pcm2_autocomplete_autobtn')) {
                var suffix = event.target.id.replace('pcm2_autocomplete_autobtn', '');
                var relatedCountryField = pcm2_findCountryFieldBySuffix(suffix);
                log('Auto button clicked, showing lookup for', suffix);
                pcm2_hideForm(relatedCountryField, false);
                pcm2_initLookup(relatedCountryField);
            }
        });
    }

    function pcm2_initLookup(contextCountryField) {
        log('pcm2_initLookup: start', contextCountryField);
        if (!contextCountryField) { log('No country field provided'); return; }
        var countryCode = contextCountryField.value;
        var iso3Code = pcm2_convertIso2ToIso3(countryCode);
        var formId = pcm2_getFormIdentifier(contextCountryField);
        var suffix = formId !== 'default' ? '_' + formId.replace(/[^a-zA-Z0-9]/g, '') : '';
        var searchField = document.getElementById('pcm2_autocomplete_search' + suffix);
        log('Lookup context:', { countryCode, iso3Code, formId, suffix, searchField });
        if (!searchField) { log('No search field found for', suffix); return; }

        var provider = getProvider();
        log('Widget provider:', provider, 'searchField:', searchField);

        var tryAttach = function() {
            // The vendor libraries are plain (esbuild IIFE / global) scripts loaded via
            // separate <script> tags. Depending on whether RequireJS is present on the
            // page, the factory params can be undefined (AMD resolves a non-AMD module
            // to undefined) or were bound before the global finished loading. Always
            // fall back to the live globals so this retry loop can pick the library up
            // once it is ready, instead of re-checking a stale closure reference.
            var Pro6PPLib = Pro6PP || (typeof window !== 'undefined' && window.Pro6PP) || null;
            var AutocompleteLib = AutocompleteAddress ||
                (window.PostcodeNl && window.PostcodeNl.AutocompleteAddress) || null;

            if (provider === 'pro6ppext') {
                if (Pro6PPLib && typeof Pro6PPLib.attach === 'function') {
                    log('Initializing Pro6PP widget...');
                    var autocompleteUrl = pcm2_config.api_urls.pro6pp_autocomplete;
                    if (!autocompleteUrl) {
                        log('[Pro6PP] pro6pp_autocomplete URL niet geconfigureerd');
                        return false;
                    }
                    function pro6ppFetcher(url, options) {
                        return fetch(url, options).then(function (response) {
                            return {
                                ok: response.ok,
                                status: response.status,
                                json: function () {
                                    return response.json().then(function (data) {
                                        log('[Pro6PP] raw proxy response:', data);
                                        // Magento may wrap the response; normalise to { stage, suggestions }
                                        if (Array.isArray(data)) {
                                            if (data.length >= 2 && data[0] === 'final') {
                                                return { stage: 'final', suggestions: Array.isArray(data[1]) ? data[1] : [] };
                                            }
                                            return { stage: 'final', suggestions: data };
                                        }
                                        if (data && Array.isArray(data.suggestions)) {
                                            return data;
                                        }
                                        return { stage: 'final', suggestions: [] };
                                    });
                                }
                            };
                        });
                    }
                    log('Attaching Pro6PP widget:', { searchField, countryCode, autocompleteUrl });
                    var widget = Pro6PPLib.attach(searchField, {
                        country: countryCode,
                        apiUrl: autocompleteUrl,
                        limit: 20,
                        fetcher: pro6ppFetcher,
                        onSelect: function (result) {
                            log('[Pro6PP] onSelect:', result);
                            if (!result) return;
                            pcm2_fillAddressFields(result, contextCountryField);
                        }
                    });
                    searchField._pcm2_pro6pp = widget;
                    autocompleteInstances[formId] = widget;
                    return true;
                }
            } else if (AutocompleteLib) {
                // Reuse the widget already bound to this input instead of creating a
                // second one. The vendor destroy() bails out early when its menu is no
                // longer in the DOM (e.g. after a magewire re-render), leaving the old
                // keydown/input listeners attached - so recreating would stack widgets
                // and fire the suggest request multiple times (each debounced widget
                // captures the value at a slightly different moment, hence several calls
                // with different terms). The instance is stored on the element itself, so
                // a genuinely replaced input has no instance and falls through to a fresh
                // attach; a persisting (wire:ignore) input keeps its single widget.
                if (searchField._pcm2_acInstance) {
                    log('Reusing existing PostcodeNL widget, updating context to', iso3Code);
                    if (typeof searchField._pcm2_acInstance.setCountry === 'function') {
                        searchField._pcm2_acInstance.setCountry(iso3Code);
                    }
                    autocompleteInstances[formId] = searchField._pcm2_acInstance;
                    return true;
                }

                log('Initializing PostcodeNL AutocompleteAddress widget...');

                var autocomplete = new AutocompleteLib(searchField, {
                    autocompleteUrl: pcm2_config.api_urls.postcodenlext_suggest || pcm2_config.api_urls.international_suggest,
                    addressDetailsUrl: pcm2_config.api_urls.postcodenlext_details || pcm2_config.api_urls.international_details,
                    autoFocus: true,
                    autoSelectSingleAddress: true,
                    showLogo: false,
                    context: iso3Code
                });
                autocomplete.getSuggestions = function (context, term, response) {
                    var encodedTerm = encodeTerm(term);
                    var url = this.options.autocompleteUrl.replace('${context}', encodeURIComponent(context)).replace('${term}', encodeURIComponent(encodedTerm));
                    return pcm2XhrGetDeduped(this, url, response);
                };
                autocomplete.getDetails = function (addressId, response) {
                    var url = this.options.addressDetailsUrl.replace('${context}', encodeURIComponent(addressId));
                    return pcm2XhrGetDeduped(this, url, response);
                };
                searchField._pcm2_acInstance = autocomplete;
                autocompleteInstances[formId] = autocomplete;

                // The vendor appends its suggestion menu to <body>, outside the Hyvä
                // checkout overlay. Hyvä closes the overlay on any outside (click.away)
                // pointer event, so clicking a suggestion would dismiss the whole form.
                // Stop the menu's pointer events from bubbling to document so the
                // outside-click handler never fires. Selection still works because the
                // vendor's own listeners live on the same wrapper element.
                document.querySelectorAll('.postcodenl-autocomplete-menu:not([data-pcm2-overlay-guard])').forEach(function (menuEl) {
                    menuEl.setAttribute('data-pcm2-overlay-guard', '1');
                    ['mousedown', 'pointerdown', 'touchstart', 'click'].forEach(function (evt) {
                        menuEl.addEventListener(evt, function (e) { e.stopPropagation(); });
                    });
                });

                // Bind the select listener only once per field. It resolves the
                // currently active instance live, so re-inits never stack listeners.
                if (searchField.getAttribute('data-pcm2-select-bound') !== '1') {
                    searchField.setAttribute('data-pcm2-select-bound', '1');
                    searchField.addEventListener('autocomplete-select', function (event) {
                        searchField.value = event.detail.label;
                        if (event.detail.precision === 'Address') {
                            var activeInstance = autocompleteInstances[formId];
                            if (!activeInstance) { return; }
                            activeInstance.getDetails(event.detail.context, function (response) {
                                if (response) {
                                    var addressData = response.result;
                                    pcm2_fillAddressFields(addressData, contextCountryField);
                                } else {
                                    pcm2_updatePreview(true, contextCountryField);
                                }
                            });
                        }
                    });
                }
                return true;
            }
            return false;
        };

        if (!tryAttach()) {
            var attachAttempts = 0;
            var attachInterval = setInterval(function() {
                
                log('Retrying widget attach, attempt', attachAttempts + 1);

                attachAttempts++;
                if (tryAttach() || attachAttempts > 20) {
                    clearInterval(attachInterval);
                }
            }, 100);
        }
    }

    function pcm2_hideForm(contextCountryField, defaultForm = false) {
        if (typeof contextCountryField === 'boolean') {
            defaultForm = contextCountryField;
            contextCountryField = document.querySelector('select[name="country_id"]');
        }
        fields = pcm2_getFields(contextCountryField);
        elements = pcm2_getElements(contextCountryField);
        var formId = pcm2_getFormIdentifier(contextCountryField);
        var suffix = formId !== 'default' ? '_' + formId.replace(/[^a-zA-Z0-9]/g, '') : '';
        validationFields = pcm2_getValidationFields(contextCountryField);
        if (!validationFields.searchWrapper) {
            var _isHyvaCtx = typeof window.Alpine !== 'undefined';
            var _ac = String((window.pcm2_config || {}).autocomplete_off) === '1' ? pcm2_getAutocompleteRand() : 'off';
            var html;
            if (_isHyvaCtx) {
                html =
                    '<div class="col-span-12 field-wrapper field-type-text field field-reserved" wire:ignore id="pcm2_container' + suffix + '">' +
                    '<div class="field col-span-12 field-reserved" id="pcm2_autocomplete_search_wrapper' + suffix + '" wire:ignore>' +
                    '  <label class="label" for="pcm2_autocomplete_search' + suffix + '"><span>' + pcm2_translations.search + '</span></label>' +
                    '  <div class="control">' +
                    '    <input wire:ignore id="pcm2_autocomplete_search' + suffix + '" name="pcm2_autocomplete_search' + suffix + '" type="text" class="w-full input-text" placeholder="' + pcm2_translations.placeholder_search + '" autocomplete="' + _ac + '" />' +
                    '  </div>' +
                    '</div>' +
                    '<div wire:ignore class="field col-span-12 field-reserved" id="pcm2_autocomplete_result_wrapper' + suffix + '" style="display: none;">' +
                    '  <label class="label"><span></span></label>' +
                    '  <div class="control" id="pcm2_autocomplete_result' + suffix + '"></div>' +
                    '</div>' +
                    '<div wire:ignore class="field col-span-12 field-reserved">' +
                    '<div wire:ignore class="control pcm2-autocomplete-btn-group">' +
                    '  <button wire:ignore type="button" class="action secondary btn btn-secondary" id="pcm2_autocomplete_manualbtn' + suffix + '"> ' + pcm2_translations.manual + ' </button> ' +
                    '  <button wire:ignore type="button" class="action secondary btn btn-secondary" id="pcm2_autocomplete_autobtn' + suffix + '" style="display:none;"> ' + pcm2_translations.automatic + ' </button>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            } else {
                html =
                    '<div class="lumaPostcode field" id="pcm2_container' + suffix + '">' +
                    '<div class="lumaPostcode" id="pcm2_autocomplete_search_wrapper' + suffix + '">' +
                    '  <label class="label" for="pcm2_autocomplete_search' + suffix + '"><span>' + pcm2_translations.search + '</span></label>' +
                    '  <div class="control lumaPostcode">' +
                    '    <input id="pcm2_autocomplete_search' + suffix + '" name="pcm2_autocomplete_search' + suffix + '" type="text" class="input-text" placeholder="' + pcm2_translations.placeholder_search + '" autocomplete="' + _ac + '" />' +
                    '  </div>' +
                    '</div>' +
                    '<div class="field" id="pcm2_autocomplete_result_wrapper' + suffix + '" style="display: none;">' +
                    '  <div class="control" id="pcm2_autocomplete_result' + suffix + '"></div>' +
                    '</div>' +
                    '<div class="lumaPostcode">' +
                    '  <div class="control pcm2-autocomplete-btn-group">' +
                    '    <button type="button" class="action secondary" id="pcm2_autocomplete_manualbtn' + suffix + '"> ' + pcm2_translations.manual + ' </button> ' +
                    '    <button type="button" class="action secondary" id="pcm2_autocomplete_autobtn' + suffix + '" style="display:none;"> ' + pcm2_translations.automatic + ' </button>' +
                    '  </div>' +
                    '</div>' +
                    '</div>';
            }

            var countrySwitchDiv = null;
            
            if (fields.country) {
                countrySwitchDiv = fields.country.closest('.field-country_id');
            }

            log('pcm2_hideForm: inserting lookup HTML for', suffix, 'after country switch div:', countrySwitchDiv);


            if (!pcm2_isCheckoutContext(contextCountryField)) {

                log('pcm2_hideForm: not in checkout context, inserting lookup HTML for', suffix);

                var formCtx = contextCountryField ? (contextCountryField.closest('form') || document) : document;
                var streetInner = formCtx.querySelector('div.street');
                var streetFieldEl = streetInner ? streetInner.parentElement : formCtx.querySelector('.field.street');
                if (countrySwitchDiv) {
                    log('pcm2_hideForm: inserting lookup HTML after country switch div for', suffix);
                    countrySwitchDiv.insertAdjacentHTML('afterend', html);
                } else if (fields.country && fields.country.parentElement) {
                    log('pcm2_hideForm: inserting lookup HTML after country field for', suffix);
                    var countryFieldDiv = fields.country.closest('div.field') || fields.country.parentElement;
                    countryFieldDiv.insertAdjacentHTML('afterend', html);
                } else if (streetFieldEl) {
                    log('pcm2_hideForm: inserting lookup HTML after street field for', suffix);
                    streetFieldEl.insertAdjacentHTML('afterend', html);
                } else  {
                    log('pcm2_hideForm: inserting lookup HTML before country field for', suffix);
                    elements.country.insertAdjacentHTML('beforebegin', html);
                }
            } else if (countrySwitchDiv) {
                countrySwitchDiv.insertAdjacentHTML('afterend', html);
            } else if (fields.country && fields.country.parentElement) {
                var countryFieldDiv = fields.country.closest('div.field') || fields.country.parentElement;
                countryFieldDiv.insertAdjacentHTML('afterend', html);
            } else {
                elements.country.insertAdjacentHTML('beforebegin', html);
            }
            validationFields = pcm2_getValidationFields(contextCountryField);
        }
        if (validationFields.searchWrapper) validationFields.searchWrapper.style.display = 'block';
        if (validationFields.resultWrapper) validationFields.resultWrapper.style.display = 'block';
        if (validationFields.manualBtn) validationFields.manualBtn.style.display = 'inline-block';
        if (validationFields.autoBtn) validationFields.autoBtn.style.display = 'none';

        var hideFields = (window.pcm2_config && (window.pcm2_config.hide_default_address_fields == 1 || window.pcm2_config.hide_default_address_fields === '1'));
        var formContext = contextCountryField ? (contextCountryField.closest('form') || document) : document;
        if (hideFields) {
            if (typeof window.Alpine !== 'undefined') {
                pcm2_injectHidingCSS();
                formContext.classList.add('pcm2-hide-fields');
                ['.field-street', '.field-postcode', '.field-city', '.field.street', '.field.zip', '.field.city'].forEach(function (sel) {
                    formContext.querySelectorAll(sel).forEach(function (node) {
                        node.querySelectorAll('input, select, textarea').forEach(function (inp) {
                            if (inp.hasAttribute('required')) {
                                inp.setAttribute('data-pcm2-required', '1');
                                inp.removeAttribute('required');
                            }
                            if (inp.hasAttribute('data-validate')) {
                                inp.setAttribute('data-pcm2-validate', inp.getAttribute('data-validate'));
                                inp.removeAttribute('data-validate');
                            }
                        });
                    });
                });

                var _hideFields = pcm2_getFields(contextCountryField);
                ['address_1', 'address_2', 'address_3'].forEach(function (key) {
                    var line = _hideFields[key];
                    if (!line) return;
                    var streetContainer = line.closest('.street');
                    if (streetContainer) { streetContainer.style.display = 'none'; }
                });
            } else {
                var _hideEls = pcm2_getElements(contextCountryField);
                [_hideEls.address_1, _hideEls.postcode, _hideEls.city].forEach(function (wrapper) {
                    if (!wrapper) return;
                    wrapper.style.display = 'none';
                    wrapper.querySelectorAll('input, select, textarea').forEach(function (inp) {
                        if (inp.hasAttribute('required')) {
                            inp.setAttribute('data-pcm2-required', '1');
                            inp.removeAttribute('required');
                        }
                        if (inp.hasAttribute('data-validate')) {
                            inp.setAttribute('data-pcm2-validate', inp.getAttribute('data-validate'));
                            inp.removeAttribute('data-validate');
                        }
                    });
                });
            }
        }
        pcm2_applyAutocompleteOff(formContext, pcm2_getFields(contextCountryField));
        if (!autocompleteInstances[formId]) {
            pcm2_initLookup(contextCountryField);
        }
    }

    function pcm2_clearAllAddressFields(contextCountryField) {
        const suffix = pcm2_getSuffix(contextCountryField);
        const fields = pcm2_getFields(contextCountryField);
        const _isHyva = typeof window.Alpine !== 'undefined';
        const clearField = (addressfield) => {
            if (!addressfield) return;
            if (addressfield.value === '') return;
            addressfield.value = '';
            if (_isHyva && addressfield._x_model && typeof addressfield._x_model.set === 'function') {
                addressfield._x_model.set('');
                return;
            }
            addressfield.dispatchEvent(new Event('input', { bubbles: true }));
            if (!_isHyva) { addressfield.dispatchEvent(new Event('change', { bubbles: true })); }
        };
        const searchField = document.getElementById(`pcm2_autocomplete_search${suffix}`);
        if (searchField && searchField.value !== '') {
            searchField.value = '';
            searchField.dispatchEvent(new Event('input', { bubbles: true }));
        }

        const resultWrapper = document.getElementById(`pcm2_autocomplete_result_wrapper${suffix}`);
        if (resultWrapper) resultWrapper.style.display = 'none';
        const resultElement = document.getElementById(`pcm2_autocomplete_result${suffix}`);
        if (resultElement) resultElement.innerHTML = '';

        if (window.pcm2_config && (window.pcm2_config.empty_default_address_fields == 1)) {
            const keysToClear = ['address_1', 'address_2', 'address_3', 'postcode', 'city', 'region'];
            for (const key of keysToClear) {
                const addressfield = fields?.[key];
                if (addressfield) {
                    clearField(addressfield);
                }
            }
        }

        var _clearFCtx = contextCountryField ? (contextCountryField.closest('form') || document) : document;
        var _clearAddRow = _clearFCtx.querySelector('.pcm2-national-addition-row');
        if (_clearAddRow) { _clearAddRow.style.display = 'none'; var _clearIn = _clearAddRow.querySelector('.pcm2-national-addition-input'); if (_clearIn) _clearIn.value = ''; }
    }

    function pcm2_getSuffix(contextCountryField) {
        var formId = pcm2_getFormIdentifier(contextCountryField);
        return formId !== 'default' ? '_' + formId.replace(/[^a-zA-Z0-9]/g, '') : '';
    }

    function pcm2_fillAddressFields(result, contextCountryField) {
        fields = pcm2_getFields(contextCountryField);
        validationFields = pcm2_getValidationFields(contextCountryField);
            if (!result || Object.keys(result).length === 0) {
                pcm2_updatePreview(true, contextCountryField);
                var _fCtx = contextCountryField ? (contextCountryField.closest('form') || document) : document;
                var _addRow = _fCtx.querySelector('.pcm2-national-addition-row');
                if (_addRow) { _addRow.style.display = 'none'; var _addIn = _addRow.querySelector('.pcm2-national-addition-input'); if (_addIn) _addIn.value = ''; }
                return;
            }

            var houseNumber = result.housenumber || result.street_number || '';

            var placement = window.pcm2_config && parseInt(window.pcm2_config.housenumber_addition_address2, 10);
            if (placement === 0) {
                if (fields.address_1) fields.address_1.value = (result.street || '') + (houseNumber ? ' ' + houseNumber : '') + (result.addition ? ' ' + result.addition : '');
            } else if (placement === 1) {
                if (fields.address_1) fields.address_1.value = (result.street || '') + (houseNumber ? ' ' + houseNumber : '');
                if (fields.address_2) fields.address_2.value = (result.addition ? result.addition : '');
            } else if (placement === 2) {
                if (fields.address_1) fields.address_1.value = (result.street || '');
                if (fields.address_2) fields.address_2.value = (houseNumber ? houseNumber : '') + (result.addition ? ' ' + result.addition : '');
            } else if (placement === 3) {
                if (fields.address_1) fields.address_1.value = (result.street || '');
                if (fields.address_2) fields.address_2.value = (houseNumber ? houseNumber : '');
                if (fields.address_3) fields.address_3.value = (result.addition ? result.addition : '');
            }
            if (placement === 0) {
                if (fields.address_2) fields.address_2.value = '';
                if (fields.address_3) fields.address_3.value = '';
            } else if (placement === 1 || placement === 2) {
                if (fields.address_3) fields.address_3.value = '';
            }
            if (fields.postcode) fields.postcode.value = result.postcode || '';
            if (fields.city) fields.city.value = result.city || '';
            if (fields.region) {
                var regionValue = result.region || '';
                if (fields.region.tagName === 'SELECT') {
                    var opts = Array.prototype.slice.call(fields.region.options);
                    var matchedOpt = opts.find(function (o) {
                        return o.text.trim().toLowerCase() === regionValue.toLowerCase() ||
                               o.value === regionValue;
                    });
                    fields.region.value = matchedOpt ? matchedOpt.value : '';
                } else {
                    fields.region.value = regionValue;
                }
            }
            var _hyva = typeof window.Alpine !== 'undefined';
            ['address_1', 'address_2', 'address_3', 'postcode', 'city', 'region'].forEach(function (fieldName) {
                if (fields[fieldName]) {
                    var el = fields[fieldName];
                    if (el._x_model && typeof el._x_model.set === 'function') {
                        el._x_model.set(el.value);
                    } else {
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });

            if (!_hyva) {
                ['address_1', 'address_2', 'address_3', 'postcode', 'city', 'region'].forEach(function (fieldName) {
                    if (fields[fieldName] && fields[fieldName].value) {
                        fields[fieldName].dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            }
            pcm2_updatePreview(false, contextCountryField);

            var _formCtx = contextCountryField ? (contextCountryField.closest('form') || document) : document;
            var _additionRow = _formCtx.querySelector('.pcm2-national-addition-row');
            if (_additionRow) {
                var _additionInput = _additionRow.querySelector('.pcm2-national-addition-input');
                if (result.addition) {
                    if (_additionInput) _additionInput.value = result.addition;
                    _additionRow.style.display = '';
                } else {
                    if (_additionInput) _additionInput.value = '';
                    _additionRow.style.display = 'none';
                }
            }
    }

    function pcm2_updatePreview(errorMsg = false, contextCountryField) {
        fields = pcm2_getFields(contextCountryField);
        validationFields = pcm2_getValidationFields(contextCountryField);
        var suffix = pcm2_getSuffix(contextCountryField);
        var resultElement = document.getElementById('pcm2_autocomplete_result' + suffix);
        if (!resultElement) return;
        if (errorMsg) {
            resultElement.innerHTML = '<p style="color:red;">Address could not be found, please check or enter manually.</p>';
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
        html += '<br>' + fields.postcode.value + ' ' + fields.city.value + '</p>';
        resultElement.innerHTML = html;
        validationFields.resultWrapper.style.display = 'block';
    }

    function pcm2_showForm(contextCountryField, defaultForm = false) {
        if (typeof contextCountryField === 'boolean') {
            defaultForm = contextCountryField;
            contextCountryField = document.querySelector('select[name="country_id"]');
        }
        fields = pcm2_getFields(contextCountryField);
        elements = pcm2_getElements(contextCountryField);
        validationFields = pcm2_getValidationFields(contextCountryField);

        var hideFields = (window.pcm2_config && (window.pcm2_config.hide_default_address_fields == 1 || window.pcm2_config.hide_default_address_fields === '1'));
        if (hideFields) {
            if (typeof window.Alpine !== 'undefined') {
                var showFormContext = contextCountryField ? (contextCountryField.closest('form') || document) : document;
                showFormContext.classList.remove('pcm2-hide-fields');
                ['.field-street', '.field-postcode', '.field-city', '.field.street', '.field.zip', '.field.city'].forEach(function (sel) {
                    showFormContext.querySelectorAll(sel).forEach(function (node) {
                        node.querySelectorAll('input, select, textarea').forEach(function (inp) {
                            if (inp.getAttribute('data-pcm2-required') === '1') {
                                inp.setAttribute('required', '');
                                inp.removeAttribute('data-pcm2-required');
                            }
                            if (inp.hasAttribute('data-pcm2-validate')) {
                                inp.setAttribute('data-validate', inp.getAttribute('data-pcm2-validate'));
                                inp.removeAttribute('data-pcm2-validate');
                            }
                        });
                    });
                });
                var _showStreetFields = pcm2_getFields(contextCountryField);
                ['address_1', 'address_2', 'address_3'].forEach(function (key) {
                    var line = _showStreetFields[key];
                    if (!line) return;
                    var streetContainer = line.closest('.street');
                    if (streetContainer) { streetContainer.style.display = ''; }
                });
            } else {
                var _showEls = pcm2_getElements(contextCountryField);
                [_showEls.address_1, _showEls.postcode, _showEls.city].forEach(function (wrapper) {
                    if (!wrapper) return;
                    wrapper.style.display = '';
                    wrapper.querySelectorAll('input, select, textarea').forEach(function (inp) {
                        if (inp.getAttribute('data-pcm2-required') === '1') {
                            inp.setAttribute('required', '');
                            inp.removeAttribute('data-pcm2-required');
                        }
                        if (inp.hasAttribute('data-pcm2-validate')) {
                            inp.setAttribute('data-validate', inp.getAttribute('data-pcm2-validate'));
                            inp.removeAttribute('data-pcm2-validate');
                        }
                    });
                });
            }
        }
        if (pcm2_isSupportedCountry(contextCountryField.value)) {
            if (defaultForm) {
                if (validationFields.searchWrapper) validationFields.searchWrapper.style.display = 'none';
                if (validationFields.resultWrapper) validationFields.resultWrapper.style.display = 'none';
                if (validationFields.manualBtn) validationFields.manualBtn.style.display = 'none';
                if (validationFields.autoBtn) validationFields.autoBtn.style.display = 'inline-block';
            }
        } else {

            var pcm2ContainerEl = document.getElementById('pcm2_container' + pcm2_getSuffix(contextCountryField));
            if (pcm2ContainerEl) pcm2ContainerEl.remove();
        }
    }

    function pcm2_getFields(contextCountryField) {
        var formContext = contextCountryField ?
            (contextCountryField.closest('form') ||
                contextCountryField.closest('.checkout-shipping-address') ||
                contextCountryField.closest('.checkout-billing-address') ||
                contextCountryField.closest('.payment-method') ||
                contextCountryField.closest('[data-role="checkout-billing-address"]') ||
                contextCountryField.closest('.address-form') ||
                document)
            : document;

        function streetLine(index) {
            var indexed = formContext.querySelector('input[name="street[' + index + ']"]');
            if (indexed) { return indexed; }

            var unindexedAll = formContext.querySelectorAll('input[name="street[]"]');
            if (unindexedAll[index]) { return unindexedAll[index]; }

            var hasZeroBasedIds = !!formContext.querySelector('#street_0');
            var base = hasZeroBasedIds ? 0 : 1;

            return formContext.querySelector('#street_' + (index + base)) ||
                   formContext.querySelector('#street_' + (index + 1));
        }

        fields = {
            address_1: streetLine(0),
            address_2: streetLine(1),
            address_3: streetLine(2),
            postcode: formContext.querySelector('input[name="postcode"]'),
            city: formContext.querySelector('input[name="city"]'),

            region: formContext.querySelector('input[name="region"]') ||
                    formContext.querySelector('select[name="region_id"]') ||
                    formContext.querySelector('select[name="region"]') ||
                    formContext.querySelector('input[name="region_id"]'),
            country: contextCountryField || formContext.querySelector('select[name="country_id"]')
        };
        return fields;
    }

    function pcm2_getElements(contextCountryField) {
        var contextFields = pcm2_getFields(contextCountryField);
        elements = {
            address_1: contextFields.address_1 ? (
                contextFields.address_1.closest('fieldset.street') ||
                contextFields.address_1.closest('[class*="field-street"]') ||
                contextFields.address_1.closest('[class*="street"]') ||
                contextFields.address_1.closest('.field-wrapper') ||
                contextFields.address_1.closest('div.field') ||
                contextFields.address_1.closest('.field') ||
                contextFields.address_1.parentElement
            ) : null,
            address_2: contextFields.address_2 ? (
                contextFields.address_2.closest('fieldset.street') ||
                contextFields.address_2.closest('[class*="field-street"]') ||
                contextFields.address_2.closest('.field-wrapper') ||
                contextFields.address_2.closest('div.field') ||
                contextFields.address_2.parentElement
            ) : null,
            address_3: contextFields.address_3 ? (
                contextFields.address_3.closest('fieldset.street') ||
                contextFields.address_3.closest('[class*="field-street"]') ||
                contextFields.address_3.closest('.field-wrapper') ||
                contextFields.address_3.closest('div.field') ||
                contextFields.address_3.parentElement
            ) : null,
            postcode: contextFields.postcode ? (
                contextFields.postcode.closest('.field-postcode') ||
                contextFields.postcode.closest('[class*="field-postcode"]') ||
                contextFields.postcode.closest('.field-wrapper') ||
                contextFields.postcode.closest('div.field') ||
                contextFields.postcode.closest('.field') ||
                contextFields.postcode.parentElement
            ) : null,
            city: contextFields.city ? (
                contextFields.city.closest('.field-city') ||
                contextFields.city.closest('[class*="field-city"]') ||
                contextFields.city.closest('.field-wrapper') ||
                contextFields.city.closest('div.field') ||
                contextFields.city.closest('.field') ||
                contextFields.city.parentElement
            ) : null,
            region: contextFields.region ? (
                contextFields.region.closest('.field-region') ||
                contextFields.region.closest('.field-region_id') ||
                contextFields.region.closest('[class*="field-region"]') ||
                contextFields.region.closest('.field-wrapper') ||
                contextFields.region.closest('div.field') ||
                contextFields.region.parentElement
            ) : null,
            country: contextFields.country ? (
                contextFields.country.closest('.field-country_id') ||
                contextFields.country.closest('div.field') ||
                contextFields.country.parentElement
            ) : null,
        };
        return elements;
    }

    function pcm2_getValidationFields(contextCountryField) {
        var formId = contextCountryField ? pcm2_getFormIdentifier(contextCountryField) : 'default';
        var suffix = formId !== 'default' ? '_' + formId.replace(/[^a-zA-Z0-9]/g, '') : '';
        var validationFields = {
            searchWrapper: document.getElementById('pcm2_autocomplete_search_wrapper' + suffix),
            resultWrapper: document.getElementById('pcm2_autocomplete_result_wrapper' + suffix),
            manualBtn: document.getElementById('pcm2_autocomplete_manualbtn' + suffix),
            autoBtn: document.getElementById('pcm2_autocomplete_autobtn' + suffix)
        };
        return validationFields;
    }

    function pcm2_getFormIdentifier(countryField) {
        var form = countryField.closest('form') || countryField.closest('.checkout-shipping-address') ||
            countryField.closest('.checkout-billing-address') || countryField.closest('.address-form') ||
            countryField.closest('.payment-method') || countryField.closest('[data-role="checkout-billing-address"]');
        var identifier = '';

        if (form) {
            if (
                form.classList && form.classList.contains('checkout-shipping-address') ||
                (countryField.name && countryField.name.includes('shipping'))
            ) {
                identifier = 'shipping-address-form';
            } else if (
                form.classList && form.classList.contains('checkout-billing-address') ||
                (countryField.name && countryField.name.includes('billing'))
            ) {
                identifier = 'billing-address-form';
            } else if (form.id) {
                identifier = form.id;
            }
        }
        if (!identifier) {
            var fieldName = countryField.name;
            if (fieldName && fieldName.includes('billing')) {
                identifier = 'billing-address-form';
            } else if (fieldName && fieldName.includes('shipping')) {
                identifier = 'shipping-address-form';
            }
        }
        if (!identifier) {
            identifier = 'address-form-' + Array.from(document.querySelectorAll('select[name="country_id"]')).indexOf(countryField);
        }
        return identifier;
    }

    function pcm2_findCountryFieldBySuffix(suffix) {
        if (!suffix) {
            return document.querySelector('select[name="country_id"]');
        }
        var countryFields = document.querySelectorAll('select[name="country_id"]');
        for (var i = 0; i < countryFields.length; i++) {
            var formId = pcm2_getFormIdentifier(countryFields[i]);
            var expectedSuffix = '_' + formId.replace(/[^a-zA-Z0-9]/g, '');
            if (expectedSuffix === suffix) {
                return countryFields[i];
            }
        }
        return countryFields[0] || null;
    }

    function pcm2_isSupportedCountry(countryCode) {
        var countries = pcm2_config.supported_countries || [];
        if (!countries.length) return false;
        if (countries.find(function(c) { return c.iso2 === countryCode; })) {
            return true;
        }
        return false;
    }

    function pcm2_isCheckoutContext(contextCountryField) {
        var formId = pcm2_getFormIdentifier(contextCountryField);
        return formId === 'shipping-address-form' || formId === 'billing-address-form';
    }

    function pcm2_convertIso2ToIso3(iso2) {
        var countries = pcm2_config.supported_countries || [];
        var found = countries.find(function(c) { return c.iso2 === iso2; });
        return found ? found.iso3 : iso2;
    }

    var formObserver;
    function pcm2_observeFormChanges() {
        if (formObserver) {
            formObserver.disconnect();
        }
        formObserver = new MutationObserver(function (mutations) {
            var shouldReinit = false;
            var newCountryFields = [];
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === 1) {
                            var countryFields = [];
                            if (node.matches && node.matches('select[name="country_id"]')) {
                                countryFields.push(node);
                            } else if (node.querySelector) {
                                var foundFields = node.querySelectorAll('select[name="country_id"]');
                                countryFields = Array.from(foundFields);
                            }
                            var isPaymentMethodForm = node.matches && (
                                node.matches('.payment-method') ||
                                node.matches('[id*="payment_form_"]') ||
                                node.matches('[data-role="checkout-billing-address"]') ||
                                node.matches('.checkout-billing-address')
                            );
                            if (isPaymentMethodForm && node.querySelector) {
                                var paymentCountryFields = node.querySelectorAll('select[name="country_id"]');
                                countryFields = countryFields.concat(Array.from(paymentCountryFields));
                            }
                            countryFields.forEach(function (countryField) {
                                var formId = pcm2_getFormIdentifier(countryField);
                                if (initializedForms.indexOf(formId) === -1) {
                                    newCountryFields.push(countryField);
                                    shouldReinit = true;
                                }
                            });
                        }
                    });
                }
            });
            if (shouldReinit) {
                clearTimeout(window.pcm2ReinitTimeout);
                window.pcm2ReinitTimeout = setTimeout(function () {
                    pcm2_initializeNewFields(newCountryFields);
                }, 100);
            }
        });
        formObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function pcm2_initializeNewFields(countryFields) {
        countryFields.forEach(function (countryField) {
            var formId = pcm2_getFormIdentifier(countryField);
            if (initializedForms.indexOf(formId) !== -1) return;
            var countryCode = countryField.value;
            if (countryField.pcm2ChangeHandler) {
                countryField.removeEventListener('change', countryField.pcm2ChangeHandler);
            }
            countryField.pcm2ChangeHandler = function (event) {
                var newCountryCode = event.target.value;

                if (pcm2_isSupportedCountry(newCountryCode)) {
                    pcm2_hideForm(event.target);
                } else {
                    pcm2_clearAllAddressFields(event.target);
                    pcm2_showForm(event.target, true);
                }
            };
            countryField.addEventListener('change', countryField.pcm2ChangeHandler);
            if (pcm2_isSupportedCountry(countryCode)) {
                pcm2_hideForm(countryField);
            } else {
                pcm2_showForm(countryField, true);
            }
            initializedForms.push(formId);
        });
    }

    function pcm2_checkForNewForms() {
        var newCountryFields = Array.from(document.querySelectorAll('select[name="country_id"]')).filter(function (field) {
            var formId = pcm2_getFormIdentifier(field);
            return initializedForms.indexOf(formId) === -1;
        });
        if (newCountryFields.length > 0) {
            pcm2_initializeNewFields(newCountryFields);
            return true;
        } else {
            return false;
        }
    }

    function pcm2_detectPageContext() {
        var context = { isCheckout: false };
        if (document.body.classList.contains('checkout-index-index') ||
            typeof window.checkoutConfig !== 'undefined' ||
            document.querySelector('.checkout-container') ||
            document.querySelector('[data-role="checkout"]')) {
            context.isCheckout = true;
        }
        return context;
    }

    return {
        init: function () {
            if (typeof pcm2_config !== 'undefined' && (pcm2_config.enabled == 1 || pcm2_config.enabled === '1')) {
                log('[CONFIG]', window.pcm2_config);
                placementHousenumberAdditions = pcm2_config.housenumber_addition_address2;
                var pageContext = pcm2_detectPageContext();
                pcm2_addLookup();

                function pcm2_restoreAfterRerender() {
                    var countryFields = document.querySelectorAll('select[name="country_id"]');
                    countryFields.forEach(function (countryField) {
                        var formId = pcm2_getFormIdentifier(countryField);
                        var suffix = formId !== 'default' ? '_' + formId.replace(/[^a-zA-Z0-9]/g, '') : '';

                        var pcm2Container = document.getElementById('pcm2_container' + suffix);
                        if (!pcm2Container && pcm2_isSupportedCountry(countryField.value)) {
                            var idx = initializedForms.indexOf(formId);
                            if (idx !== -1) initializedForms.splice(idx, 1);
                            delete autocompleteInstances[formId];
                            pcm2_hideForm(countryField);
                            pcm2_initLookup(countryField);
                            initializedForms.push(formId);
                            var restoredFields = pcm2_getFields(countryField);
                            if (restoredFields.address_1 && restoredFields.address_1.value) {
                                pcm2_updatePreview(false, countryField);
                            }
                        } else if (!pcm2Container && !pcm2_isSupportedCountry(countryField.value)) {
                            pcm2_showForm(countryField, true);
                        }
                    });
                }

                var _magewireRestoreTimer = null;
                document.addEventListener('magewire:update', function () {
                    document.querySelectorAll('.pcm2-hide-fields').forEach(function (container) {
                        container.querySelectorAll(
                            '.field-street input, .field-street select, .field-street textarea,' +
                            '.field-postcode input, .field-postcode select,' +
                            '.field-city input, .field-city select'
                        ).forEach(function (inp) {
                            if (inp.hasAttribute('required')) {
                                inp.setAttribute('data-pcm2-required', '1');
                                inp.removeAttribute('required');
                            }
                            if (inp.hasAttribute('data-validate')) {
                                inp.setAttribute('data-pcm2-validate', inp.getAttribute('data-validate'));
                                inp.removeAttribute('data-validate');
                            }
                        });
                    });
                    clearTimeout(_magewireRestoreTimer);
                    _magewireRestoreTimer = setTimeout(pcm2_restoreAfterRerender, 50);
                });
                ['magewire:load', 'postcodecheckout:hyva-checkout:ready'].forEach(function (evName) {
                    document.addEventListener(evName, function () {
                        clearTimeout(_magewireRestoreTimer);
                        _magewireRestoreTimer = setTimeout(pcm2_restoreAfterRerender, 50);
                    });
                });

                if (pageContext.isCheckout) {
                    pcm2_observeFormChanges();
                    document.addEventListener('click', function (event) {
                        if (event.target && (
                            event.target.matches('.button.action.continue') ||
                            event.target.matches('.action.action-edit-address') ||
                            event.target.matches('[data-role="opc-continue"]') ||
                            event.target.closest('.step-title')
                        )) {
                            setTimeout(function () {
                                pcm2_checkForNewForms();
                            }, 500);
                        }
                        if (event.target &&
                            event.target.type === 'radio' &&
                            event.target.name === 'payment[method]') {
                            setTimeout(function () {
                                pcm2_checkForNewForms();
                            }, 200);
                        }
                    });
                    document.addEventListener('change', function (event) {
                        if (event.target &&
                            event.target.type === 'radio' &&
                            event.target.name === 'payment[method]') {
                            setTimeout(function () {
                                pcm2_checkForNewForms();
                            }, 300);
                        }
                    });
                    var checkAttempts = 0;
                    var consecutiveEmptyChecks = 0;
                    var maxCheckAttempts = 30;
                    var maxConsecutiveEmpty = 1;
                    var formCheckInterval = setInterval(function () {
                        checkAttempts++;
                        var foundNewForms = pcm2_checkForNewForms();
                        if (foundNewForms) {
                            consecutiveEmptyChecks = 0;
                        } else {
                            consecutiveEmptyChecks++;
                        }
                        if (checkAttempts >= maxCheckAttempts ||
                            consecutiveEmptyChecks >= maxConsecutiveEmpty ||
                            (checkAttempts > 10 && consecutiveEmptyChecks >= 3)) {
                            clearInterval(formCheckInterval);
                        }
                    }, 2000);
                }
            }
        }
    };
}));
