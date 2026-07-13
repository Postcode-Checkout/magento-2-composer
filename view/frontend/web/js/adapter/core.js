(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], function () {
            return factory(root);
        });
    } else {
        root.PCM2 = factory(root);
    }
}(typeof window !== 'undefined' ? window : this, function (window) {
    'use strict';

    var observerStarted = false;
    var observerTimer = null;
    var buttonsBound = false;
    var sectionCountryMap = {};

    function config() {
        return window.pcm2_config || {};
    }

    function translations() {
        return window.pcm2_translations || {};
    }

    function log() {
        if (String(config().debug_mode) === '1') {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('PCM2:');
            console.log.apply(console, args);
        }
    }

    var _adapterAutocompleteRand = null;

    function getAutocompleteRand() {
        if (!_adapterAutocompleteRand) {
            var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            _adapterAutocompleteRand = Array.from({length: 10}, function () {
                return chars[Math.floor(Math.random() * chars.length)];
            }).join('');
        }
        return _adapterAutocompleteRand;
    }

    function getAutocomplete(nativeType) {
        return String(config().autocomplete_off) === '1'
            ? getAutocompleteRand()
            : (nativeType || 'off');
    }

    function applyAutocompleteToSection(section) {
        if (String(config().autocomplete_off) !== '1') { return; }
        var rand = getAutocompleteRand();
        ['street0', 'street1', 'street2', 'postcode', 'city', 'region'].forEach(function (key) {
            var el = field(section, key);
            if (el) { el.setAttribute('autocomplete', rand); }
        });
    }

    function clearAddressFields(section) {
        if (String(config().empty_default_address_fields) !== '1') { return; }
        ['street0', 'street1', 'street2', 'postcode', 'city', 'region'].forEach(function (key) {
            var el = field(section, key);
            if (!el || el.value === '') { return; }
            setValue(el, '');
            if (!isHyva()) {
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }

    function isEnabled() {
        return String(config().enabled) === '1';
    }

    function provider() {
        return String(config().provider || config().configured_provider || '').toLowerCase();
    }

    function isPostcodeApiProvider() {
        return provider() === 'postcodeapi';
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function supportedCountry(countryCode) {
        if (!countryCode) { return true; }

        var countries = config().supported_countries || [];

        if (!countries.length) {
            return true;
        }

        return countries.some(function (country) {
            return country.iso2 === countryCode;
        });
    }

    function iso2ToIso3(iso2) {
        var countries = config().supported_countries || [];
        var found = countries.find(function (country) {
            return country.iso2 === iso2;
        });

        return found ? found.iso3 : iso2;
    }

    function registerSectionCountry(countryField) {
        if (countryField) {
            sectionCountryMap[sectionName(countryField)] = countryField;
        }
    }

    function sectionCountry(section) {
        var cached = sectionCountryMap[section];
        if (cached && document.body.contains(cached)) {
            return cached;
        }

        if (section === 'shipping' || section === 'billing') {
            var byid = byId(section + '-country_id');
            if (byid) { return byid; }
        }

        var generic = byId('country') || byId('country_id');
        if (generic) { return generic; }

        var all = document.querySelectorAll('select[name="country_id"]');
        for (var i = 0; i < all.length; i++) {
            if (sectionName(all[i]) === section) {
                return all[i];
            }
        }
        return all[0] || null;
    }

    function sectionName(countryField) {
        if (!countryField) {
            return 'account';
        }

        var id = countryField.id || '';
        if (id.indexOf('shipping') !== -1) { return 'shipping'; }
        if (id.indexOf('billing') !== -1) { return 'billing'; }

        if (countryField.closest) {
            if (countryField.closest(
                '.checkout-shipping-address, #shipping, #co-shipping-form,' +
                '[data-form="shipping-address"], [data-bind*="shippingAddress"]'
            )) {
                return 'shipping';
            }
            if (countryField.closest(
                '.checkout-billing-address, .payment-method, #co-payment-form,' +
                '[data-form="billing-address"], [data-bind*="billingAddress"]'
            )) {
                return 'billing';
            }
        }

        var nm = countryField.name || '';
        if (nm.indexOf('shipping') !== -1) { return 'shipping'; }
        if (nm.indexOf('billing') !== -1) { return 'billing'; }

        return 'account';
    }

    function sectionFormContext(section) {
        var countryField = sectionCountry(section);
        if (!countryField) { return document; }
        return countryField.closest('form') ||
            countryField.closest('.checkout-shipping-address') ||
            countryField.closest('.checkout-billing-address') ||
            countryField.closest('.address-form') ||
            countryField.closest('.payment-method') ||
            document;
    }

    function field(section, name) {
        var ctx = sectionFormContext(section);

        if (name === 'street0' || name === 'street1' || name === 'street2') {
            var streetIndex = name === 'street0' ? 0 : (name === 'street1' ? 1 : 2);

            // First prefer explicit indexed names (street[0], street[1], street[2]).
            var indexed = ctx.querySelector('input[name="street[' + streetIndex + ']"]');
            if (indexed) { return indexed; }

            // Then support street[] collections in account/address forms.
            var unindexed = ctx.querySelectorAll('input[name="street[]"]');
            if (unindexed[streetIndex]) { return unindexed[streetIndex]; }

            // Finally map legacy id-based fields; account usually starts at street_1.
            var hasZeroBasedIds = !!(ctx.querySelector('#street_0') || ctx.querySelector('#' + section + '-street_0'));
            var base = hasZeroBasedIds ? 0 : 1;
            var idCandidates = [
                section + '-street-' + streetIndex,
                section + '-street_' + (streetIndex + base),
                'street_' + (streetIndex + base),
                section + '-street_' + (streetIndex + 1),
                'street_' + (streetIndex + 1)
            ];

            for (var s = 0; s < idCandidates.length; s++) {
                var scoped = ctx.querySelector('#' + idCandidates[s]);
                if (scoped) { return scoped; }

                var global = byId(idCandidates[s]);
                if (global && (ctx === document || ctx.contains(global))) {
                    return global;
                }
            }

            return null;
        }

        var map = {
            postcode: [
                section + '-postcode',
                section + '-zip',
                'postcode',
                'zip'
            ],
            city: [
                section + '-city',
                'city'
            ],
            region: [
                section + '-region',
                section + '-region_id',
                'region',
                'region_id'
            ]
        };

        var ids = map[name] || [];

        for (var i = 0; i < ids.length; i++) {
            var element = byId(ids[i]);
            if (element && ctx !== document && !ctx.contains(element)) {
                element = null;
            }
            if (element) { return element; }
        }

        var nameMap = {
            street0: 'street[0]',
            street1: 'street[1]',
            street2: 'street[2]',
            postcode: 'postcode',
            city: 'city',
            region: 'region'
        };
        var attrName = nameMap[name];
        if (attrName) {
            var el = ctx.querySelector('input[name="' + attrName + '"], select[name="' + attrName + '"]');
            if (el) { return el; }
        }

        return null;
    }

    function fieldSet(countryField) {
        var section = sectionName(countryField);

        return {
            street0: field(section, 'street0'),
            street1: field(section, 'street1'),
            street2: field(section, 'street2'),
            postcode: field(section, 'postcode'),
            city: field(section, 'city'),
            region: field(section, 'region')
        };
    }

    function streetGroupWrapper(element) {
        if (!element) {
            return null;
        }

        var group = element.closest('.group-street');

        if (!group) {
            return null;
        }

        return group.closest('.field-wrapper') ||
            group.closest('[wire\\:key*="field-wrapper"]') ||
            group.closest('.field') ||
            group;
    }

    function fieldWrapper(element) {
        if (!element) {
            return null;
        }

        var streetGroup = streetGroupWrapper(element);

        if (streetGroup) {
            return streetGroup;
        }

        return element.closest('.field-wrapper') ||
            element.closest('[wire\\:key*="field-wrapper"]') ||
            element.closest('.field-postcode') ||
            element.closest('.field-city') ||
            element.closest('.field-region') ||
            element.closest('.field-region_id') ||
            element.closest('.field-country_id') ||
            element.closest('.form-field') ||
            element.closest('.field') ||
            element.parentElement;
    }

    function countryAnchor(countryField) {
        if (!countryField) {
            return null;
        }

        return countryField.closest('.field-wrapper.field-country_id') ||
            countryField.closest('[wire\\:key*="country_id"]') ||
            countryField.closest('.field-country_id') ||
            countryField.closest('.field.country') ||
            countryField.closest('.field-country') ||
            fieldWrapper(countryField);
    }

    function lookupAnchor(countryField) {
        var fields = fieldSet(countryField);

        return fieldWrapper(fields.region) || countryAnchor(countryField);
    }

    function placeLookupHolder(countryField, holder) {
        var anchor = lookupAnchor(countryField);

        if (anchor && anchor.parentNode) {
            if (holder.parentNode !== anchor.parentNode || holder.previousElementSibling !== anchor) {
                anchor.parentNode.insertBefore(holder, anchor.nextSibling);
            }

            return;
        }

        if (countryField && countryField.parentNode) {
            countryField.parentNode.insertBefore(holder, countryField.nextSibling);
        }
    }

    function hideWrapper(element) {
        var wrapper = fieldWrapper(element);

        if (wrapper) {
            wrapper.classList.add('hidden');
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
        }
    }

    function showWrapper(element) {
        var wrapper = fieldWrapper(element);

        if (wrapper) {
            wrapper.classList.remove('hidden');
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
        }
    }

    function setDefaultFieldsVisible(section, visible) {
        var ctx = sectionFormContext(section);

        if (ctx && ctx.querySelectorAll) {
            ctx.querySelectorAll('fieldset.street').forEach(function (streetFieldset) {
                streetFieldset.style.display = visible ? '' : 'none';
            });
        }

        ['street0', 'street1', 'street2'].forEach(function (key) {
            var streetLine = field(section, key);

            if (!streetLine) {
                return;
            }

            var streetContainer = isHyva() ? streetLine.closest('.street') : null;

            if (streetContainer) {
                if (visible) {
                    streetContainer.classList.remove('hidden');
                    streetContainer.classList.add('md:grid');
                } else {
                    streetContainer.classList.add('hidden');
                    streetContainer.classList.remove('md:grid');
                }
                return;
            }

            if (visible) {
                showWrapper(streetLine);
            } else {
                hideWrapper(streetLine);
            }
        });

        ['postcode', 'city'].forEach(function (key) {
            var element = field(section, key);

            if (visible) {
                showWrapper(element);
            } else {
                hideWrapper(element);
            }
        });
    }

    function isHyva() {
        return typeof window.Alpine !== 'undefined';
    }

    function buildLookupHtmlLuma(id) {
        var t = translations();
        var noAddition = t.no_addition || 'Geen toevoeging';

        return '<div class="postcodecheckout-lookup-fields lumaPostcode">' +
                    '<div class="field lumaPostcode pcm2-national" data-pcm2-national style="display:none;">' +
                        '<label class="label" for="' + id + '-national-postcode"><span>' + (t.postcode || 'Postcode') + '</span></label>' +
                        '<div class="control"><input class="input-text" id="' + id + '-national-postcode" type="text" autocomplete="' + getAutocomplete('postal-code') + '"></div>' +
                    '</div>' +

                    '<div class="field lumaPostcode pcm2-national" data-pcm2-national style="display:none;">' +
                        '<label class="label" for="' + id + '-national-housenumber"><span>' + (t.housenumber || 'Huisnummer') + '</span></label>' +
                        '<div class="control"><input class="input-text" id="' + id + '-national-housenumber" type="text" autocomplete="' + getAutocomplete('address-line2') + '"></div>' +
                    '</div>' +

                    '<div class="field pcm2-addition lumaPostcode" data-pcm2-addition style="display:none;">' +
                        '<label class="label" for="' + id + '-national-addition"><span>' + (t.addition || 'Toevoeging') + '</span></label>' +
                        '<div class="control"><select class="select" id="' + id + '-national-addition">' +
                        '<option value="">' + noAddition + '</option>' +
                        '</select></div>' +
                    '</div>' +

                    '<div class="field"><div id="' + id + '-result" class="pcm2-result"></div></div>' +

                    '<div class="field lumaPostcode">' +
                        '<div class="pcm2-autocomplete-btn-group">' +
                        '<button type="button" class="action secondary" id="' + id + '-manual">' + (t.manual || 'Handmatig invullen') + '</button>' +
                        '<button type="button" class="action secondary" id="' + id + '-auto" style="display:none;">' + (t.automatic || 'Automatisch zoeken') + '</button>' +
                        '</div>' +
                    '</div>' +

                '</div>';
    }

    function buildLookupHtmlHyva(id) {
        var t = translations();
        var noAddition = t.no_addition || 'Geen toevoeging';

        return '<div class="postcodecheckout-lookup-inner grid grid-cols-12 gap-x-3 gap-y-4" wire:ignore>' +

            '<div class="pcm2-field pcm2-national col-span-6" data-pcm2-national style="display:none;">' +
            '<label class="label" for="' + id + '-national-postcode"><span>' + (t.postcode || 'Postcode') + '</span></label>' +
            '<div class="control"><input class="input-text form-input w-full" id="' + id + '-national-postcode" type="text" autocomplete="' + getAutocomplete('postal-code') + '"></div>' +
            '</div>' +

            '<div class="pcm2-field pcm2-national col-span-6" data-pcm2-national style="display:none;">' +
            '<label class="label" for="' + id + '-national-housenumber"><span>' + (t.housenumber || 'Huisnummer') + '</span></label>' +
            '<div class="control"><input class="input-text form-input w-full" id="' + id + '-national-housenumber" type="text" autocomplete="' + getAutocomplete('address-line2') + '"></div>' +
            '</div>' +

            '<div class="pcm2-field col-span-12" data-pcm2-addition style="display:none;">' +
            '<label class="label" for="' + id + '-national-addition"><span>' + (t.addition || 'Toevoeging') + '</span></label>' +
            '<div class="control"><select class="form-select w-full" id="' + id + '-national-addition">' +
            '<option value="">' + noAddition + '</option>' +
            '</select></div>' +
            '</div>' +

            '<div class="pcm2-field col-span-12"><div id="' + id + '-result" class="pcm2-result"></div></div>' +

            '<div class="pcm2-field col-span-12"><div class="pcm2-autocomplete-btn-group">' +
            '<button type="button" class="action secondary btn btn-secondary" id="' + id + '-manual">' + (t.manual || 'Handmatig invullen') + '</button>' +
            '<button type="button" class="action secondary btn btn-secondary" id="' + id + '-auto" style="display:none;">' + (t.automatic || 'Automatisch zoeken') + '</button>' +
            '</div></div>' +

            '</div>';
    }

    function buildLookupHtml(id) {
        return isHyva() ? buildLookupHtmlHyva(id) : buildLookupHtmlLuma(id);
    }

    function ensureLookupFields(countryField) {
        var section = sectionName(countryField);
        var id = 'pcm2-' + section;
        var holder = byId(id + '-lookup');

        if (!holder) {
            holder = document.createElement('div');
            holder.id = id + '-lookup';
            holder.className = isHyva()
                ? 'pcm2-lookup postcodecheckout-lookup col-span-full w-full mt-4 mb-2'
                : 'pcm2-lookup postcodecheckout-lookup';
            holder.setAttribute('data-pcm2-section', section);
            if (isHyva()) {
                holder.setAttribute('wire:ignore', '');
            }
            holder.innerHTML = buildLookupHtml(id);
        }

        placeLookupHolder(countryField, holder);

        return {
            holder: holder,
            national: holder.querySelectorAll('[data-pcm2-national]'),
            postcode: byId(id + '-national-postcode'),
            house: byId(id + '-national-housenumber'),
            addition: byId(id + '-national-addition'),
            manual: byId(id + '-manual'),
            auto: byId(id + '-auto'),
            result: byId(id + '-result')
        };
    }

    function setValue(element, value) {
        if (!element) {
            return;
        }

        var newValue = value || '';

         if (element.value === newValue) {
            return;
        }

        element.value = newValue;

        if (element._x_model && typeof element._x_model.set === 'function') {
            element._x_model.set(element.value);
            return;
        }

        element.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function updateResult(section, error) {
        var resultBox = byId('pcm2-' + section + '-result');

        if (!resultBox) {
            return;
        }

        if (error) {
            resultBox.innerHTML = '<p class="message error">Adres kon niet worden gevonden. Controleer de invoer of vul handmatig in.</p>';
            return;
        }

        var street0 = field(section, 'street0');
        var street1 = field(section, 'street1');
        var street2 = field(section, 'street2');
        var postcode = field(section, 'postcode');
        var city = field(section, 'city');

        var streetLine = [
            street0 && street0.value,
            street1 && street1.value,
            street2 && street2.value
        ].filter(Boolean).join(' ');

        var cityLine = [
            postcode && postcode.value,
            city && city.value
        ].filter(Boolean).join(' ');

        resultBox.innerHTML =
            '<p>' + escapeHtml(streetLine) + '</p>' +
            '<p>' + escapeHtml(cityLine) + '</p>';
    }

    function updateAllPreviews() {
        detectCountries().forEach(function (countryField) {
            var section = sectionName(countryField);

            if (byId('pcm2-' + section + '-result')) {
                updateResult(section);
            }
        });
    }

    function fillAddress(section, result, manualAddition, useManualAdditionOverride) {
        result = result || {};

        var street = result.street || result.streetName || result.street_name || '';
        var houseNumber = result.housenumber || result.houseNumber || result.house_number || '';
        var apiAddition = result.addition || result.houseNumberAddition || result.house_number_addition || '';
        var addition = '';

        if (useManualAdditionOverride) {
            addition = String(manualAddition || '');
        } else {
            addition = String(apiAddition || '');
        }

        var placement = String(config().housenumber_addition_address2 || '0');

        if (placement === '0') {
            setValue(field(section, 'street0'), [street, houseNumber, addition].filter(Boolean).join(' '));
            setValue(field(section, 'street1'), '');
            setValue(field(section, 'street2'), '');
        } else if (placement === '1') {
            setValue(field(section, 'street0'), [street, houseNumber].filter(Boolean).join(' '));
            setValue(field(section, 'street1'), addition);
            setValue(field(section, 'street2'), '');
        } else if (placement === '2') {
            setValue(field(section, 'street0'), street);
            setValue(field(section, 'street1'), [houseNumber, addition].filter(Boolean).join(' '));
            setValue(field(section, 'street2'), '');
        } else {
            setValue(field(section, 'street0'), street);
            setValue(field(section, 'street1'), houseNumber);
            setValue(field(section, 'street2'), addition);
        }

        setValue(field(section, 'postcode'), result.postcode || result.postalCode || result.zipcode || '');
        setValue(field(section, 'city'), result.city || result.locality || '');
        setValue(field(section, 'region'), result.province || result.region || result.state || '');

        if (!isHyva()) {
            ['street0', 'street1', 'street2', 'postcode', 'city', 'region'].forEach(function (key) {
                var el = field(section, key);
                if (el && el.value !== '') {
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }

        updateResult(section);
    }

    function nationalLookupUrl(postcode, houseNumber) {
        var urls = config().api_urls || {};

        if (!urls.national) {
            return '';
        }

        return urls.national + '/' + encodeURIComponent(postcode) + '/' + encodeURIComponent(houseNumber);
    }

    function normalizeAdditionValue(addition) {
        if (addition === null || addition === undefined) {
            return '';
        }
        if (Array.isArray(addition)) {
            return '';
        }

        if (typeof addition === 'object') {
            addition = addition.addition || addition.value || addition.label || '';
        }

        return String(addition).trim();
    }

    function uniqueNonEmptyAdditions(additions, singleAddition) {
        var out = [];
        var sources = [];

        if (Array.isArray(additions)) {
            sources = sources.concat(additions);
        } else if (additions !== undefined && additions !== null) {
            sources.push(additions);
        }

        if (Array.isArray(singleAddition)) {
            sources = sources.concat(singleAddition);
        } else if (singleAddition !== undefined && singleAddition !== null) {
            sources.push(singleAddition);
        }

        sources.forEach(function (item) {
            var normalized = normalizeAdditionValue(item);
            if (normalized && out.indexOf(normalized) === -1) {
                out.push(normalized);
            }
        });

        return out;
    }

    function populateAdditionSelect(selectEl, additions, singleAddition) {
        var noAdditionLabel = translations().no_addition || 'Geen toevoeging';
        var options = uniqueNonEmptyAdditions(additions, singleAddition);

        selectEl.innerHTML = '<option value="">' + escapeHtml(noAdditionLabel) + '</option>';
        options.forEach(function (add) {
            var opt = document.createElement('option');
            opt.value = add;
            opt.textContent = add;
            selectEl.appendChild(opt);
        });

        if (options.length === 1) {
            selectEl.value = options[0];
        }

        var wrapper = selectEl.closest('[data-pcm2-addition]');
        if (wrapper) {
            wrapper.style.display = options.length > 0 ? '' : 'none';
        }
    }

    function bindNational(section, lookup) {
        if (!lookup.postcode || !lookup.house || lookup.postcode.getAttribute('data-pcm2-bound') === '1') {
            return;
        }

        lookup.postcode.setAttribute('data-pcm2-bound', '1');
        lookup.house.setAttribute('data-pcm2-bound', '1');

        var lastResult = null;

        function doLookup() {
            var postcode = lookup.postcode.value.trim();
            var house = lookup.house.value.trim();

            if (!postcode || !house) {
                return;
            }

            var url = nationalLookupUrl(postcode, house);

            if (!url) {
                log('No national proxy URL configured');
                return;
            }

            fetch(url, { credentials: 'same-origin' })
                .then(function (response) {
                    return response.json();
                })
                .then(function (response) {
                    if (!response || response.status === false || !response.result) {
                        updateResult(section, true);
                        return;
                    }

                    lastResult = response.result;

                    if (lookup.addition && lookup.addition.tagName === 'SELECT') {
                        populateAdditionSelect(
                            lookup.addition,
                            response.result.additions,
                            response.result.addition
                        );
                        fillAddress(section, response.result, lookup.addition.value, true);
                    } else {
                        var addition = lookup.addition ? lookup.addition.value.trim() : '';
                        fillAddress(section, response.result, addition, true);
                    }
                })
                .catch(function () {
                    updateResult(section, true);
                });
        }

        lookup.postcode.addEventListener('change', doLookup);
        lookup.postcode.addEventListener('blur', doLookup);
        lookup.house.addEventListener('change', doLookup);
        lookup.house.addEventListener('blur', doLookup);

        if (lookup.addition) {
            if (lookup.addition.tagName === 'SELECT') {
                lookup.addition.addEventListener('change', function () {
                    if (lastResult) {
                        fillAddress(section, lastResult, lookup.addition.value, true);
                    }
                });
            } else {
                lookup.addition.addEventListener('change', doLookup);
                lookup.addition.addEventListener('blur', doLookup);
            }
        }
    }

    function setLookupFieldsVisible(lookup, type) {
        lookup.national.forEach(function (element) {
            element.style.display = type === 'national' ? '' : 'none';
        });

        var additionWrapper = lookup.holder.querySelector('[data-pcm2-addition]');
        if (additionWrapper) {
            additionWrapper.style.display = 'none';
        }
    }

    function showMode(countryField) {
        var section = sectionName(countryField);
        var lookup = ensureLookupFields(countryField);
        var countryCode = countryField ? countryField.value : '';
        var supported = supportedCountry(countryCode);
        var shouldHide = String(config().hide_default_address_fields) === '1';

        if (!supported) {
            setLookupFieldsVisible(lookup, 'none');
            setDefaultFieldsVisible(section, true);
            applyAutocompleteToSection(section);
            if (lookup.manual) lookup.manual.style.display = 'none';
            if (lookup.auto) lookup.auto.style.display = 'none';
            updateResult(section);
            return;
        }

        setDefaultFieldsVisible(section, !shouldHide);
        applyAutocompleteToSection(section);
        if (lookup.manual) lookup.manual.style.display = '';
        if (lookup.auto) lookup.auto.style.display = 'none';

        setLookupFieldsVisible(lookup, 'national');
        bindNational(section, lookup);

        updateResult(section);
    }

    function bindCountry(countryField) {
        if (!countryField) {
            return;
        }

        var section = sectionName(countryField);
        var lookup = ensureLookupFields(countryField);

        showMode(countryField);

        if (countryField.getAttribute('data-pcm2-country-bound') !== '1') {
            countryField.setAttribute('data-pcm2-country-bound', '1');

            countryField.addEventListener('change', function () {
                if (!supportedCountry(countryField.value)) {
                    clearAddressFields(section);
                }
                showMode(countryField);
                updateResult(section);
            });
        }

        if (!buttonsBound) {
            buttonsBound = true;

            document.addEventListener('click', function (e) {
                var id = e.target && e.target.id || '';
                var btnSection = null;
                var isManual = false;
                var isAuto = false;

                if (id.indexOf('pcm2-') === 0 && id.slice(-7) === '-manual') {
                    btnSection = id.slice(5, -7);
                    isManual = true;
                } else if (id.indexOf('pcm2-') === 0 && id.slice(-5) === '-auto') {
                    btnSection = id.slice(5, -5);
                    isAuto = true;
                }

                if (!btnSection) { return; }

                var btnCountryField = sectionCountry(btnSection);
                var freshLookup = ensureLookupFields(btnCountryField);

                if (isManual) {
                    setLookupFieldsVisible(freshLookup, 'none');
                    setDefaultFieldsVisible(btnSection, true);
                    if (freshLookup.manual) freshLookup.manual.style.display = 'none';
                    if (freshLookup.auto) freshLookup.auto.style.display = '';
                    var resultBox = byId('pcm2-' + btnSection + '-result');
                    if (resultBox) resultBox.innerHTML = '';
                }

                if (isAuto) {
                    var _shouldHideAuto = String(config().hide_default_address_fields) === '1';
                    setDefaultFieldsVisible(btnSection, !_shouldHideAuto);
                    applyAutocompleteToSection(btnSection);
                    setLookupFieldsVisible(freshLookup, 'national');
                    bindNational(btnSection, freshLookup);
                    if (freshLookup.manual) freshLookup.manual.style.display = '';
                    if (freshLookup.auto) freshLookup.auto.style.display = 'none';
                    updateResult(btnSection);
                }
            });
        }
    }

    function detectCountries() {
        var countries = [];

        ['shipping', 'billing'].forEach(function (section) {
            var country = sectionCountry(section);

            if (country) {
                countries.push(country);
            }
        });

        ['country', 'country_id'].forEach(function (id) {
            var accountCountry = byId(id);

            if (accountCountry && countries.indexOf(accountCountry) === -1) {
                countries.push(accountCountry);
            }
        });

        document.querySelectorAll('select[name="country_id"]').forEach(function (el) {
            if (countries.indexOf(el) === -1) {
                countries.push(el);
            }
        });

        countries.forEach(registerSectionCountry);

        return countries;
    }

    function startObserver() {
        if (observerStarted || !window.MutationObserver || !document.body) {
            return;
        }

        observerStarted = true;

        var observer = new MutationObserver(function (mutations) {
            var hasNewCountry = false;
            for (var i = 0; i < mutations.length; i++) {
                var added = mutations[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var node = added[j];
                    if (node.nodeType !== 1) { continue; }
                    if ((node.matches && node.matches('select[name="country_id"]')) ||
                        (node.querySelectorAll && node.querySelectorAll('select[name="country_id"]').length > 0)) {
                        hasNewCountry = true;
                        break;
                    }
                }
                if (hasNewCountry) { break; }
            }

            if (hasNewCountry) {
                window.clearTimeout(observerTimer);

                observerTimer = window.setTimeout(function () {
                    api.init();
                }, 400);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    var _magewireListenerAdded = false;

    var api = {
        init: function () {
            if (!isEnabled()) {
                return;
            }

            if (!_magewireListenerAdded) {
                _magewireListenerAdded = true;
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
                });
            }

            detectCountries().forEach(bindCountry);
            updateAllPreviews();
            startObserver();
        },
        updatePreviews: updateAllPreviews
    };

    window.PCM2 = api;
    window.PCM2Core = api;

    return api;
}));
