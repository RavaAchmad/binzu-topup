// Adapter Digiflazz untuk fulfillment produk digital.
import axios from 'axios';
import crypto from 'node:crypto';

export class DigiflazzClient {
  constructor({ config, logger }) {
    this.config = config.providers.digiflazz;
    this.logger = logger;
  }

  async createOrder(order) {
    if (this.config.mock) {
      return {
        provider: 'digiflazz',
        reference: `DF-${order.id}`,
        status: 'SUCCESS',
        raw: { mock: true }
      };
    }

    const url = new URL(this.config.transactionPath, this.config.baseUrl).toString();
    const refId = order.id;
    const body = {
      username: this.config.username,
      buyer_sku_code: order.providerSku,
      customer_no: order.target,
      ref_id: refId,
      sign: this.sign(refId),
      testing: this.config.testing,
      cb_url: this.config.callbackUrl || undefined,
      max_price: order.providerMaxPrice || undefined
    };

    const response = await axios.post(url, body, {
      timeout: 20000,
      headers: { 'content-type': 'application/json' }
    });
    const data = response.data?.data || response.data || {};

    return {
      provider: 'digiflazz',
      reference: data.ref_id || refId,
      status: data.status || 'PROCESSING',
      serialNumber: data.sn || '',
      raw: response.data
    };
  }

  sign(refId) {
    return crypto
      .createHash('md5')
      .update(`${this.config.username}${this.config.apiKey}${refId}`)
      .digest('hex');
  }
}
