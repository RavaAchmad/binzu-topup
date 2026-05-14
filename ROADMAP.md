# BinzuV3 Roadmap

## Stage 1 - Branding & Stabilization

- Keep repository identity centered on BinzuV3.
- Remove outdated upstream-facing README messaging.
- Keep Baileys rc10 compatibility notes visible.
- Stabilize plugin loading, interactive button fallbacks, broadcast behavior, and participant handling.
- Document architecture in `SYSTEM_MAP.md`.

## Stage 2 - Commerce Foundation

- Add first commerce command entry points: `order`, `topup`, `deposit`, `cekstatus`, `statusorder`.
- Introduce a small commerce service layer in `lib/commerce-service.js`.
- Prepare `global.db.data.commerce` for orders, deposits, customers, and settings.
- Define product categories for Game Top Up, Digital Services, and Premium Bot Access.
- Keep manual/payment-gateway state explicit so unpaid transactions are never marked successful.

## Stage 3 - Payment Gateway Integration

- Add a provider client for MustikaPayment or another selected gateway.
- Read credentials from environment/config only:
  - `MUSTIKAPAYMENT_API_KEY`
  - `MUSTIKAPAYMENT_MERCHANT_ID`
  - `MUSTIKAPAYMENT_CALLBACK_SECRET`
- Implement invoice creation.
- Implement callback verification.
- Add idempotent settlement handling.
- Credit user balance only after verified payment settlement.

## Stage 4 - Premium/Rental Automation

- Connect paid orders to premium user access, rental bot access, group access, and limit packages.
- Add expiry tracking and renewal reminders.
- Unify old `sewa` / `premium` behavior with the new commerce order lifecycle.
- Add owner approval and manual override commands.

## Stage 5 - Admin Dashboard / WhatsApp Reporting

- Add WhatsApp-first reporting commands for owners/admins.
- Show pending orders, paid orders, failed payments, deposits, and daily revenue summary.
- Add operational diagnostics for webhook status, plugin errors, and gateway callback health.
- Optionally expose a lightweight dashboard only after WhatsApp reporting is stable.
