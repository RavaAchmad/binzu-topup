// Adapter Tripay payment gateway: channel fee, create transaction, status, callback.
import axios from 'axios';
import crypto from 'node:crypto';
import { normalizeStatus } from '../utils/format.js';

function pick(root, keys, fallback = '') {
  for (const key of keys) {
    if (root?.[key] !== undefined && root?.[key] !== null) return root[key];
  }
  return fallback;
}

function rootData(payload) {
  return payload?.data?.data || payload?.data || payload || {};
}

function normalizeTripay(payload) {
  const root = rootData(payload);
  const reference = String(pick(root, ['reference', 'ref', 'invoice_id', 'invoiceId'], ''));
  const expired = pick(root, ['expired_time', 'expired_at'], '');
  const expiredAt = /^\d+$/.test(String(expired))
    ? new Date(Number(expired) * 1000).toISOString()
    : expired;

  return {
    invoiceId: reference,
    reference,
    merchantRef: pick(root, ['merchant_ref', 'merchantRef'], ''),
    status: normalizeStatus(pick(root, ['status'], 'PENDING')),
    amount: Number(pick(root, ['amount', 'total_amount'], 0)),
    fee: Number(pick(root, ['total_fee', 'fee_customer', 'fee_merchant'], 0)),
    paymentMethod: pick(root, ['payment_method', 'method'], ''),
    payCode: pick(root, ['pay_code', 'payCode'], ''),
    qrString: pick(root, ['qr_string', 'qrContent'], ''),
    qrImageUrl: pick(root, ['qr_url', 'qr_image_url'], ''),
    checkoutUrl: pick(root, ['checkout_url', 'checkoutUrl'], ''),
    instructions: pick(root, ['instructions', 'payment_instruction'], ''),
    expiredAt,
    raw: payload
  };
}

function channelFee(channel, amount) {
  const flat = Number(channel.total_fee?.flat ?? channel.fee?.flat ?? channel.fee_flat ?? 0);
  const percent = Number(channel.total_fee?.percent ?? channel.fee?.percent ?? channel.fee_percent ?? 0);
  return Math.ceil(flat + (Number(amount) * percent / 100));
}

export class TripayPayment {
  constructor({ config, logger }) {
    this.config = config.payment;
    this.server = config.server;
    this.logger = logger;
    this.mockStatuses = new Map();
    this.channelCache = { expiresAt: 0, items: [] };
  }

  baseUrl() {
    return this.config.mode === 'production' ? this.config.productionBaseUrl : this.config.sandboxBaseUrl;
  }

  async listPaymentChannels() {
    if (this.config.mock) {
      return [
        { code: 'QRIS2', name: 'QRIS', group: 'QRIS', total_fee: { flat: 750, percent: 0.7 }, active: true },
        { code: 'QRISC', name: 'QRIS Custom', group: 'QRIS', total_fee: { flat: 1000, percent: 0.5 }, active: true },
        { code: 'BRIVA', name: 'BRI Virtual Account', group: 'Virtual Account', total_fee: { flat: 3500, percent: 0 }, active: true },
        { code: 'BNIVA', name: 'BNI Virtual Account', group: 'Virtual Account', total_fee: { flat: 4000, percent: 0 }, active: true }
      ];
    }

    if (this.channelCache.expiresAt > Date.now()) return this.channelCache.items;

    const url = new URL(this.config.channelPath, this.baseUrl()).toString();
    const response = await axios.get(url, {
      timeout: 15000,
      headers: this.headers()
    });
    const items = response.data?.data || [];
    this.channelCache = {
      expiresAt: Date.now() + this.config.feeCacheTtlMs,
      items
    };
    return items;
  }

  async chooseCheapestChannel(amount, allowedChannels = this.config.allowedChannels) {
    const channels = await this.listPaymentChannels();
    const allowed = new Set(allowedChannels || []);
    const active = channels.filter((channel) => {
      const code = channel.code || channel.payment_method;
      if (allowed.size && !allowed.has(code)) return false;
      return channel.active !== false;
    });

    const scored = active.map((channel) => {
      const code = channel.code || channel.payment_method;
      const fee = channelFee(channel, amount);
      return {
        code,
        name: channel.name || code,
        fee,
        totalAmount: Number(amount) + fee,
        raw: channel
      };
    }).sort((a, b) => a.fee - b.fee);

    return scored[0] || {
      code: this.config.fallbackChannel,
      name: this.config.fallbackChannel,
      fee: 0,
      totalAmount: Number(amount),
      raw: null
    };
  }

