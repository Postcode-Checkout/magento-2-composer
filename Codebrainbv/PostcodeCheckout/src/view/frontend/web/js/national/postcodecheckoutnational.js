define('Codebrainbv_PostcodeCheckout/js/national/postcodecheckoutnational', [], function () {
    'use strict';
    
    var debugEnabled = window.pcm2_config.debug_mode ? true : false;

    function pcm2ConsoleLogs(msg, data) {
        if (debugEnabled) {
            console.log('PCM2:', msg);
            if (data) console.dir(data);
        }
    }

    console.dir(window.pcm2_config);

});

