# Bundled assets

These assets are kept with IITC IRIS so packaging works without a local reference checkout.
`copy-assets.cjs` copies all ten required images and their license notices into the extension.
Missing required images fail the build rather than silently changing their appearance.

- `images/marker-{blue,green}{,-2x}.png` and `images/mission-*.png` were copied unchanged from
  `reference/ingress-intel-total-conversion/plugins/images/` (IITC-CE). Its ISC notice is in `licenses/IITC-CE.txt`.
- `images/marker-shadow.png` was copied unchanged from that checkout's `core/external/images/`, originating from Leaflet.
  The Leaflet BSD notice is in `licenses/Leaflet.txt`.

The vendored IITC checkout and its attribution file remain development references, not build inputs.
