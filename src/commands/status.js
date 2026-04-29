// Command /status: mengecek order aktif atau order tertentu.
export const statusCommand = {
  name: 'status',
  aliases: ['cek'],
  async execute(ctx) {
    const orderId = ctx.args[0];
    await ctx.services.status.showStatus(ctx, orderId);
  }
};
