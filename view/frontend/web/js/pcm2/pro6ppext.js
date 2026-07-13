/**
 * Pro6ppExt provider entry-point for Luma (RequireJS).
 *
 * Declares the Pro6PP vendor library as an AMD dependency so
 * RequireJS guarantees window.Pro6PP.attach is available before
 * PCM2Core.init() is called by the loader.
 *
 * For Hyvä the vendor lib is loaded sequentially before core.js,
 * so this shim file is not used there.
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(
            [
                'Codebrainbv_PostcodeCheckout/js/vendor/pro6pp',
                'Codebrainbv_PostcodeCheckout/js/pcm2/core'
            ],
            factory
        );
    } else {
        /* Hyvä / plain: both libs already on window, just return core */
        factory(
            root.Pro6PP,
            root.PCM2Core
        );
    }
}(typeof window !== 'undefined' ? window : this, function (Pro6PP, PCM2Core) {
    'use strict';
    /*
     * vendor/pro6pp defines window.Pro6PP with attach() and InferJS.
     * pcm2/core.js reads window.Pro6PP.attach inside bindPro6ppExt().
     * Nothing else to do here — return the core API so the loader can call init().
     */
    return PCM2Core || window.PCM2Core;
}));