  async createTransaction({ order, customer }) {
    if (this.config.mock) return this.createMockTransaction({ order });

    const url = new URL(this.config.createPath, this.baseUrl()).toString();
    const expiredTime = Math.floor(new Date(order.expiresAt).getTime() / 1000);
    const amount = Number(order.amount);
    const body = {
      method: order.paymentMethod || this.config.fallbackChannel,
      merchant_ref: order.id,
      amount,
      customer_name: customer?.pushName || customer?.name || order.userJid || order.jid,
      customer_email: customer?.email || 'customer@example.com',
      customer_phone: customer?.phone || order.userJid?.replace(/\D/g, '') || order.jid.replace(/\D/g, ''),
      order_items: [
        {
          sku: order.variantId || order.type,
          name: order.description,
          price: amount,
          quantity: 1
        }
      ],
      callback_url: this.server.publicWebhookUrl,
      return_url: this.server.publicWebhookUrl,
      expired_time: expiredTime,
      signature: this.createSignature(order.id, amount)
    };

    const response = await axios.post(url, body, {
      timeout: 20000,
      headers: this.headers()
    });

    const normalized = normalizeTripay(response.data);
    if (!normalized.invoiceId) throw new Error('Response Tripay tidak memiliki reference');
    return normalized;
  }

  async getTransactionStatus(invoiceId) {
    if (this.config.mock) {
      return this.mockStatuses.get(invoiceId) || { invoiceId, reference: invoiceId, status: 'PENDING', raw: { mock: true } };
    }

    const url = new URL(this.config.detailPath, this.baseUrl());
    url.searchParams.set('reference', invoiceId);
    const response = await axios.get(url.toString(), {
      timeout: 15000,
      headers: this.headers()
    });

    return normalizeTripay(response.data);
  }

  verifyWebhook(rawBody, headers) {
    if (this.config.mock) return true;
    const received = String(headers[this.config.signatureHeader] || '').replace(/^sha256=/, '');
    if (!received) return false;
    const expected = crypto.createHmac('sha256', this.config.privateKey).update(rawBody || '').digest('hex');
    if (received.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  }

  normalizeWebhook(payload) {
    const normalized = normalizeTripay(payload);
    const root = rootData(payload);
    return {
      ...normalized,
      invoiceId: normalized.invoiceId || pick(root, ['reference'], ''),
      orderId: pick(root, ['merchant_ref', 'merchantRef'], ''),
      paidAt: pick(root, ['paid_at', 'updated_at'], '')
    };
  }

  createMockTransaction({ order }) {
    const invoiceId = `TRIPAY-${order.id}`;
    const result = {
      invoiceId,
      reference: invoiceId,
      merchantRef: order.id,
      status: 'PENDING',
      amount: order.amount,
      fee: order.paymentFee || 0,
      paymentMethod: order.paymentMethod || this.config.fallbackChannel,
      payCode: `PAY-${invoiceId}`,
      qrString: `MOCK-TRIPAY-QRIS-${invoiceId}-${order.amount}`,
      qrImageUrl: '',
      checkoutUrl: `https://tripay.co.id/checkout/${invoiceId}`,
      instructions: `Mode mock Tripay. POST /mock/tripay/${invoiceId}/pay untuk simulasi pembayaran sukses.`,
      expiredAt: order.expiresAt,
      raw: { mock: true }
    };
    this.mockStatuses.set(invoiceId, result);

    if (this.config.mockAutoPaySeconds > 0) {
      setTimeout(() => {
        this.mockStatuses.set(invoiceId, { ...result, status: 'PAID', paidAt: new Date().toISOString() });
      }, this.config.mockAutoPaySeconds * 1000).unref?.();
    }

    return result;
  }

  setMockStatus(invoiceId, status) {
    const current = this.mockStatuses.get(invoiceId) || { invoiceId, reference: invoiceId, raw: { mock: true } };
    const next = {
      ...current,
      status: normalizeStatus(status),
      paidAt: normalizeStatus(status) === 'PAID' ? new Date().toISOString() : current.paidAt
    };
    this.mockStatuses.set(invoiceId, next);
    return next;
  }

  createSignature(merchantRef, amount) {
    return crypto.createHmac('sha256', this.config.privateKey)
      .update(`${this.config.merchantCode}${merchantRef}${amount}`)
      .digest('hex');
  }

  headers() {
    return {
      authorization: `Bearer ${this.config.apiKey}`,
      'content-type': 'application/json'
    };
  }
}
