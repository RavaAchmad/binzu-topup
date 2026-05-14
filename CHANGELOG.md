# Changelog

## 2026-05-14 - Binzu-topup Commerce Foundation Release

### Project repositioning

- Repositioned Binzu-topup as a WhatsApp commerce bot focused on digital top up orders, deposits, payment-ready flows, premium rental, and community operations.
- Clarified the primary identity around digital product order flow, deposit/balance flow, premium/rental monetization, community automation, and interactive menu-first UX.
- Kept entertainment, utility, AI, downloader, and RPG features as secondary engagement features.
- Chosen product direction: commerce path first (`order` / `deposit` / `payment` / `status`) instead of RPG-first or general bot-first direction.
- Repository/package description now reflects commerce automation rather than legacy multi-feature bot positioning.

### Documentation refresh

- Rebuilt `README.md` around the Binzu-topup identity instead of old upstream/generic bot branding.
- Added feature groups for Commerce Automation, Community Management, Engagement Features, and Owner & Admin Tools.
- Added Current Status, Recent Major Updates, Commerce Commands, Roadmap, runtime data, and compatibility notes.
- Added `ROADMAP.md` with staged development direction.
- Added `SYSTEM_MAP.md` as an architecture navigation map for future implementation work.

### Commerce foundation

- Added `lib/commerce-service.js` as the first reusable commerce service layer.
- Added `lib/commerce-catalog.js` with maintainable sample catalog data for Game Top Up, Digital Services, and Premium Bot Access.
- Added `plugins/commerce-order.js` for `order` / `topup`.
- Added `plugins/commerce-deposit.js` for `deposit`.
- Added `plugins/commerce-status.js` for `cekstatus` / `statusorder`.
- Added `plugins/commerce-cancelorder.js` for `cancelorder` / `batalorder`.
- Prepared the `global.db.data.commerce` namespace for future orders, deposits, customers, and provider settings.
- Kept the flow honest: the new commands do not fake payment success and do not invent transaction data.
- Adjusted `plugins/main-sewa.js` so `sewa` / `premium` stay on the old premium rental flow while `order` is owned by the new commerce module.

### Commerce Core V2 - real order lifecycle

- Upgraded `order` / `topup` from introduction screens into a staged order flow.
- Added category browsing, product selection, package selection, target input capture, and final confirmation.
- Confirmed orders are persisted to `global.db.data.commerce.orders`.
- Added durable order fields: `id`, `userId`, `categoryId`, `productId`, `productName`, `variantId`, `variantName`, `target`, `price`, `status`, `createdAt`, and `updatedAt`.
- Added order statuses for `draft`, `pending_confirmation`, `pending_payment`, and `cancelled`.
- Saved confirmed orders use `pending_payment`; no order is marked paid by this release.
- Upgraded `cekstatus` / `statusorder` to show latest saved orders with product, target, price, status, and created date.
- Added order detail lookup through `statusorder latest` or `statusorder <orderId>`.
- Added owner-only cancellation rule by user ownership: users may cancel only their own cancellable orders.

### Payment-integration-ready design

- Documented future MustikaPayment environment names in `.env.example`.
- Added provider design notes in `lib/commerce-service.js`.
- Prepared order/deposit storage shape without implementing a live payment gateway.
- Future gateway logic should create invoices, verify callbacks, and only credit balance after verified settlement.
- Payment settlement remains inactive in Commerce Core V2. The next milestone is invoice creation and verified callback settlement.

### Baileys rc10 migration and compatibility

- Baileys dependency uses `npm:@whiskeysockets/baileys@7.0.0-rc10`.
- Connection bootstrap is centralized in `lib/connection.js:createConnection`.
- Auth uses `useMultiFileAuthState(authFile)` with the default `sessions/` folder.
- Pairing code flow is handled by `lib/connection.js:handlePairing`.
- Reconnect behavior includes error classification for fatal logout, restart-required, session/bad-mac, transient network, and rate-limit cases.
- LID/PN compatibility is handled through `lib/simple.js` and `lib/jid-helper.js`.
- Socket creation is wrapped through `lib/simple.js:makeWASocket` so local helpers, chat cache, media helpers, and send wrappers stay available after rc10 socket changes.
- `main.js:global.reloadHandler` rebinds Baileys event listeners after reconnect/reload and reapplies Bad MAC handling.
- `lib/connection.js` tracks connection state, health timers, zombie detection, stale pre-key cleanup, and backoff to reduce rc10 disconnect loops.
- Message serialization in `lib/simple.js:smsg` normalizes private/group sender resolution and LID-to-PN mapping before the plugin router sees a message.
- Compatibility risk: rc10 is still a release candidate, so auth state, LID behavior, native flow payloads, and message schemas can still change upstream.

### Interactive buttons and UX

- `lib/buttons.js` provides interactive message helpers with native Baileys fallback and final text fallback.
- New commerce commands use the shared interactive helper instead of custom button handling.
- Existing RPG follow-up and text-RPG flows continue to use the same interactive helper pattern.
- `interactiveMsg` first tries `baileys_helpers` when available, then falls back to native Baileys `interactiveMessage`, then falls back to plain text.
- Quick reply, URL, copy, and single-select list buttons are normalized into nativeFlow-compatible payloads.
- `plugins/_templateResponse.js` converts `buttonsResponseMessage`, `templateButtonReplyMessage`, `listResponseMessage`, and `interactiveResponseMessage` into command text.
- Button/list ids should be valid typed commands, for example `.order game`, so router behavior remains identical between typed text and tapped UI.
- Compatibility risk: if WhatsApp changes nativeFlow parameters, `_templateResponse.js` and `lib/buttons.js` are the two primary files to update.

### Compatibility notes

- Node.js 20+ remains the recommended runtime.
- FFmpeg is still required for audio/video/sticker flows.
- ImageMagick or GraphicsMagick is still required for some image conversion flows.
- Database default remains LowDB JSON (`database.json`); MongoDB/cloud DB remain optional through `--db`.
- Existing plugin architecture remains dynamic import from `plugins/*.js`.
- Commerce storage currently uses `global.db.data.commerce`; no migration is required yet because invoice/order settlement is not live.
- Runtime auth remains in `sessions/`; stale pre-key cleanup is automatic only for repeated session errors, not for logged-out devices.
- Interactive commands should route through the plugin metadata model (`handler.command`, `handler.tags`, `handler.register`) to preserve existing access guards.
