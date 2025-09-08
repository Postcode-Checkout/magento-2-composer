define('Codebrainbv_PostcodeCheckout/js/international/postcodecheckoutinternational', [
  'autocompleteaddress',
  'uiRegistry',
  'domReady!'
], function (PostcodeNl, registry) {
  'use strict';

  var cfg = window.pcm2_config || {};
  if (cfg.enabled !== true || cfg.configured_provider !== 'postcodenlext') return;

  if (!window.PostcodeNl || typeof PostcodeNl.AutocompleteAddress !== 'function') {
    console.error('[PCM2] PostcodeNl.AutocompleteAddress ontbreekt (check requirejs paths/shim & vendor bestand).');
    return;
  }

  var HIDE_FIELDS = String(cfg.hide_fields || 'true') === 'true';
  var SUPPORTED = (window.pcm2_countries || cfg.countries || []).map(function (c) {
    return typeof c === 'string' ? { iso2: c, iso3: c } : c;
  });
  function isSupported(iso2) { return !SUPPORTED.length || SUPPORTED.some(function (c) { return c.iso2 === iso2; }); }
  function iso3FromIso2(iso2) { var m = SUPPORTED.find(function (c) { return c.iso2 === iso2; }); return m ? m.iso3 : undefined; }

  var IDS = {
    searchWrap: 'pcm2_autocomplete_search_wrapper',
    resultWrap: 'pcm2_autocomplete_result_wrapper',
    search: 'pcm2_autocomplete_search',
    result: 'pcm2_autocomplete_result',
    manualBtn: 'pcm2_autocomplete_manualbtn',
    autoBtn: 'pcm2_autocomplete_autobtn'
  };

  function byName(root, name) { return root.querySelector('[name="' + name + '"]'); }
  function trigger(el, t) { if (el) el.dispatchEvent(new Event(t, { bubbles: true })); }

  function getDom(root) {
    return {
      street0: byName(root, 'street[0]'),
      street1: byName(root, 'street[1]'),
      street2: byName(root, 'street[2]'),
      postcode: byName(root, 'postcode'),
      city: byName(root, 'city'),
      country: byName(root, 'country_id'),
      region: byName(root, 'region'),
      regionId: byName(root, 'region_id')
    };
  }

  function ensureLookupUI(root) {
    if (root.querySelector('#' + IDS.searchWrap)) return;

    var dom = getDom(root);
    var anchor = (dom.street0 && dom.street0.closest('.field')) || root;

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

    var container = document.createElement('div');
    container.innerHTML = html;
    anchor.parentNode.insertBefore(container, anchor);
  }

  function hideOrDisable(root) {
    var d = getDom(root);
    [d.street0, d.street1, d.street2, d.postcode, d.city, d.region, d.regionId].forEach(function (el) {
      if (!el) return;
      if (HIDE_FIELDS) {
        var wrap = el.closest('.field'); if (wrap) wrap.style.display = 'none';
        var fs = el.closest('fieldset.street'); if (fs) fs.style.display = 'none';
      } else {
        el.value = '';
        el.setAttribute('readonly', 'readonly');
      }
    });

    var sw = root.querySelector('#' + IDS.searchWrap);
    var rw = root.querySelector('#' + IDS.resultWrap);
    if (sw) sw.style.display = '';
    if (rw) rw.style.display = '';

    var manual = root.querySelector('#' + IDS.manualBtn);
    var auto = root.querySelector('#' + IDS.autoBtn);
    if (manual) manual.style.display = '';
    if (auto) auto.style.display = 'none';

    var search = root.querySelector('#' + IDS.search);
    if (search) search.required = true;
  }

  function restore(root, hard) {
    var d = getDom(root);
    [d.street0, d.street1, d.street2, d.postcode, d.city, d.region, d.regionId].forEach(function (el) {
      if (!el) return;
      if (HIDE_FIELDS) {
        var wrap = el.closest('.field'); if (wrap) wrap.style.display = '';
        var fs = el.closest('fieldset.street'); if (fs) fs.style.display = '';
      } else {
        el.removeAttribute('readonly');
      }
    });

    var manual = root.querySelector('#' + IDS.manualBtn);
    var auto = root.querySelector('#' + IDS.autoBtn);
    if (manual) manual.style.display = 'none';
    if (auto) auto.style.display = '';

    var sw = root.querySelector('#' + IDS.searchWrap);
    var rw = root.querySelector('#' + IDS.resultWrap);

    if (hard) {
      [sw, rw, manual, auto].forEach(function (el) { if (el && el.parentNode) el.parentNode.removeChild(el); });
    } else {
      if (sw) sw.style.display = 'none';
      if (rw) rw.style.display = 'none';
      var search = root.querySelector('#' + IDS.search);
      if (search) search.required = false;
    }
  }

  function fill(root, addr) {
    var d = getDom(root);
    var street = addr.street || addr.streetName || '';
    var nr = addr.houseNumber || (addr.houseNumberParts && addr.houseNumberParts.houseNumber) || '';
    var add = addr.houseNumberAddition || (addr.houseNumberParts && addr.houseNumberParts.addition) || '';
    var pc = addr.postcode || addr.postalCode || addr.zipcode || '';
    var city = addr.city || addr.town || addr.locality || '';

    if (d.street0) { d.street0.value = street; trigger(d.street0, 'keyup'); trigger(d.street0, 'change'); }
    if (d.street1) { d.street1.value = nr; trigger(d.street1, 'keyup'); trigger(d.street1, 'change'); }
    if (d.street2) { d.street2.value = add; trigger(d.street2, 'keyup'); trigger(d.street2, 'change'); }
    if (d.postcode) { d.postcode.value = pc; trigger(d.postcode, 'keyup'); trigger(d.postcode, 'change'); }
    if (d.city) { d.city.value = city; trigger(d.city, 'keyup'); trigger(d.city, 'change'); }

    var preview = root.querySelector('#' + IDS.result);
    if (preview) {
      var l1 = (d.street0 ? d.street0.value : '') + ' ' + (d.street1 ? d.street1.value : '') + ' ' + (d.street2 ? d.street2.value : '');
      var l2 = (d.postcode ? d.postcode.value : '') + ' ' + (d.city ? d.city.value : '');
      preview.innerHTML = (l1.trim() + '<br>' + l2.trim()).trim();
    }
  }

  function attach(root) {
    var input = root.querySelector('#' + IDS.search);
    if (!input) return;

    var d = getDom(root);
    var iso2 = (d.country && d.country.value) || '';
    if (!iso2 || !isSupported(iso2)) { restore(root, true); return; }

    var ac = new PostcodeNl.AutocompleteAddress(input, {
      autocompleteUrl: 'postcodecheckout/proxy/suggestions?type=autocomplete',
      addressDetailsUrl: 'postcodecheckout/proxy/details?type=address',
      autoFocus: true,
      autoSelect: true,
      context: iso3FromIso2(iso2)
    });

    input.addEventListener('autocomplete-select', function (ev) {
      if (!ev || !ev.detail || ev.detail.precision !== 'Address') return;
      ac.getDetails(ev.detail.context, function (res) {
        var a = res && (res.address || (res.matches && res.matches.address));
        if (!a) return;
        fill(root, {
          street: a.street,
          houseNumber: a.buildingNumber,
          houseNumberAddition: a.buildingNumberAddition,
          postcode: a.postcode,
          city: a.locality
        });
      });
    });

    if (typeof ac.on === 'function') {
      ac.on('addressSelected', function (a) { fill(root, a); });
    }

    var manual = root.querySelector('#' + IDS.manualBtn);
    var auto = root.querySelector('#' + IDS.autoBtn);
    if (manual && !manual._pcm2_bound) { manual._pcm2_bound = true; manual.addEventListener('click', function () { restore(root, false); }); }
    if (auto && !auto._pcm2_bound) { auto._pcm2_bound = true; auto.addEventListener('click', function () { hideOrDisable(root); }); }
  }

  // *** Geen polling: start zodra de Shipping UI component klaar is ***
  registry.async('checkout.steps.shipping-step.shippingAddress')(function () {
    var root =
      document.querySelector('form[data-role="shipping-address-form"]') ||
      document.querySelector('#shipping-new-address-form') ||
      document.querySelector('#co-shipping-form') ||
      document.querySelector('#checkout');

    if (!root) return;

    ensureLookupUI(root);
    hideOrDisable(root);
    attach(root);

    // land-wissel: enkel event, geen polling
    var country = getDom(root).country;
    if (country && !country._pcm2_bound) {
      country._pcm2_bound = true;
      country.addEventListener('change', function () {
        ensureLookupUI(root);
        hideOrDisable(root);
        attach(root);
      });
    }
  });

});
