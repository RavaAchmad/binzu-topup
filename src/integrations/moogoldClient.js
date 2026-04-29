// Adapter Moogold. Endpoint dan body sengaja configurable karena format merchant dapat berbeda.
import axios from 'axios';

export class MoogoldClient {
  constructor({ config, logger }) {
    this.config = config.providers.moogold;
    this.logger = logger;
  }

  async createOrder(order) {
    if (this.config.mock) {
      return {
        provider: 'moogold',
        reference: `MG-${order.id}`,
        status: 'SUCCESS',
        raw: { mock: true }
      };
    }

    const url = new URL(this.config.orderPath, this.config.baseUrl).toString();
    const body = {
      path: this.config.orderPath,
      data: {
        category: order.productId,
        product_id: order.providerProductId,
        variation_id: order.providerVariationId,
        user_id: order.target,
        order_id: order.id
      }
    };

    const response = await axios.post(url, body, {
      timeout: 20000,
      headers: {
        authorization: `Basic ${Buffer.from(`${this.config.partnerId}:${this.config.secret}`).toString('base64')}`,
        'content-type': 'application/json'
      }
    });
    const data = response.data?.data || response.data || {};

    return {
      provider: 'moogold',
      reference: data.order_id || data.reference || `MG-${order.id}`,
      status: data.status || 'PROCESSING',
      raw: response.data
    };
  }
}
