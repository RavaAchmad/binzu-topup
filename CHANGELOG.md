# Changelog

## 2026-05-14 - BinzuV3 Commerce Foundation Release

### Project repositioning

- Repositioned BinzuV3 as an all-in-one WhatsApp bot focused on commerce automation and community management.
- Clarified the primary identity around digital product order flow, deposit/balance flow, premium/rental monetization, community automation, and interactive menu-first UX.
- Kept entertainment, utility, AI, downloader, and RPG features as secondary engagement features.

### Documentation refresh

- Rebuilt `README.md` around the BinzuV3 identity instead of old upstream branding.
- Added feature groups for Commerce Automation, Community Management, Engagement Features, and Owner & Admin Tools.
- Added Current Status, Recent Major Updates, Commerce Commands, Roadmap, runtime data, and compatibility notes.
- Added `ROADMAP.md` with staged development direction.

### Commerce foundation

- Added `lib/commerce-service.js` as the first reusable commerce service layer.
- Added `plugins/commerce-order.js` for `order` / `topup`.
- Added `plugins/commerce-deposit.js` for `deposit`.
- Added `plugins/commerce-status.js` for `cekstatus` / `statusorder`.
- Prepared the `global.db.data.commerce` namespace for future orders, deposits, customers, and provider settings.
- Kept the flow honest: the new commands do not fake payment success and do not invent transaction data.
- Adjusted `plugins/main-sewa.js` so `sewa` / `premium` stay on the old premium rental flow while `order` is owned by the new commerce module.

### Payment-integration-ready design

- Documented future MustikaPayment environment names in `.env.example`.
- Added provider design notes in `lib/commerce-service.js`.
- Prepared order/deposit storage shape without implementing a live payment gateway.
- Future gateway logic should create invoices, verify callbacks, and only credit balance after verified settlement.

### Baileys rc10 compatibility work already present

- Baileys dependency uses `npm:@whiskeysockets/baileys@7.0.0-rc10`.
- Connection bootstrap is centralized in `lib/connection.js:createConnection`.
- Auth uses `useMultiFileAuthState(authFile)` with the default `sessions/` folder.
- Pairing code flow is handled by `lib/connection.js:handlePairing`.
- Reconnect behavior includes error classification for fatal logout, restart-required, session/bad-mac, transient network, and rate-limit cases.
- LID/PN compatibility is handled through `lib/simple.js` and `lib/jid-helper.js`.

### Interactive buttons and UX

- `lib/buttons.js` provides interactive message helpers with native Baileys fallback and final text fallback.
- New commerce commands use the shared interactive helper instead of custom button handling.
- Existing RPG follow-up and text-RPG flows continue to use the same interactive helper pattern.

### Compatibility notes

- Node.js 20+ remains the recommended runtime.
- FFmpeg is still required for audio/video/sticker flows.
- ImageMagick or GraphicsMagick is still required for some image conversion flows.
- Database default remains LowDB JSON (`database.json`); MongoDB/cloud DB remain optional through `--db`.
- Existing plugin architecture remains dynamic import from `plugins/*.js`.
