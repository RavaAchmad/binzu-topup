// Selector fee/tax termurah untuk Tripay dan provider fulfillment.
function deepMerge(base, override) {
  const result = structuredClone(base || {});
  for (const [key, value] of Object.entries(override || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = deepMerge(result[key] || {}, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function toBool(value) {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

export class PricingService {
  constructor({ store, config, paymentGateway, logger }) {
    this.store = store;
    this.config = config;
    this.paymentGateway = paymentGateway;
    this.logger = logger;
  }

  settings() {
    return deepMerge(this.config.pricing, this.store.getRuntimeConfig().pricing || {});
  }

  async choosePayment(amount) {
    const settings = this.settings();

    if (settings.paymentStrategy === 'manual') {
      const manualChannel = settings.manualPaymentChannel || this.config.payment.fallbackChannel;
      const channels = await this.paymentGateway.listPaymentChannels().catch(() => []);
      const channel = channels.find((item) => (item.code || item.payment_method) === manualChannel);
      const fee = channel ? Math.ceil(
        Number(channel.total_fee?.flat ?? channel.fee?.flat ?? channel.fee_flat ?? 0) +
        Number(amount) * Number(channel.total_fee?.percent ?? channel.fee?.percent ?? channel.fee_percent ?? 0) / 100
      ) : 0;
      const passFee = toBool(settings.passPaymentFeeToCustomer);
      return {
        channel: manualChannel,
        channelName: channel?.name || manualChannel,
        fee,
        baseAmount: Number(amount),
        totalAmount: passFee ? Number(amount) + fee : Number(amount),
        passFeeToCustomer: passFee
      };
    }

    const choice = await this.paymentGateway.chooseCheapestChannel(
      amount,
      settings.allowedPaymentChannels || this.config.payment.allowedChannels
    );
    const passFee = toBool(settings.passPaymentFeeToCustomer);
    return {
      channel: choice.code,
      channelName: choice.name,
      fee: choice.fee,
      baseAmount: Number(amount),
      totalAmount: passFee ? choice.totalAmount : Number(amount),
      passFeeToCustomer: passFee
    };
  }

  chooseFulfillment(variant) {
    const settings = this.settings();
    const sources = (variant.sources || []).filter((source) => {
      return this.config.providers[source.provider]?.enabled !== false;
    });

    if (!sources.length) {
      return {
        provider: 'mock',
        providerCost: Number(variant.amount || 0),
        providerTax: 0,
        totalProviderCost: Number(variant.amount || 0),
        source: null
      };
    }

    if (settings.fulfillmentStrategy === 'manual') {
      const manual = sources.find((source) => source.provider === settings.manualFulfillmentProvider);
      if (manual) return this.scoreSource(manual, settings);
    }

    return sources
      .map((source) => this.scoreSource(source, settings))
      .sort((a, b) => a.totalProviderCost - b.totalProviderCost)[0];
  }

  scoreSource(source, settings) {
    const taxConfig = {
      ...(settings.providerTax?.[source.provider] || {}),
      ...(source.tax || {})
    };
    const cost = Number(source.cost || 0);
    const tax = Math.ceil(Number(taxConfig.flat || 0) + cost * Number(taxConfig.percent || 0) / 100);

    return {
      provider: source.provider,
      providerCost: cost,
      providerTax: tax,
      totalProviderCost: cost + tax,
      source
    };
  }

  describe() {
    const settings = this.settings();
    return [
      `paymentStrategy=${settings.paymentStrategy}`,
      `manualPaymentChannel=${settings.manualPaymentChannel}`,
      `passPaymentFeeToCustomer=${settings.passPaymentFeeToCustomer}`,
      `fulfillmentStrategy=${settings.fulfillmentStrategy}`,
      `manualFulfillmentProvider=${settings.manualFulfillmentProvider}`,
      `tax.digiflazz=${settings.providerTax?.digiflazz?.flat || 0}+${settings.providerTax?.digiflazz?.percent || 0}%`,
      `tax.moogold=${settings.providerTax?.moogold?.flat || 0}+${settings.providerTax?.moogold?.percent || 0}%`
    ];
  }
}
