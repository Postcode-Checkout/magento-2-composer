var config = {
  map: {
    '*': {
      autocompleteaddress: 'Codebrainbv_PostcodeCheckout/js/vendor/autocompleteaddress'
    }
  },
  shim: {
    'Codebrainbv_PostcodeCheckout/js/vendor/autocompleteaddress': {
      exports: 'PostcodeNl'
    }
  }
};
