/**
 * PostcodeNlExt provider entry-point for Luma (RequireJS).
 *
 * Declares the vendor library as an AMD dependency so RequireJS
 * guarantees window.PostcodeNl.AutocompleteAddress is available
 * before PCM2Core.init() is called by the loader.
 *
 * For Hyvä the vendor lib is loaded sequentially before core.js,
 * so this shim file is not used there.
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(
            [
                'Codebrainbv_PostcodeCheckout/js/vendor/autocompleteaddress',
                'Codebrainbv_PostcodeCheckout/js/pcm2/core'
            ],
            factory
        );
    } else {
        /* Hyvä / plain: both libs already on window, just return core */
        factory(
            root.PostcodeNl && root.PostcodeNl.AutocompleteAddress,
            root.PCM2Core
        );
    }
}(typeof window !== 'undefined' ? window : this, function (AutocompleteAddress, PCM2Core) {
    'use strict';
    /*
     * vendor/autocompleteaddress defines window.PostcodeNl.AutocompleteAddress.
     * pcm2/core.js reads it via window.PostcodeNl inside bindPostcodeNlExt().
     * Nothing else to do here — return the core API so the loader can call init().
     */
    return PCM2Core || window.PCM2Core;
}));