var config = {
    map: {
        '*': {
            css: 'mage/requirejs/css'
        }
    },
    paths: {
        autocompleteaddress: 'Codebrainbv_PostcodeCheckout/js/vendor/autocompleteaddress'
    },
    shim: {
        autocompleteaddress: {
            exports: 'PostcodeNl'
        }
    }
};
