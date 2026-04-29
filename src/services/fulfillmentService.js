// Pemenuhan setelah payment PAID: deposit saldo atau auto order.
import axios from 'axios';
import { formatRupiah } from '../utils/format.js';
import { nowIso } from '../utils/id.js';

export class FulfillmentService {
  constructor({ store, notificationService, providerService, config, logger }) {
    this.store = store;
    this.notificationService = notificationService;
    this.providerService = providerService;
    this.config = config;
    this.logger = logger;
  }

  async fulfill(orderId) {
    const order = this.store.getOrder(orderId);
    if (!order) return null;

    if (['PROCESSING', 'SUCCESS'].includes(order.status)) return order;

    if (order.type === 'DEPOSIT') return this.fulfillDeposit(order);
    return this.fulfillProductOrder(order);
  }

  async fulfillDeposit(order) {
    await this.store.updateOrder(order.id, {
      status: 'PROCESSING',
      paidAt: nowIso()
    });

    await this.store.write((data) => {
      const userJid = order.userJid || order.jid;
      const creditAmount = Number(order.productAmount || order.amount || 0);
      const user = data.users[userJid] || { jid: userJid, balance: 0, createdAt: nowIso() };
      user.balance = Number(user.balance || 0) + creditAmount;
      user.updatedAt = nowIso();
      data.users[userJid] = user;
      data.orders[order.id] = {
        ...data.orders[order.id],
        status: 'SUCCESS',
        fulfilledAt: nowIso()
      };
      return data.orders[order.id];
    });

    await this.notificationService.sendText(order.jid, [
      '✅ Pembayaran berhasil, deposit saldo sudah masuk.',
      `Order: ${order.id}`,
      `Nominal: ${formatRupiah(order.productAmount || order.amount)}`
    ].join('\n'));

    return this.store.getOrder(order.id);
  }

  async fulfillProductOrder(order) {
    await this.store.updateOrder(order.id, {
      status: 'PROCESSING',
      paidAt: nowIso()
    });

    await this.notificationService.sendText(order.jid, [
      '✅ Pembayaran berhasil, pesanan sedang diproses',
      `Order: ${order.id}`,
      `${order.productName} - ${order.variantName}`
    ].join('\n'));

    try {
      const providerResult = await this.runAutoOrder(order);
      const final = this.isProviderSuccess(providerResult.status);
      await this.store.updateOrder(order.id, {
        status: final ? 'SUCCESS' : 'PROCESSING',
        providerReference: providerResult.reference,
        providerStatus: providerResult.status,
        fulfilledAt: final ? nowIso() : undefined
      });

      if (!final) {
        await this.notificationService.sendText(order.jid, [
          'Pesanan sudah dikirim ke provider dan sedang diproses.',
          `Order: ${order.id}`,
          `Provider: ${providerResult.provider || order.fulfillmentProvider || 'provider'}`,
          `Ref: ${providerResult.reference || '-'}`
        ].join('\n'));
        return this.store.getOrder(order.id);
      }

      await this.notificationService.sendText(order.jid, [
        'Pesanan selesai.',
        `Order: ${order.id}`,
        `Produk: ${order.productName} - ${order.variantName}`,
        `Tujuan: ${order.target}`
      ].join('\n'));
    } catch (error) {
      this.logger.error('Auto order gagal', order.id, error.message);
      await this.store.updateOrder(order.id, {
        status: 'FAILED',
        failureReason: error.message
      });

      await this.notificationService.sendText(order.jid, [
        'Pembayaran berhasil, tetapi auto order gagal diproses.',
        `Order: ${order.id}`,
        'Admin perlu follow up manual.'
      ].join('\n'));
    }

    return this.store.getOrder(order.id);
  }

  isProviderSuccess(status) {
    const value = String(status || '').toUpperCase();
    return ['SUCCESS', 'SUKSES', 'COMPLETED', 'DONE', 'PAID'].includes(value);
  }

  async runAutoOrder(order) {
    if (this.providerService && order.fulfillmentProvider && order.fulfillmentProvider !== 'mock') {
      return this.providerService.createOrder(order);
    }

    if (this.config.autoOrder.mode !== 'live') {
      await new Promise((resolve) => setTimeout(resolve, this.config.autoOrder.simulatedDelayMs));
      return {
        reference: `SIM-${order.id}`
      };
    }

    const url = new URL(this.config.autoOrder.path, this.config.autoOrder.baseUrl).toString();
    const response = await axios.post(url, {
      order_id: order.id,
      product_id: order.productId,
      variant_id: order.variantId,
      target: order.target,
      amount: order.amount
    }, {
      timeout: 20000,
      headers: {
        authorization: `Bearer ${this.config.autoOrder.apiKey}`,
        'content-type': 'application/json'
      }
    });

    return {
      reference: response.data?.reference || response.data?.id || `LIVE-${order.id}`,
      raw: response.data
    };
  }
}
