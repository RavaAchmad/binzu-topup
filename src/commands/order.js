// Command /order: menampilkan katalog dan memulai order.
export const orderCommand = {
  name: 'order',
  aliases: ['topup', 'beli'],
  async execute(ctx) {
    await ctx.services.order.showProducts(ctx);
  }
};
