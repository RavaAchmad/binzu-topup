# BinzuV3

BinzuV3 is an all-in-one WhatsApp bot focused on commerce automation and community management, while still keeping entertainment, utility, AI, downloader, and RPG features as secondary engagement features.

The next chapter of BinzuV3 is clear: Commerce + Community WhatsApp Bot.

## Current Status

BinzuV3 is in a foundation release phase for commerce automation.

- The existing plugin system, group automation, owner tools, media tools, and RPG features are preserved.
- Commerce commands are being introduced gradually so the project does not become a risky rewrite.
- The first commerce foundation commands are available: `order`, `topup`, `deposit`, `cekstatus`, and `statusorder`.
- Payment gateway settlement is not active yet. The current flow does not fake payment success or invent transaction data.

## Product Direction

Primary identity:

- WhatsApp Commerce Automation
- Digital product order flow
- Deposit and balance flow
- Premium and rental bot monetization support
- Community/group automation
- Interactive menu-first UX

Secondary engagement features:

- RPG and text-RPG retention systems
- Downloader and media tools
- Sticker tools
- AI/search/utilities
- Games, fun commands, quotes, and information commands

## Features

### Commerce Automation

- Interactive `order` / `topup` entry point for product categories.
- Foundation categories for Game Top Up, Digital Services, and Premium Bot Access.
- `deposit` introduction flow prepared for payment gateway integration.
- `cekstatus` / `statusorder` foundation for future order and deposit tracking.
- Existing premium, rental, store list, QRIS reference, broadcast, and limit flows remain available.

### Community Management

- Group welcome/leave message handling.
- Participant update handling for add/remove/promote/demote events.
- Group admin commands for moderation and configuration.
- Anti-link, anti-spam, anti-viewonce, and other guard-style plugin hooks.
- Broadcast tools for owner-driven announcements.

### Engagement Features

- RPG, dungeon, missions, leaderboard, and text-RPG service modules.
- Game and quiz plugins backed by local JSON datasets.
- Downloader commands for social/media platforms.
- Sticker, image, audio, and conversion utilities.
- AI/search/internet/tool commands as supporting features.

### Owner & Admin Tools

- Owner-only commands for broadcast, session cleanup, premium/user management, and bot operations.
- Admin/group-only command flags through the existing plugin metadata style.
- Health endpoint and webhook tester for operational debugging.
- PM2 metric support for registered users.

## Recent Major Updates

- Baileys 7 / rc10 compatibility work around auth state, reconnect, bad-mac/session handling, and LID/PN mapping.
- Interactive button fallback improvements through `lib/buttons.js`, with native interactive fallback and text fallback.
- Broadcast handling improvements around owner broadcast flow and webhook promo sending.
- Participant handling cleanup for group joins, leaves, promote/demote detection, and safer JID resolution.
- Commerce foundation commands added without replacing the existing plugin architecture.

## Commerce Commands

```text
order / topup
deposit
cekstatus / statusorder
```

These commands are intentionally foundation-level. They create the entry points and structure for the next commerce milestone, but they do not claim that an unpaid order is complete.

## Tech Stack

- Runtime: Node.js 20+ with ESM.
- WhatsApp socket: `@whiskeysockets/baileys@7.0.0-rc10`.
- HTTP server: Express.
- Database default: LowDB JSON file (`database.json`).
- Database optional: MongoDB or remote cloud DB adapter through `--db`.
- Media tooling: FFmpeg, ImageMagick/GraphicsMagick, canvas/webp tooling.
- Monitoring: PM2 metrics and HTTP health endpoint.

## Quick Start

```bash
npm install
npm start
```

On first run, the bot asks for a WhatsApp number and prints a pairing code. Auth state is stored in `sessions/`.

## Configuration

Main configuration is in `config.js`.

Common fields:

```js
global.info = {
  nomorbot: '62895325866441',
  nomorown: '6281212035575',
  namebot: 'Binzu Bot',
  nameown: 'RV',
  channel: '120363406567158177@newsletter',
  namechannel: 'Binzu | WhatsApp Bots'
}
```

Supported environment variables already used by the project:

- `PORT`: Express server port, default `5000`.
- `BAILEYS_SYNC_FULL_HISTORY` / `WA_SYNC_FULL_HISTORY`: optional full history sync.
- `BOT_PORT` / `BOT_HOST`: used by `webhook-tester.js`.

Future payment integration placeholders are documented in `.env.example`:

- `MUSTIKAPAYMENT_API_KEY`
- `MUSTIKAPAYMENT_MERCHANT_ID`
- `MUSTIKAPAYMENT_CALLBACK_SECRET`

Do not commit real credentials.

## HTTP Endpoints

```text
GET  /health
POST /webhook/send-promo
```

Example promo payload:

```json
{
  "number": "6281234567890",
  "message": "Promo BinzuV3"
}
```

## Roadmap

See [ROADMAP.md](./ROADMAP.md).

Short version:

1. Branding and stabilization.
2. Commerce foundation.
3. Payment gateway integration.
4. Premium/rental automation.
5. Admin dashboard and reporting through WhatsApp.

## Technical Notes

- [CHANGELOG.md](./CHANGELOG.md) records the current foundation release.
- [SYSTEM_MAP.md](./SYSTEM_MAP.md) maps the current architecture and core flows.
- Commerce logic starts in `lib/commerce-service.js`.
- Commerce plugin entry points are in `plugins/commerce-order.js`, `plugins/commerce-deposit.js`, and `plugins/commerce-status.js`.

## Development Commands

```bash
npm start
npm test
node webhook-tester.js
node bot-monitor.js
```

## Runtime Data

- `sessions/`: WhatsApp multi-file auth credentials.
- `database.json`: default LowDB database.
- `bot-status.json`: status monitor output if enabled.
- `bot-health.log`: health monitor log if enabled.
- `tmp/`: temporary runtime/media artifacts.

## Compatibility

- Node.js 20+ is recommended.
- Baileys rc10 is a release candidate; behavior can change around auth state, LID mapping, and interactive messages.
- FFmpeg is required for video/audio/sticker features.
- ImageMagick or GraphicsMagick is required for some image/sticker features.
- MongoDB/cloud DB modes are opt-in through `--db`.

## Repository

- GitHub: https://github.com/RavaAchmad/binzu-topup
- Main entrypoint: `index.js`
- Bot bootstrap: `main.js`
- Message dispatcher: `handler.js`
