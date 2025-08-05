define('Codebrainbv_PostcodeCheckout/js/national/postcodecheckoutnational', [], function () {
    var debugEnabled = window.pcm2_config.debug_mode;

    function pc_prestaConsoleLogs(msg, data) {
        if (debugEnabled) {
            console.log('PCAV:', msg);
            if (data) console.dir(data);
        }
    }

});

