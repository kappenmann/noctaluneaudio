# Noctalune Audio Landing Page

Lightweight static landing page for **Noctalune Audio** and **NoctaTape**, built with plain HTML, CSS, and JavaScript for easy hosting on standard IONOS webspace.

## Files

- `index.html` - page structure and content
- `styles.css` - layout, theme, and responsive styling
- `script.js` - small UX helpers for reveal animation and newsletter form handling

## Deploy On IONOS

1. Open your IONOS webspace or FTP access.
2. Upload `index.html`, `styles.css`, and `script.js` to the target web directory, usually the site root such as `/htdocs`.
3. If an existing `index.html` is already there and should stay live, back it up first and deploy these files to a subfolder or merge carefully.
4. Visit your domain to confirm the page loads correctly on desktop and mobile.

No build step is required.

## Launch Notes

- The hero **Buy Now** button links to `/shop`.
- The newsletter form posts to `/api/subscribe`.
- The default Brevo list ID is `4`; if `BREVO_LIST_ID` is set in the hosting environment, make sure it is also set to `4`.

## Notes

- The newsletter form requires `BREVO_API_KEY` in the hosting environment.
- The design is responsive and intended to work as a simple deploy-anywhere static page.

## Lemon Squeezy License Entitlements

The license API endpoints default missing `productId` values to `noctatape` for older plugin clients. Lemon Squeezy still validates every key through `/v1/licenses/validate`; the backend then checks whether the returned Lemon `product_id` or `variant_id` grants the requested product before validation or activation succeeds.

Required Vercel environment variables:

- `LEMON_SQUEEZY_API_KEY` - Lemon Squeezy API key.
- `LICENSE_SIGNING_PRIVATE_KEY` - RSA private key used to sign activation certificates.
- `LEMON_NOCTATAPE_PRODUCT_IDS` - comma-separated Lemon product IDs for standalone NoctaTape licenses.
- `LEMON_NOCTATAPE_VARIANT_IDS` - comma-separated Lemon variant IDs for standalone NoctaTape licenses.

Optional bundle environment variables:

- `LEMON_ALL_PLUGINS_BUNDLE_PRODUCT_IDS` - comma-separated Lemon product IDs for the all-plugins bundle. Defaults to the Everything Bundle product ID `1051836`.
- `LEMON_ALL_PLUGINS_BUNDLE_VARIANT_IDS` - comma-separated Lemon variant IDs for the all-plugins bundle. Defaults to the Everything Bundle variant ID `1649605`.
- `LEMON_ALL_PLUGINS_BUNDLE_GRANTS` - comma-separated product IDs granted by the bundle, defaults to `noctatape`.

Activation is idempotent per license key and `instanceName`: if Lemon Squeezy already
contains an instance with the same computer name, the backend reissues the signed
activation certificate instead of consuming another activation slot.

For more products or bundles without code changes, set JSON environment variables instead:

```json
LEMON_LICENSE_PRODUCTS_JSON={
  "noctatape": {
    "certificateProductName": "NoctaTape",
    "singleProductIds": ["12345"],
    "singleVariantIds": ["67890"]
  }
}
```

```json
LEMON_LICENSE_BUNDLES_JSON={
  "all_plugins": {
    "productIds": ["11111"],
    "variantIds": ["22222"],
    "grants": ["noctatape"]
  }
}
```
