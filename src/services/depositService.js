// Service deposit saldo: pilih nominal -> invoice -> saldo masuk saat PAID.
import { sendQuickButtons } from '../core/buttons.js';
import { formatRupiah, sanitizeText } from '../utils/format.js';
import { addMinutes, createId, nowIso } from '../utils/id.js';

export class DepositService {
  constructor({ store, paymentService, config }) {
    this.store = store;
    this.paymentService = paymentService;
    this.config = config;
  }

  async showDepositOptions(ctx) {
    const active = this.store.findActiveOrderByUser(ctx.userJid);
    if (active) {
      await ctx.sock.sendMessage(ctx.jid, {
        text: [
          'Masih ada transaksi aktif.',
          `Order: ${active.id}`,
          `Status: ${active.status}`
        ].join('\n')
      }, { quoted: ctx.raw });
      return;
    }

    await this.store.upsertUser(ctx.userJid, {
      flow: {
        type: 'deposit',
        step: 'amount',
        updatedAt: nowIso()
      }
    });

    await sendQuickButtons(ctx.sock, ctx.jid, {
      title: 'Deposit Saldo',
      text: [
        '*Deposit Saldo*',
        'Pilih nominal cepat atau ketik nominal manual.',
        '',
        'Minimal deposit: Rp10.000'
      ].join('\n'),
      footer: 'Saldo masuk otomatis setelah pembayaran PAID.',
      buttons: this.config.deposit.amounts.slice(0, 3).map((amount) => ({
        id: `deposit:amount:${amount}`,
        text: formatRupiah(amount).replace(',00', '')
      }))
    }, { quoted: ctx.raw });
  }

  async handleAmountInput(ctx, text) {
    const user = this.store.getUser(ctx.userJid);
    const flow = user?.flow;
    if (!flow || flow.type !== 'deposit' || flow.step !== 'amount') return false;

    const amount = Number(sanitizeText(text).replace(/\D/g, ''));
    await this.createDeposit(ctx, amount);
    return true;
  }

  async selectAmount(ctx, amount) {
    await this.createDeposit(ctx, Number(amount));
  }

  async createDeposit(ctx, amount) {
    if (!Number.isFinite(amount) || amount < 10000) {
      await ctx.sock.sendMessage(ctx.jid, { text: 'Nominal deposit minimal Rp10.000.' }, { quoted: ctx.raw });
      return;
    }

    const active = this.store.findActiveOrderByUser(ctx.userJid);
    if (active) {
      await ctx.sock.sendMessage(ctx.jid, {
        text: [
          'Masih ada transaksi aktif.',
          `Order: ${active.id}`,
          `Status: ${active.status}`
        ].join('\n')
      }, { quoted: ctx.raw });
      return;
    }

    const paymentChoice = await ctx.services.pricing.choosePayment(amount);
    const expiresAt = addMinutes(new Date(), this.config.payment.invoiceTtlMinutes).toISOString();
    const order = {
      id: createId('DEP'),
      type: 'DEPOSIT',
      jid: ctx.jid,
      userJid: ctx.userJid,
      senderJid: ctx.sender,
      productAmount: amount,
      paymentFee: paymentChoice.fee,
      amount: paymentChoice.totalAmount,
      paymentMethod: paymentChoice.channel,
      paymentChannelName: paymentChoice.channelName,
      description: `Deposit saldo ${formatRupiah(amount)}`,
      status: 'CREATED',
      expiresAt,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    const creation = await this.store.createOrderIfNoActive(order);
    if (!creation.created) {
      await ctx.sock.sendMessage(ctx.jid, {
        text: [
          'Masih ada transaksi aktif.',
          `Order: ${creation.active.id}`,
          `Status: ${creation.active.status}`
        ].join('\n')
      }, { quoted: ctx.raw });
      return;
    }

    await this.store.upsertUser(ctx.userJid, {
      flow: null,
      lastOrderAt: nowIso()
    });

    const payment = await this.paymentService.createInvoice(order, this.store.getUser(ctx.userJid));
    await this.paymentService.sendInvoiceMessage(ctx, this.store.getOrder(order.id), payment);
  }
}
