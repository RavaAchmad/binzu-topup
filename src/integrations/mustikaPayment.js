// Adapter MustikaPayment: live HTTP request atau mock untuk development.
import axios from 'axios';
import crypto from 'node:crypto';
import { normalizeStatus } from '../utils/format.js';
import { addMinutes } from '../utils/id.js';

function firstValue(source, keys, fallback = undefined) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) return source[key];
  }
  return fallback;
}

function normalizeResponse(payload) {
  const root = payload?.data?.data || payload?.data?.transaction || payload?.data || payload?.transaction || payload || {};

  return {
    invoiceId: String(firstValue(root, ['invoice_id', 'invoiceId', 'id', 'transaction_id', 'reference'], '')),
    status: normalizeStatus(firstValue(root, ['status', 'payment_status'], 'PENDING')),
    amount: Number(firstValue(root, ['amount', 'total_amount', 'gross_amount'], 0)),
    paymentMethod: firstValue(root, ['payment_method', 'method', 'channel'], 'QRIS'),
    qrString: firstValue(root, ['qr_string', 'qris_string', 'qrContent'], ''),
    qrImageUrl: firstValue(root, ['qr_image_url', 'qr_url', 'qris_url', 'qrImage'], ''),
    instructions: firstValue(root, ['instructions', 'payment_instruction', 'note'], ''),
    expiredAt: firstValue(root, ['expired_at', 'expires_at', 'expiry_time'], ''),
    raw: payload
  };
}

export class MustikaPayment {
  constructor({ config, logger }) {
    this.config = config.payment;
    this.server = config.server;
    this.logger = logger;
    this.mockStatuses = new Map();
  }

  async createTransaction({ order, customer }) {
    if (this.config.mock) return this.createMockTransaction({ order });

    const url = new URL(this.config.createPath, this.config.baseUrl).toString();
    const body = {
      order_id: order.id,
      amount: order.amount,
      payment_method: order.paymentMethod || 'QRIS',
      callback_url: this.server.publicWebhookUrl,
      customer_name: customer?.name || customer?.jid || order.jid,
      customer_phone: customer?.phone || order.jid.replace(/\D/g, ''),
      description: order.description,
      expired_at: order.expiresAt
    };

    const response = await axios.post(url, body, {
      timeout: 20000,
      headers: this.headers()
    });

    const normalized = normalizeResponse(response.data);
    if (!normalized.invoiceId) {
      throw new Error('Response MustikaPayment tidak memiliki invoice_id');
    }
    return normalized;
  }

  async getTransactionStatus(invoiceId) {
    if (this.config.mock) {
      const mock = this.mockStatuses.get(invoiceId);
      if (mock) return mock;
      return { invoiceId, status: 'PENDING', raw: { mock: true } };
    }

    const path = this.config.statusPath.replace('{invoiceId}', encodeURIComponent(invoiceId));
    const url = new URL(path, this.config.baseUrl).toString();
    const response = await axios.get(url, {
      timeout: 15000,
      headers: this.headers()
    });

    return normalizeResponse(response.data);
  }

  verifyWebhook(rawBody, headers) {
    if (this.config.mock) return true;
    if (!this.config.webhookSecret) {
      this.logger.warn('MUSTIKA_WEBHOOK_SECRET kosong. Callback live ditolak demi keamanan.');
      return false;
    }

    const received = String(headers[this.config.signatureHeader] || '').replace(/^sha256=/, '');
    if (!received) return false;

    const expected = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(rawBody || '')
      .digest('hex');

    if (received.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  }

  normalizeWebhook(payload) {
    const normalized = normalizeResponse(payload);
    const root = payload?.data || payload || {};
    return {
      ...normalized,
      orderId: firstValue(root, ['order_id', 'orderId', 'merchant_order_id'], ''),
      paidAt: firstValue(root, ['paid_at', 'settlement_time', 'updated_at'], '')
    };
  }

  createMockTransaction({ order }) {
    const invoiceId = `MP-${order.id}`;
    const expiredAt = order.expiresAt || addMinutes(new Date(), this.config.invoiceTtlMinutes).toISOString();
    const result = {
      invoiceId,
      status: 'PENDING',
      amount: order.amount,
      paymentMethod: order.paymentMethod || 'QRIS',
      qrString: `MOCK-QRIS-${invoiceId}-${order.amount}`,
      qrImageUrl: '',
      instructions: `Mode mock. POST /mock/mustika/${invoiceId}/pay untuk simulasi pembayaran sukses.`,
      expiredAt,
      raw: { mock: true }
    };

    this.mockStatuses.set(invoiceId, result);

    if (this.config.mockAutoPaySeconds > 0) {
      setTimeout(() => {
        this.mockStatuses.set(invoiceId, {
          ...result,
          status: 'PAID',
          paidAt: new Date().toISOString()
        });
      }, this.config.mockAutoPaySeconds * 1000).unref?.();
    }

    return result;
  }

  setMockStatus(invoiceId, status) {
    const current = this.mockStatuses.get(invoiceId) || { invoiceId, raw: { mock: true } };
    const next = {
      ...current,
      status: normalizeStatus(status),
      paidAt: normalizeStatus(status) === 'PAID' ? new Date().toISOString() : current.paidAt
    };
    this.mockStatuses.set(invoiceId, next);
    return next;
  }

  headers() {
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${this.config.apiKey}`,
      'x-api-key': this.config.apiKey,
      'x-api-secret': this.config.apiSecret
    };
  }
}
