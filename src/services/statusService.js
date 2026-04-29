// Service status order/payment untuk command dan tombol cek status.
import { formatDateTime, formatRupiah } from '../utils/format.js';

export class StatusService {
  constructor({ store }) {
    this.store = store;
  }

  async showStatus(ctx, orderId) {
    const order = orderId ? this.store.getOrder(orderId) : this.store.findActiveOrderByUser(ctx.userJid);

    if (!order || this.store.resolveJid(order.userJid || order.jid) !== this.store.resolveJid(ctx.userJid)) {
      await ctx.sock.sendMessage(ctx.jid, {
        text: [
          'Belum ada order aktif.',
          `Ketik ${ctx.config.bot.prefix}order untuk membuat order baru.`
        ].join('\n')
      }, { quoted: ctx.raw });
      return;
    }

    const payment = order.invoiceId ? this.store.getPayment(order.invoiceId) : null;
    await ctx.sock.sendMessage(ctx.jid, {
      text: [
        '*Status Order*',
        `Order: ${order.id}`,
        `Jenis: ${order.type}`,
        `Status: ${order.status}`,
        `Invoice: ${order.invoiceId || '-'}`,
        `Payment: ${payment?.status || '-'}`,
        `Total: ${formatRupiah(order.amount)}`,
        `Expired: ${formatDateTime(order.expiresAt)}`,
        '',
        order.status === 'PENDING_PAYMENT'
          ? 'Silakan selesaikan pembayaran sesuai instruksi invoice.'
          : 'Status akan diperbarui otomatis saat ada perubahan.'
      ].join('\n')
    }, { quoted: ctx.raw });
  }
}
