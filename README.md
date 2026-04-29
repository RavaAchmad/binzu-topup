# Binzu Topup WhatsApp Bot

Bot WhatsApp event-driven untuk auto order, deposit saldo, invoice Tripay, fulfillment Digiflazz/Moogold, webhook/polling, dan auto processing.

## Stack

- Node.js 20+
- `@whiskeysockets/baileys@7.0.0-rc.9`
- `baileys_helper@^1.0.6` untuk interactive quick reply dan single select
- JSON storage ringan di `data/db.json`
- Express webhook server untuk callback Tripay

## Jalankan di server

```bash
npm install
npm start
```

Konfigurasi utama ada di `src/config/settings.js`. Edit nomor owner, LID owner, nama bot, payment gateway, deposit, socket hardening, dan default menu dari file tersebut. `.env` tetap bisa dipakai kalau server Anda butuh override tanpa mengubah source.

Login WhatsApp:

- QR akan tampil di terminal server.
- Atau isi `whatsapp.pairingPhone` di `src/config/settings.js`, lalu masukkan pairing code di WhatsApp.

## Flow utama

1. User kirim pesan atau `/menu`.
2. Bot kirim menu interactive button: Top Up / Order, Cek Status, Deposit Saldo.
3. User memilih produk, input ID tujuan, lalu memilih paket.
4. Bot membuat invoice Tripay dan menyimpan `order_id`, `invoice_id`, status `PENDING`.
5. Webhook atau polling mengubah status payment menjadi `PAID`/`EXPIRED`/`FAILED`.
6. Saat `PAID`, bot menjalankan auto order atau deposit saldo, lalu mengirim notifikasi hasil.

## Tripay + Digiflazz + Moogold

Konfigurasi utama ada di `src/config/settings.js`.

- `payment`: Tripay API key, private key, merchant code, channel, sandbox/production.
- `providers.digiflazz`: username, API key, endpoint transaksi.
- `providers.moogold`: partner ID, secret, endpoint order.
- `pricing`: strategi tax/fee dan provider termurah.

Mode live melakukan request HTTP nyata dengan mengubah `payment.mock` menjadi `false`:

```js
payment: {
  gateway: 'tripay',
  mock: false,
  mode: 'production'
}
```

Mode mock cocok untuk development:

```js
payment: {
  mock: true
}
```

Endpoint test mock:

```bash
POST http://localhost:3000/mock/tripay/{invoiceId}/pay
POST http://localhost:3000/mock/tripay/{invoiceId}/expire
```

Produk di `src/data/products.js` punya beberapa `sources`. Jika satu paket punya source Digiflazz dan Moogold, bot memilih provider dengan estimasi cost + tax paling murah saat `fulfillmentStrategy=cheapest`.

## Command owner untuk menu

Nomor owner diset di `src/config/settings.js`.

```text
.owner
.menulist
.setmenu title|BINZU TOPUP PRO
.setmenu subtitle|Top up otomatis 24 jam
.addmenu promo|Promo Hari Ini|Lihat promo terbaru|text:Promo belum tersedia|Info
.delmenu promo
.setquick Order|menu:order,Status|menu:status,Deposit|menu:deposit
.resetmenu
```

## Command owner untuk tax/fee

```text
.pricing
.setpricing paymentStrategy|cheapest
.setpricing paymentStrategy|manual
.setpricing manualPaymentChannel|QRIS2
.setpricing allowedPaymentChannels|QRIS2,QRISC,BRIVA
.setpricing passPaymentFeeToCustomer|true
.setpricing fulfillmentStrategy|cheapest
.setpricing fulfillmentStrategy|manual
.setpricing manualFulfillmentProvider|digiflazz
.setpricing providerTax.digiflazz.flat|0
.setpricing providerTax.digiflazz.percent|0
.setpricing providerTax.moogold.flat|0
.setpricing providerTax.moogold.percent|0
.resetpricing
```

Default-nya bot memilih channel Tripay dengan fee termurah dan provider fulfillment dengan cost + tax termurah.

Aksi menu yang tersedia:

```text
menu:order
menu:status
menu:deposit
menu:owner
command:order
command:deposit
text:isi pesan bebas
```

## Decorated menu dan CTA

Menu utama memakai composer di `src/core/buttons.js`.

- `menu.style = 'decorated'` mengirim media header lalu list interaktif.
- `menu.media.url` atau `menu.media.path` bisa diisi gambar/video/banner.
- `menu.cta.ownerUrl`, `ownerCall`, dan `copyCode` dipakai untuk tombol CTA.
- `menu.experimentalAlbum = false` secara default; bila diaktifkan, item `menu.media.album` dikirim sebagai rangkaian media aman, bukan raw proto album.

Invoice juga memakai CTA:

- Copy Invoice
- Copy QRIS jika tersedia
- Cek Status
- Hubungi Owner

## Hardening LID/JID/Bad MAC

Bot memisahkan `chatJid` untuk balasan dan `userJid` untuk identitas order/saldo. Alias PN/LID disimpan di JSON DB lewat event `lid-mapping.update` dan `contacts.update`.

Socket juga memakai:

- `makeCacheableSignalKeyStore`
- message retry cache
- `getMessage` dari recent message cache
- auto session recreation
- session lock file agar satu folder session tidak dipakai dua proses
- optional event sniff via `socket.enableEventSniff`

Jika muncul `bad mac`, biarkan retry Baileys berjalan dulu. Reset session hanya opsi terakhir.

## Webhook

Set webhook Tripay ke:

```text
POST https://domain-anda.com/webhooks/tripay
```

Tripay callback signature divalidasi memakai private key:

```js
privateKey: 'private_key_tripay',
signatureHeader: 'x-callback-signature'
```

## Struktur

```text
src/
  commands/        command /menu, /order, /status, /deposit
  config/          konfigurasi hardcoded dan override env opsional
  core/            koneksi Baileys, parser, router, interactive button
  data/            contoh katalog produk
  integrations/    adapter Tripay, Digiflazz, Moogold
  server/          webhook HTTP server
  services/        order, deposit, payment, fulfillment, notification
  storage/         JSON lightweight DB
  utils/           helper kecil
```

## Check lokal

```bash
npm run test:sim
npm run check
```
