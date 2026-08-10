(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(
            [
                'Codebrainbv_PostcodeCheckout/js/vendor/demointaddress',
                'Codebrainbv_PostcodeCheckout/js/pcm2/core'
            ],
            factory
        );
    } else {
        /* Hyvä / plain: both libs already on window, just return core */
        factory(
            ( root.DemoIntAddress),
            root.PCM2Core
        );
    }
}(typeof window !== 'undefined' ? window : this, function (DemoIntAddress, PCM2Core) {
    'use strict';
    return PCM2Core || window.PCM2Core;
}));