
## Postcode Checkout module for Magento 2

Adds autocompletion or valudation for addresses to the checkout page.


## Postcode Checkout - account

Create an free account on the [Postcode Checkout dashboard](https://dashboard.postcode-checkout.nl), and create your POS. After testing you can choose to purchase a supportplan and reconfigure the POS to your desired data provider.


## Installation instructions

1. Install this module using Composer:

```bash
$ composer require codebrainbv/postcode_checkout
```

2. Upgrade, compile & clear cache:
```bash
$ php bin/magento setup:upgrade
$ php bin/magento setup:di:compile
$ php bin/magento cache:flush
```