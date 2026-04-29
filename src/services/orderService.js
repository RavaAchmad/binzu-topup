// Service order produk: produk -> target -> paket -> invoice.
import { sendSingleSelect } from '../core/buttons.js';
import { findProduct, findVariant, products } from '../data/products.js';
import { formatRupiah, sanitizeText } from '../utils/format.js';
import { addMinutes, createId, nowIso } from '../utils/id.js';

export class OrderService {
  constructor({ store, paymentService, config }) {
    this.store = store;
    this.paymentService = paymentService;
    this.config = config;
  }

  async showProducts(ctx) {
    const active = this.store.findActiveOrderByUser(ctx.userJid);
    if (active) return this.sendActiveOrderWarning(ctx, active);

    await sendSingleSelect(ctx.sock, ctx.jid, {
      text: [
        '*Top Up / Order*',
        'Pilih produk yang ingin dibeli.',
        '',
        'Invoice akan dibuat otomatis setelah target dan paket dipilih.'
      ].join('\n'),
      footer: 'Satu akun hanya bisa punya satu transaksi aktif.',
      title: 'Daftar Produk',
      sections: [
        {
          title: 'Produk',
          rows: products.map((product) => ({
            id: `order:product:${product.id}`,
            title: product.name,
            description: product.description
          }))
        }
      ],
      quickReplies: [
        { id: 'menu:status', text: 'Cek Status' }
      ]
    }, { quoted: ctx.raw });
  }

  async selectProduct(ctx, productId) {
    const active = this.store.findActiveOrderByUser(ctx.userJid);
    if (active) return this.sendActiveOrderWarning(ctx, active);

    const product = findProduct(productId);
    if (!product) {
      await ctx.sock.sendMessage(ctx.jid, { text: 'Produk tidak ditemukan. Silakan pilih ulang dari menu.' }, { quoted: ctx.raw });
      return;
    }

    await this.store.upsertUser(ctx.userJid, {
      flow: {
        type: 'order',
        step: 'target',
        productId,
        updatedAt: nowIso()
      }
    });

    await ctx.sock.sendMessage(ctx.jid, {
      text: [
        `*${product.name}*`,
        `Masukkan ${product.targetLabel}.`,
        'Contoh: 12345678 1234'
      ].join('\n')
    }, { quoted: ctx.raw });
  }

  async handleTargetInput(ctx, text) {
    const user = this.store.getUser(ctx.userJid);
    const flow = user?.flow;
    if (!flow || flow.type !== 'order' || flow.step !== 'target') return false;

    const product = findProduct(flow.productId);
    if (!product) {
      await this.store.upsertUser(ctx.userJid, { flow: null });
      await ctx.sock.sendMessage(ctx.jid, { text: 'Flow order tidak valid. Silakan mulai ulang.' }, { quoted: ctx.raw });
      return true;
    }

    const target = sanitizeText(text, 64);
    if (target.length < 4) {
      await ctx.sock.sendMessage(ctx.jid, { text: 'ID tujuan terlalu pendek. Coba kirim ulang dengan benar.' }, { quoted: ctx.raw });
      return true;
    }

    await this.store.upsertUser(ctx.userJid, {
      flow: {
        ...flow,
        step: 'package',
        target,
        updatedAt: nowIso()
      }
    });

    await sendSingleSelect(ctx.sock, ctx.jid, {
      text: [
        '*Pilih Paket*',
        `Produk: ${product.name}`,
        `Tujuan: ${target}`,
        '',
        'Pastikan ID tujuan sudah benar sebelum lanjut.'
      ].join('\n'),
      footer: product.name,
      title: 'Pilih Paket',
      sections: [
        {
          title: product.name,
          rows: product.variants.map((variant) => ({
            id: `order:package:${product.id}:${variant.id}`,
            title: variant.name,
            description: formatRupiah(variant.amount)
          }))
        }
      ],
      quickReplies: [
        { id: 'flow:cancel', text: 'Batal' }
      ]
    }, { quoted: ctx.raw });

    return true;
  }

  async selectPackage(ctx, productId, variantId) {
    const user = this.store.getUser(ctx.userJid);
    const flow = user?.flow;
    const product = findProduct(productId);
    const variant = findVariant(productId, variantId);

    if (!flow || flow.type !== 'order' || flow.step !== 'package' || flow.productId !== productId || !flow.target) {
      await ctx.sock.sendMessage(ctx.jid, { text: 'Sesi order tidak ditemukan. Silakan mulai dari menu order.' }, { quoted: ctx.raw });
      return;
    }

    if (!product || !variant) {
      await ctx.sock.sendMessage(ctx.jid, { text: 'Paket tidak valid. Silakan pilih ulang.' }, { quoted: ctx.raw });
      return;
    }

    const active = this.store.findActiveOrderByUser(ctx.userJid);
    if (active) return this.sendActiveOrderWarning(ctx, active);

    const lastOrderAt = user?.lastOrderAt ? new Date(user.lastOrderAt).getTime() : 0;
    const waitMs = this.config.order.cooldownMs - (Date.now() - lastOrderAt);
    if (waitMs > 0) {
      await ctx.sock.sendMessage(ctx.jid, { text: `Tunggu ${Math.ceil(waitMs / 1000)} detik sebelum membuat order baru.` }, { quoted: ctx.raw });
      return;
    }

    const fulfillmentChoice = ctx.services.pricing.chooseFulfillment(variant);
    const paymentChoice = await ctx.services.pricing.choosePayment(variant.amount);
    const expiresAt = addMinutes(new Date(), this.config.payment.invoiceTtlMinutes).toISOString();
    const order = {
      id: createId('ORD'),
      type: 'ORDER',
      jid: ctx.jid,
      userJid: ctx.userJid,
      senderJid: ctx.sender,
      productId,
      productName: product.name,
      variantId,
      variantName: variant.name,
      fulfillmentProvider: fulfillmentChoice.provider,
      providerSku: fulfillmentChoice.source?.sku || '',
      providerProductId: fulfillmentChoice.source?.productId || '',
      providerVariationId: fulfillmentChoice.source?.variationId || '',
      providerCost: fulfillmentChoice.providerCost,
      providerTax: fulfillmentChoice.providerTax,
      totalProviderCost: fulfillmentChoice.totalProviderCost,
      target: flow.target,
      productAmount: variant.amount,
      paymentFee: paymentChoice.fee,
      amount: paymentChoice.totalAmount,
      paymentMethod: paymentChoice.channel,
      paymentChannelName: paymentChoice.channelName,
      description: `${product.name} - ${variant.name}`,
      status: 'CREATED',
      expiresAt,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    const creation = await this.store.createOrderIfNoActive(order);
    if (!creation.created) return this.sendActiveOrderWarning(ctx, creation.active);

    await this.store.upsertUser(ctx.userJid, {
      flow: null,
      lastOrderAt: nowIso()
    });

    const payment = await this.paymentService.createInvoice(order, user);
    await this.paymentService.sendInvoiceMessage(ctx, this.store.getOrder(order.id), payment);
  }

  async sendActiveOrderWarning(ctx, order) {
    await ctx.sock.sendMessage(ctx.jid, {
      text: [
        '*Transaksi Aktif*',
        `Order: ${order.id}`,
        `Status: ${order.status}`,
        'Selesaikan atau tunggu expired sebelum membuat order baru.'
      ].join('\n')
    }, { quoted: ctx.raw });
  }
}
