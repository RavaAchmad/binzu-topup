// Command owner untuk mengatur Tripay/Digiflazz/Moogold pricing dari WhatsApp.
import { requireOwner } from '../utils/owner.js';

function commandBody(ctx) {
  const prefix = ctx.input.startsWith(ctx.config.bot.prefix) ? ctx.config.bot.prefix : '/';
  const withoutPrefix = ctx.input.startsWith(prefix) ? ctx.input.slice(prefix.length) : ctx.input;
  const [, ...rest] = withoutPrefix.split(/\s+/);
  return rest.join(' ').trim();
}

function parseValue(value) {
  const trimmed = String(value || '').trim();
  if (['true', 'false'].includes(trimmed.toLowerCase())) return trimmed.toLowerCase() === 'true';
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.includes(',')) return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
  return trimmed;
}

async function guardOwner(ctx) {
  if (requireOwner(ctx)) return true;
  await ctx.sock.sendMessage(ctx.jid, { text: 'Command ini khusus owner.' }, { quoted: ctx.raw });
  return false;
}

function help(ctx) {
  return [
    'Pricing Manager',
    '',
    `${ctx.config.bot.prefix}pricing`,
    `${ctx.config.bot.prefix}setpricing paymentStrategy|cheapest`,
    `${ctx.config.bot.prefix}setpricing paymentStrategy|manual`,
    `${ctx.config.bot.prefix}setpricing manualPaymentChannel|QRIS2`,
    `${ctx.config.bot.prefix}setpricing allowedPaymentChannels|QRIS2,QRISC,BRIVA`,
    `${ctx.config.bot.prefix}setpricing passPaymentFeeToCustomer|true`,
    `${ctx.config.bot.prefix}setpricing fulfillmentStrategy|cheapest`,
    `${ctx.config.bot.prefix}setpricing fulfillmentStrategy|manual`,
    `${ctx.config.bot.prefix}setpricing manualFulfillmentProvider|digiflazz`,
    `${ctx.config.bot.prefix}setpricing providerTax.digiflazz.flat|0`,
    `${ctx.config.bot.prefix}setpricing providerTax.digiflazz.percent|0`,
    `${ctx.config.bot.prefix}setpricing providerTax.moogold.flat|0`,
    `${ctx.config.bot.prefix}setpricing providerTax.moogold.percent|0`,
    `${ctx.config.bot.prefix}resetpricing`
  ].join('\n');
}

export const pricingCommand = {
  name: 'pricing',
  aliases: ['tax', 'fee'],
  async execute(ctx) {
    if (!(await guardOwner(ctx))) return;
    await ctx.sock.sendMessage(ctx.jid, {
      text: [
        'Pricing aktif:',
        ...ctx.services.pricing.describe(),
        '',
        help(ctx)
      ].join('\n')
    }, { quoted: ctx.raw });
  }
};

export const setPricingCommand = {
  name: 'setpricing',
  aliases: ['settax', 'setfee'],
  async execute(ctx) {
    if (!(await guardOwner(ctx))) return;
    const [key, ...valueParts] = commandBody(ctx).split('|').map((item) => item.trim());
    const value = valueParts.join('|').trim();
    const allowed = new Set([
      'paymentStrategy',
      'manualPaymentChannel',
      'allowedPaymentChannels',
      'passPaymentFeeToCustomer',
      'fulfillmentStrategy',
      'manualFulfillmentProvider',
      'providerTax.digiflazz.flat',
      'providerTax.digiflazz.percent',
      'providerTax.moogold.flat',
      'providerTax.moogold.percent'
    ]);

    if (!allowed.has(key) || value === '') {
      await ctx.sock.sendMessage(ctx.jid, { text: help(ctx) }, { quoted: ctx.raw });
      return;
    }

    await ctx.store.updateRuntimeConfig(`pricing.${key}`, parseValue(value));
    await ctx.sock.sendMessage(ctx.jid, {
      text: [
        'Pricing config diperbarui.',
        `${key} = ${value}`,
        '',
        ...ctx.services.pricing.describe()
      ].join('\n')
    }, { quoted: ctx.raw });
  }
};

export const resetPricingCommand = {
  name: 'resetpricing',
  aliases: ['resettax', 'resetfee'],
  async execute(ctx) {
    if (!(await guardOwner(ctx))) return;
    await ctx.store.resetRuntimeConfig();
    await ctx.sock.sendMessage(ctx.jid, { text: 'Runtime pricing dikembalikan ke settings.js.' }, { quoted: ctx.raw });
  }
};
