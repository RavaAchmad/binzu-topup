// Router fulfillment ke Digiflazz atau Moogold sesuai provider yang dipilih.
export class FulfillmentProviderService {
  constructor({ digiflazz, moogold }) {
    this.clients = {
      digiflazz,
      moogold
    };
  }

  async createOrder(order) {
    const provider = order.fulfillmentProvider || 'digiflazz';
    const client = this.clients[provider];
    if (!client) throw new Error(`Provider fulfillment tidak tersedia: ${provider}`);
    return client.createOrder(order);
  }
}
