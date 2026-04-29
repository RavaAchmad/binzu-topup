// Orkestrasi invoice, webhook, polling, dan transisi status payment.
import { formatDateTime, formatRupiah, normalizeStatus } from '../utils/format.js';
import { nowIso } from '../utils/id.js';
import { sendMediaHeader, sendSafeInteractive } from '../core/buttons.js';

export class PaymentService {
  constructor({ store, gateway, fulfillmentService, notificationService, config, logger }) {
    this.store = store;
    this.gateway = gateway;
    this.fulfillmentService = fulfillmentService;
    this.notificationService = notificationService;
    this.config = config;
    this.logger = logger;
    this.pollTimer = null;
  }

  async createInvoice(order, customer) {
    const invoice = await this.gateway.createTransaction({ order, customer });
    const expiredAt = invoice.expiredAt || order.expiresAt;

    await this.store.createPayment({
      invoiceId: invoice.invoiceId,
      orderId: order.id,
      jid: order.jid,
      userJid: order.userJid || order.jid,
      amount: invoice.amount || order.amount,
      method: invoice.paymentMethod || order.paymentMethod || 'QRIS',
      status: invoice.status || 'PENDING',
      qrString: invoice.qrString || '',
      qrImageUrl: invoice.qrImageUrl || '',
      instructions: invoice.instructions || '',
      expiredAt,
      raw: invoice.raw,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });

    await this.store.updateOrder(order.id, {
      invoiceId: invoice.invoiceId,
      status: 'PENDING_PAYMENT',
      expiresAt: expiredAt
    });

    return this.store.getPayment(invoice.invoiceId);
  }

  async sendInvoiceMessage(ctx, order, payment) {
    if (payment.qrImageUrl) {
      await sendMediaHeader(ctx.sock, ctx.jid, {
        enabled: true,
        type: 'image',
        url: payment.qrImageUrl,
        caption: `Invoice ${payment.invoiceId}`
      }, { quoted: ctx.raw });
    }

    const lines = [
      '*Invoice Pembayaran*',
      '',
      `Invoice: ${payment.invoiceId}`,
      `Order: ${order.id}`,
      `Jenis: ${order.type}`,
      `Nominal: ${formatRupiah(order.productAmount || order.amount)}`,
      `Fee payment: ${formatRupiah(order.paymentFee || 0)}`,
      `Total bayar: ${formatRupiah(payment.amount)}`,
      `Metode: ${payment.method}${order.paymentChannelName ? ` (${order.paymentChannelName})` : ''}`,
      `Expired: ${formatDateTime(payment.expiredAt)}`,
      ''
    ];

    if (payment.qrImageUrl) lines.push('QR image sudah dikirim di atas.');
    if (payment.qrString) lines.push(`QRIS: ${payment.qrString}`);
    if (payment.instructions) lines.push(payment.instructions);

    lines.push('', 'Bot akan update otomatis setelah pembayaran terdeteksi.');

    await sendSafeInteractive(ctx.sock, ctx.jid, {
      text: lines.join('\n'),
      footer: ctx.config.bot.footer,
      quickReplies: [
        { id: 'menu:status', text: 'Cek Status' },
        { id: 'menu:owner', text: 'Owner' }
      ],
      cta: [
        { type: 'copy', text: 'Copy Invoice', copyCode: payment.invoiceId },
        ...(payment.qrString ? [{ type: 'copy', text: 'Copy QRIS', copyCode: payment.qrString }] : []),
        ...(ctx.config.menu.cta?.ownerUrl ? [{ type: 'url', text: 'Chat Owner', url: ctx.config.menu.cta.ownerUrl }] : [])
      ]
    }, { quoted: ctx.raw });
  }

  async handleWebhook({ payload, rawBody, headers }) {
    if (!this.gateway.verifyWebhook(rawBody, headers)) {
      const error = new Error('Signature callback Tripay tidak valid');
      error.statusCode = 401;
      throw error;
    }

    const event = this.gateway.normalizeWebhook(payload);
    if (!event.invoiceId) {
      const error = new Error('Payload callback tidak memiliki invoice_id');
      error.statusCode = 400;
      throw error;
    }

    return this.applyPaymentStatus({
      invoiceId: event.invoiceId,
      status: event.status,
      paidAt: event.paidAt,
      raw: event.raw,
      source: 'webhook'
    });
  }

  async applyPaymentStatus({ invoiceId, status, paidAt, raw, source }) {
    const normalized = normalizeStatus(status);
    const payment = this.store.getPayment(invoiceId);
    if (!payment) {
      this.logger.warn('Payment tidak ditemukan untuk invoice', invoiceId);
      return { ignored: true, reason: 'payment_not_found' };
    }

    const order = this.store.getOrder(payment.orderId);
    if (!order) return { ignored: true, reason: 'order_not_found' };

    if (['PAID', 'EXPIRED', 'FAILED'].includes(payment.status)) {
      return { ignored: true, reason: 'already_final', status: payment.status };
    }

    if (normalized === 'PAID') {
      await this.store.updatePayment(invoiceId, {
        status: 'PAID',
        paidAt: paidAt || nowIso(),
        raw,
        source
      });
      await this.store.updateOrder(order.id, {
        status: 'PAID',
        paidAt: paidAt || nowIso()
      });
      await this.fulfillmentService.fulfill(order.id);
      return { ok: true, status: 'PAID' };
    }

    if (['EXPIRED', 'FAILED'].includes(normalized)) {
      await this.store.updatePayment(invoiceId, {
        status: normalized,
        raw,
        source
      });
      await this.store.updateOrder(order.id, {
        status: normalized,
        failureReason: normalized === 'EXPIRED' ? 'Invoice expired' : 'Payment failed'
      });
      await this.notificationService.sendText(order.jid, [
        'Pembayaran gagal / expired',
        `Order: ${order.id}`,
        `Invoice: ${invoiceId}`
      ].join('\n'));
      return { ok: true, status: normalized };
    }

    await this.store.updatePayment(invoiceId, {
      status: 'PENDING',
      raw,
      source
    });
    return { ok: true, status: 'PENDING' };
  }

  startPolling() {
    if (!this.config.payment.pollingEnabled || this.pollTimer) return;
    this.pollTimer = setInterval(() => {
      this.pollPendingPayments().catch((error) => {
        this.logger.warn('Polling payment gagal', error.message);
      });
    }, this.config.payment.pollIntervalMs);
    this.pollTimer.unref?.();
  }

  async pollPendingPayments() {
    const pending = this.store.listPendingPayments();
    const now = Date.now();

    for (const payment of pending) {
      if (payment.expiredAt && new Date(payment.expiredAt).getTime() <= now) {
        await this.applyPaymentStatus({
          invoiceId: payment.invoiceId,
          status: 'EXPIRED',
          raw: { localExpiry: true },
          source: 'local-expiry'
        });
        continue;
      }

      const remote = await this.gateway.getTransactionStatus(payment.invoiceId);
      await this.applyPaymentStatus({
        invoiceId: payment.invoiceId,
        status: remote.status,
        paidAt: remote.paidAt,
        raw: remote.raw,
        source: 'polling'
      });
    }
  }
}
