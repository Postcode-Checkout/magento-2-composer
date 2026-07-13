define(['Codebrainbv_PostcodeCheckout/js/adapter/core', 'jquery'], function (PCM2, $) {
    'use strict';
    function retryInit(attemptsLeft) {
        PCM2.init();
        if (attemptsLeft > 0 && !document.querySelector('.pcm2-lookup')) {
            window.setTimeout(function () { retryInit(attemptsLeft - 1); }, 500);
        }
    }

    return {
        init: function () {
            retryInit(20);
            $(document).on(
                'contentUpdated checkout:shipping:method-activate checkout:step:navigate processStop',
                function () { PCM2.init(); }
            );
        }
    };
});
