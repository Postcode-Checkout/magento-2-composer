<?php
namespace Codebrainbv\PostcodeCheckout\Helper;

use Magento\Framework\App\Helper\AbstractHelper;

class Country extends AbstractHelper
{
    public function getCountries(): array
    {
        $cacheDir = __DIR__ . '/cache/';
        if (!is_dir($cacheDir)) {
            mkdir($cacheDir, 0755, true);
        }
        $cacheFilePath = $cacheDir . 'countries.json';

        $fallback = [
            ['name' => 'The Netherlands', 'iso3' => 'NLD', 'iso2' => 'NL'],
            ['name' => 'Belgium', 'iso3' => 'BEL', 'iso2' => 'BE'],
            ['name' => 'Germany', 'iso3' => 'DEU', 'iso2' => 'DE'],
            ['name' => 'Luxembourg', 'iso3' => 'LUX', 'iso2' => 'LU'],
            ['name' => 'Austria', 'iso3' => 'AUT', 'iso2' => 'AT'],
            ['name' => 'Switzerland', 'iso3' => 'CHE', 'iso2' => 'CH'],
            ['name' => 'France', 'iso3' => 'FRA', 'iso2' => 'FR'],
            ['name' => 'United Kingdom', 'iso3' => 'GBR', 'iso2' => 'GB'],
            ['name' => 'Spain', 'iso3' => 'ESP', 'iso2' => 'ES'],
            ['name' => 'Denmark', 'iso3' => 'DNK', 'iso2' => 'DK'],
            ['name' => 'Norway', 'iso3' => 'NOR', 'iso2' => 'NO'],
            ['name' => 'Finland', 'iso3' => 'FIN', 'iso2' => 'FI'],
        ];

        if (is_readable($cacheFilePath)) {
            $data = json_decode(file_get_contents($cacheFilePath), true);
            if (!empty($data['expiry']) && time() < $data['expiry']) {
                return $data['countries'] ?? $fallback;
            }
        }

        $ch = curl_init('https://api.postcode.eu/international/v1/supported-countries');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        $resp = curl_exec($ch);

        if ($resp === false || curl_getinfo($ch, CURLINFO_HTTP_CODE) !== 200) {
            curl_close($ch);
            return $fallback;
        }

        $hdrSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $hdr     = substr($resp, 0, $hdrSize);
        $body    = substr($resp, $hdrSize);
        curl_close($ch);

        $countries = json_decode($body, true);
        preg_match('/^Cache-Control:.*max-age=(\d+)/mi', $hdr, $m);
        $expiry = isset($m[1]) ? time() + (int)$m[1] : time() + 86400;

        file_put_contents($cacheFilePath, json_encode([
            'countries' => $countries ?: $fallback,
            'expiry'    => $expiry,
        ]));

        return $countries ?: $fallback;
    }
}
